const COMPANY_DOCUMENT_TYPES: Record<string, string> = {
  vergi_levhasi: 'Vergi Levhası',
  ticaret_sicil: 'Ticaret Sicil Gazetesi',
  imza_sirkuleri: 'İmza Sirküleri',
  faaliyet_belgesi: 'Faaliyet Belgesi',
  diger: 'Diğer',
}

type SupabaseLike = {
  from: (table: string) => any
}

export async function syncCompanyDocuments(
  supabase: SupabaseLike,
  sirketId: string,
  documents: Record<string, any>[],
) {
  const normalizedDocuments: Record<string, any>[] = []

  const legacyError = await replaceCompanyLegacyDocuments(supabase, sirketId, documents)
  if (legacyError) return { documents, error: legacyError }

  const linkCleanup = await supabase
    .from('document_links')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: null,
    })
    .eq('linked_module', 'companies')
    .eq('linked_record_id', sirketId)
    .eq('link_type', 'company_document')
    .eq('is_deleted', false)

  if (linkCleanup.error && !isMissingRegistryTableError(linkCleanup.error)) {
    return { documents, error: linkCleanup.error }
  }

  for (const document of documents) {
    const normalized = normalizeCompanyDocument(document)
    if (!normalized) continue

    let documentId = normalized.documentId
    if (!documentId && normalized.fileUrl) {
      const createResult = await createRegistryDocument(supabase, sirketId, normalized)
      if (createResult.error) {
        if (isMissingRegistryTableError(createResult.error)) {
          normalizedDocuments.push(document)
          continue
        }
        return { documents, error: createResult.error }
      }
      documentId = createResult.documentId
    } else if (documentId) {
      const updateResult = await supabase
        .from('documents')
        .update({ company_id: sirketId })
        .eq('id', documentId)
      if (updateResult.error && !isMissingRegistryTableError(updateResult.error)) {
        return { documents, error: updateResult.error }
      }

      if (normalized.fileUrl || normalized.thumbnailUrl) {
        const fileUpdate: Record<string, any> = {}
        if (normalized.fileUrl) fileUpdate.storage_path = normalized.fileUrl
        if (normalized.fileName) fileUpdate.file_name = normalized.fileName
        if (normalized.mimeType) fileUpdate.mime_type = normalized.mimeType
        if (normalized.fileSize) fileUpdate.file_size = normalized.fileSize
        if (normalized.thumbnailUrl) fileUpdate.thumbnail_url = normalized.thumbnailUrl

        const fileUpdateResult = await supabase
          .from('document_files')
          .update(fileUpdate)
          .eq('document_id', documentId)
          .eq('is_current_version', true)

        if (fileUpdateResult.error && !isMissingRegistryTableError(fileUpdateResult.error) && !fileUpdateResult.error.message?.includes('thumbnail_url')) {
          return { documents, error: fileUpdateResult.error }
        }
      }
    }

    let documentLinkId = normalized.documentLinkId
    if (documentId) {
      const linkResult = await supabase
        .from('document_links')
        .insert({
          document_id: documentId,
          linked_module: 'companies',
          linked_record_id: sirketId,
          link_type: 'company_document',
        })
        .select('id')
        .single()

      if (linkResult.error) {
        if (!isMissingRegistryTableError(linkResult.error)) return { documents, error: linkResult.error }
      } else {
        documentLinkId = linkResult.data?.id || documentLinkId
      }
    }

    normalizedDocuments.push({
      ...document,
      slotId: normalized.slotId,
      documentId: documentId || document.documentId,
      documentLinkId,
      documentType: normalized.documentType,
      title: document.title || normalized.slotTitle,
    })
  }

  return { documents: normalizedDocuments, error: null }
}

async function replaceCompanyLegacyDocuments(supabase: SupabaseLike, sirketId: string, documents: Record<string, any>[]) {
  const { error: deleteError } = await supabase
    .from('sirket_dokumanlar')
    .delete()
    .eq('sirket_id', sirketId)

  if (deleteError) return deleteError

  const rows = documents
    .map(document => {
      const normalized = normalizeCompanyDocument(document)
      if (!normalized?.fileName || !normalized.fileUrl) return null
      return {
        sirket_id: sirketId,
        dokuman_turu: normalized.legacyType,
        dosya_adi: normalized.fileName,
        dosya_url: normalized.fileUrl,
      }
    })
    .filter(Boolean)

  if (rows.length === 0) return null

  const { error } = await supabase
    .from('sirket_dokumanlar')
    .insert(rows)

  return error
}

async function createRegistryDocument(supabase: SupabaseLike, sirketId: string, document: NonNullable<ReturnType<typeof normalizeCompanyDocument>>) {
  const { data: registryDocument, error: documentError } = await supabase
    .from('documents')
    .insert({
      company_id: sirketId,
      document_type: document.documentType,
      document_title: document.slotTitle,
      status: 'active',
      confidentiality_level: document.legacyType === 'imza_sirkuleri' ? 'confidential' : 'internal',
      created_by: null,
      updated_by: null,
    })
    .select('id')
    .single()

  if (documentError) return { documentId: null, error: documentError }

  const { error: fileError } = await supabase
    .from('document_files')
    .insert({
      document_id: registryDocument.id,
      storage_path: document.fileUrl,
      file_name: document.fileName,
      mime_type: document.mimeType,
      file_size: document.fileSize,
      thumbnail_url: document.thumbnailUrl || null,
      uploaded_by: null,
      version_no: 1,
      is_current_version: true,
    })

  if (fileError && fileError.message?.includes('thumbnail_url')) {
    const retry = await supabase
      .from('document_files')
      .insert({
        document_id: registryDocument.id,
        storage_path: document.fileUrl,
        file_name: document.fileName,
        mime_type: document.mimeType,
        file_size: document.fileSize,
        uploaded_by: null,
        version_no: 1,
        is_current_version: true,
      })
    if (retry.error) return { documentId: null, error: retry.error }
  } else if (fileError) {
    return { documentId: null, error: fileError }
  }

  return { documentId: registryDocument.id as string, error: null }
}

function normalizeCompanyDocument(document: Record<string, any>) {
  const slotId = String(document.slotId || document.slot_id || document.dokuman_turu || 'diger')
  const legacyType = normalizeCompanyDocumentType(slotId)
  const slotTitle = document.slotTitle || document.title || COMPANY_DOCUMENT_TYPES[legacyType] || 'Belge'
  const fileName = document.name || document.fileName || document.file_name || document.document_title || slotTitle
  const fileUrl = document.url || document.previewUrl || document.preview_url || document.signedUrl || document.signed_url || document.file_url || document.download_url

  if (!document.documentId && !fileUrl) return null

  return {
    slotId,
    legacyType,
    slotTitle: String(slotTitle),
    documentId: document.documentId || document.document_id,
    documentLinkId: document.documentLinkId || document.document_link_id || document.link_id,
    documentType: COMPANY_DOCUMENT_TYPES[legacyType] || 'Diğer',
    fileName: String(fileName),
    fileUrl: fileUrl ? String(fileUrl) : '',
    fileSize: Number(document.size || document.file_size || 0),
    mimeType: String(document.type || document.mime_type || document.mimeType || 'application/octet-stream'),
    thumbnailUrl: document.thumbnailUrl || document.thumbnail_url || null,
  }
}

function normalizeCompanyDocumentType(value: unknown) {
  const allowed = new Set(['vergi_levhasi', 'ticaret_sicil', 'imza_sirkuleri', 'faaliyet_belgesi', 'diger'])
  const text = String(value || '')
  return allowed.has(text) ? text : 'diger'
}

function isMissingRegistryTableError(error: { message?: string; code?: string }) {
  const message = error.message || ''
  return error.code === '42P01' || message.includes('Could not find the table') || message.includes('schema cache')
}
