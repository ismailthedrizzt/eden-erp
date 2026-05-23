import { COMPANY_LIFECYCLE_PROCESSES } from '@/lib/lifecycle/processes/companyLifecycleProcesses'

type DocumentFieldConfig = {
  field: string
  slotId: string
  slotTitle: string
}

const OPENING_DOCUMENT_FIELDS: DocumentFieldConfig[] = COMPANY_LIFECYCLE_PROCESSES.opening.completion.documentWrites
  .filter(write => write.targetField === 'hero_documents')
  .map(write => ({
    field: write.sourceField,
    slotId: write.slotId,
    slotTitle: write.slotTitle,
  }))

export function deriveOpeningHeroDocumentsFromPayload(payload: unknown) {
  const source = asRecord(payload)
  if (!source) return []

  return OPENING_DOCUMENT_FIELDS
    .map(config => normalizeOpeningDocument(source[config.field], config))
    .filter((document): document is Record<string, unknown> => !!document)
}

export function mergeOpeningHeroDocuments(existingDocuments: unknown, openingDocuments: Array<Record<string, unknown>>) {
  const existing = Array.isArray(existingDocuments)
    ? existingDocuments.filter((document): document is Record<string, unknown> => !!document && typeof document === 'object')
    : []
  const next = [...existing]

  openingDocuments.forEach(document => {
    const slotId = String(document.slotId || '')
    const identity = getDocumentIdentity(document)
    const alreadyExists = next.some(existingDocument => {
      const existingIdentity = getDocumentIdentity(existingDocument)
      return (identity && existingIdentity === identity) || (slotId && existingDocument.slotId === slotId)
    })

    if (!alreadyExists) next.push(document)
  })

  return next
}

function normalizeOpeningDocument(value: unknown, config: DocumentFieldConfig): Record<string, unknown> | null {
  const document = asRecord(value)
  if (!document) return null

  const storagePath = stringValue(document.storagePath || document.storage_path || document.documentId || document.document_id)
  const url = storagePath ? '' : stringValue(document.url || document.previewUrl || document.preview_url || document.signedUrl || document.signed_url)
  if (!storagePath && !url) return null

  return {
    slotId: config.slotId,
    slotTitle: config.slotTitle,
    documentId: stringValue(document.documentId || document.document_id || storagePath),
    documentLinkId: stringValue(document.documentLinkId || document.document_link_id || document.link_id),
    storagePath,
    name: stringValue(document.name || document.file_name || document.fileName || config.slotTitle),
    size: Number(document.size || document.file_size || 0),
    type: stringValue(document.type || document.mime_type || document.mimeType || document.file_type || 'application/octet-stream'),
    uploadedAt: document.uploadedAt || document.uploaded_at,
    status: stringValue(document.status || 'active'),
    version: Number(document.version || 1) || 1,
    ...(url ? { url, previewUrl: url } : {}),
    ...(document.thumbnailUrl || document.thumbnail_url ? { thumbnailUrl: document.thumbnailUrl || document.thumbnail_url } : {}),
    ...(document.thumbnailPath || document.thumbnail_path ? { thumbnailPath: document.thumbnailPath || document.thumbnail_path } : {}),
  }
}

function asRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : null
}

function stringValue(value: unknown) {
  return value === undefined || value === null ? '' : String(value)
}

function getDocumentIdentity(document: Record<string, unknown>) {
  return stringValue(
    document.storagePath ||
    document.storage_path ||
    document.documentId ||
    document.document_id ||
    document.url ||
    document.previewUrl ||
    ''
  )
}
