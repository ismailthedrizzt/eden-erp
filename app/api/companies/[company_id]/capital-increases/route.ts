import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { applyTenantQueryScope, withTenantInsertScopeForTable } from '@/lib/tenancy/server'
import {
  CAPITAL_INCREASE_DOCUMENT_SLOTS,
  CAPITAL_INCREASE_SELECT,
  CAPITAL_INCREASE_TYPES,
  CAPITAL_SOURCES,
  buildCapitalIncreasePrecheck,
  capitalIncreaseError,
  ensureCapitalIncreaseAccess,
  nextCapitalIncreaseNo,
  numberValue,
  roundMoney,
  roundRatio,
  withCapitalTenant,
} from './_shared'

const ParticipantSchema = z.object({
  partner_id: z.string().uuid(),
  increase_amount: z.coerce.number().min(0),
  capital_source: z.enum(CAPITAL_SOURCES).optional().nullable(),
  description: z.string().optional().nullable(),
})

const NewPartnerSchema = z.object({
  mode: z.enum(['existing_draft', 'new_record']),
  partner_id: z.string().uuid().optional().nullable(),
  owner_kind: z.enum(['person', 'organization']).default('person'),
  display_name: z.string().optional().nullable(),
  identity_tax_number: z.string().optional().nullable(),
})

const DocumentSchema = z.object({
  slotId: z.string(),
  storagePath: z.string().optional().nullable(),
  documentId: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  size: z.coerce.number().optional().nullable(),
  type: z.string().optional().nullable(),
  uploadedAt: z.any().optional().nullable(),
  status: z.string().optional().nullable(),
  version: z.coerce.number().optional().nullable(),
  url: z.string().optional().nullable(),
  previewUrl: z.string().optional().nullable(),
  thumbnailPath: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
})

const CapitalIncreaseSchema = z.object({
  increase_type: z.enum(CAPITAL_INCREASE_TYPES),
  transaction_date: z.string().min(1),
  participants: z.array(ParticipantSchema).default([]),
  new_partner: NewPartnerSchema.optional().nullable(),
  new_partner_increase_amount: z.coerce.number().min(0).optional().nullable(),
  new_partner_capital_source: z.enum(CAPITAL_SOURCES).optional().nullable(),
  notes: z.string().optional().nullable(),
  document_files: z.array(DocumentSchema).default([]),
  document_meta: z.record(z.object({
    document_date: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
  })).default({}),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id: companyId } = await params
  const supabase = createServiceClient()
  const access = await ensureCapitalIncreaseAccess(request, supabase, companyId, 'companies.edit')
  if (access.response) return access.response

  const body = await request.json().catch(() => ({}))
  const parsed = CapitalIncreaseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz veri', code: 'VALIDATION_FAILED', details: parsed.error.flatten() }, { status: 400 })
  }

  const input = parsed.data
  const precheck = await buildCapitalIncreasePrecheck(supabase, companyId, access.tenantContext)
  if (!precheck.ok) {
    return capitalIncreaseError(precheck.message || 'Sermaye artırımı ön kontrolü başarısız.', 'CAPITAL_INCREASE_PRECHECK_FAILED', 400, { reasons: precheck.reasons })
  }

  const documents = normalizeDocuments(input.document_files, input.document_meta)
  const missingDocumentSlots = CAPITAL_INCREASE_DOCUMENT_SLOTS.filter(slotId => !documents.some(document => document.slotId === slotId && hasDocumentReference(document)))
  if (missingDocumentSlots.length) {
    return capitalIncreaseError('Zorunlu belgeler yüklenmeden işlem tamamlanamaz.', 'REQUIRED_DOCUMENTS_MISSING', 400, { missingDocumentSlots })
  }

  const isNewPartnerIncrease = input.increase_type === 'Yeni ortak girişiyle sermaye artırımı'
  const activePartnerIds = precheck.active_partners.map(partner => partner.id)
  let partnerQuery = supabase
    .from('company_partners')
    .select('id,company_id,display_name,partner_name,owner_kind,partner_type,identity_tax_number,share_ratio,voting_ratio,profit_ratio,capital_amount,paid_capital_amount,status,record_status,history,is_deleted')
    .eq('company_id', companyId)
    .eq('is_deleted', false)
  partnerQuery = applyTenantQueryScope(partnerQuery, 'company_partners', access.tenantContext)
  const { data: rawPartners, error: partnersError } = await partnerQuery
  if (partnersError) return capitalIncreaseError(partnersError.message, partnersError.code || 'PARTNERS_FETCH_FAILED', 500)

  const rawPartnerMap = new Map((rawPartners || []).map((partner: Record<string, any>) => [String(partner.id), partner]))
  const currentCapital = precheck.current_capital_amount
  const participationByPartnerId = new Map<string, { increase_amount: number; capital_source: string | null; description: string | null }>()

  if (isNewPartnerIncrease) {
    const amount = numberValue(input.new_partner_increase_amount)
    if (amount <= 0) return capitalIncreaseError('Yeni ortak için sermaye artırım tutarı 0’dan büyük olmalıdır.', 'NEW_PARTNER_AMOUNT_REQUIRED')
    if (!input.new_partner_capital_source) return capitalIncreaseError('Yeni ortak için artırım kaynağı seçilmelidir.', 'CAPITAL_SOURCE_REQUIRED')
    if (!input.new_partner) return capitalIncreaseError('Yeni ortak bilgisi seçilmelidir.', 'NEW_PARTNER_REQUIRED')
  } else {
    const submittedIds = new Set(input.participants.map(row => row.partner_id))
    const missingActivePartners = activePartnerIds.filter(id => !submittedIds.has(id))
    if (missingActivePartners.length) {
      return capitalIncreaseError('Tüm aktif ortaklar sermaye artırımı tablosunda yer almalıdır.', 'ACTIVE_PARTICIPANTS_MISSING', 400, { missingActivePartners })
    }

    input.participants.forEach(row => {
      const amount = numberValue(row.increase_amount)
      participationByPartnerId.set(row.partner_id, {
        increase_amount: amount,
        capital_source: row.capital_source || null,
        description: row.description || null,
      })
    })
    const missingSource = input.participants.filter(row => numberValue(row.increase_amount) > 0 && !row.capital_source)
    if (missingSource.length) return capitalIncreaseError('Artırım tutarı girilen her ortak için artırım kaynağı seçilmelidir.', 'CAPITAL_SOURCE_REQUIRED')
  }

  const increaseAmount = isNewPartnerIncrease
    ? numberValue(input.new_partner_increase_amount)
    : roundMoney(input.participants.reduce((sum, row) => sum + numberValue(row.increase_amount), 0))
  if (increaseAmount <= 0) return capitalIncreaseError('Sermaye artırım tutarı 0’dan büyük olmalıdır.', 'INCREASE_AMOUNT_REQUIRED')

  const newCapital = roundMoney(currentCapital + increaseAmount)
  if (newCapital <= 0) return capitalIncreaseError('Şirketin yeni sermayesi hesaplanamadı.', 'NEW_CAPITAL_INVALID')

  const transactionNo = await nextCapitalIncreaseNo(supabase)
  const now = new Date().toISOString()
  const previousOwnership = precheck.active_partners.map(partner => ({ ...partner }))
  const participantSnapshots = precheck.active_partners.map(partner => {
    const participation = participationByPartnerId.get(partner.id)
    const increase = isNewPartnerIncrease ? 0 : numberValue(participation?.increase_amount)
    const newCommitted = roundMoney(partner.committed_capital_amount + increase)
    const newShare = roundRatio((newCommitted / newCapital) * 100)
    return {
      partner_id: partner.id,
      display_name: partner.display_name,
      owner_kind: partner.owner_kind,
      partner_type: partner.partner_type,
      old_committed_capital_amount: partner.committed_capital_amount,
      paid_capital_amount: partner.paid_capital_amount,
      increase_amount: increase,
      capital_source: participation?.capital_source || null,
      new_committed_capital_amount: newCommitted,
      old_share_ratio: partner.share_ratio,
      new_share_ratio: newShare,
      description: participation?.description || null,
    }
  })

  let newPartnerSnapshot: Record<string, any> | null = null
  let newPartnerId: string | null = null
  if (isNewPartnerIncrease) {
    const newShare = roundRatio((increaseAmount / newCapital) * 100)
    newPartnerSnapshot = {
      partner_id: input.new_partner?.partner_id || null,
      display_name: input.new_partner?.display_name || null,
      owner_kind: input.new_partner?.owner_kind || 'person',
      partner_type: input.new_partner?.owner_kind || 'person',
      old_committed_capital_amount: 0,
      paid_capital_amount: 0,
      increase_amount: increaseAmount,
      capital_source: input.new_partner_capital_source || null,
      new_committed_capital_amount: increaseAmount,
      old_share_ratio: 0,
      new_share_ratio: newShare,
      description: input.notes || null,
      record_status: input.new_partner?.mode === 'existing_draft' ? 'draft_to_active' : 'new_active',
    }
  }

  const newOwnership = [...participantSnapshots, ...(newPartnerSnapshot ? [newPartnerSnapshot] : [])]
  const totalNewShare = roundRatio(newOwnership.reduce((sum, row) => sum + numberValue(row.new_share_ratio), 0))
  if (Math.abs(totalNewShare - 100) > 0.05) {
    return capitalIncreaseError('Yeni ortaklık oranları toplamı %100 değil. Lütfen sermaye tutarlarını kontrol edin.', 'OWNERSHIP_RATIO_INVALID', 400, { totalNewShare })
  }

  for (const snapshot of participantSnapshots) {
    const current = rawPartnerMap.get(snapshot.partner_id)
    if (!current) return capitalIncreaseError('Aktif ortak kaydı bulunamadı.', 'PARTNER_NOT_FOUND')
    const oldHistory = Array.isArray(current.history) ? current.history : []
    let updateQuery = supabase
      .from('company_partners')
      .update({
        capital_amount: snapshot.new_committed_capital_amount,
        share_ratio: snapshot.new_share_ratio,
        history: [
          ...oldHistory,
          {
            action: 'Sermaye artırımı',
            transaction_no: transactionNo,
            old_committed_capital_amount: snapshot.old_committed_capital_amount,
            increase_amount: snapshot.increase_amount,
            new_committed_capital_amount: snapshot.new_committed_capital_amount,
            old_share_ratio: snapshot.old_share_ratio,
            new_share_ratio: snapshot.new_share_ratio,
            changed_at: now,
          },
        ],
        updated_at: now,
      })
      .eq('id', snapshot.partner_id)
    updateQuery = applyTenantQueryScope(updateQuery, 'company_partners', access.tenantContext)
    const { error: updateError } = await updateQuery
    if (updateError) return capitalIncreaseError(updateError.message, updateError.code || 'PARTNER_UPDATE_FAILED', 500)
  }

  if (newPartnerSnapshot) {
    if (input.new_partner?.mode === 'existing_draft') {
      if (!input.new_partner.partner_id) return capitalIncreaseError('Aktifleştirilecek taslak ortak seçilmelidir.', 'NEW_PARTNER_REQUIRED')
      let draftQuery = supabase
        .from('company_partners')
        .select('id,company_id,display_name,partner_name,history,is_deleted')
        .eq('id', input.new_partner.partner_id)
        .eq('is_deleted', false)
      draftQuery = applyTenantQueryScope(draftQuery, 'company_partners', access.tenantContext)
      const { data: draftPartner, error: draftError } = await draftQuery.maybeSingle()
      if (draftError) return capitalIncreaseError(draftError.message, draftError.code || 'DRAFT_PARTNER_FETCH_FAILED', 500)
      if (!draftPartner) return capitalIncreaseError('Seçilen taslak ortak bulunamadı.', 'DRAFT_PARTNER_NOT_FOUND')

      const oldHistory = Array.isArray((draftPartner as Record<string, any>).history) ? (draftPartner as Record<string, any>).history : []
      let updateDraft = supabase
        .from('company_partners')
        .update({
          company_id: companyId,
          status: 'active',
          record_status: 'active',
          capital_amount: newPartnerSnapshot.new_committed_capital_amount,
          paid_capital_amount: 0,
          share_ratio: newPartnerSnapshot.new_share_ratio,
          voting_ratio: newPartnerSnapshot.new_share_ratio,
          profit_ratio: newPartnerSnapshot.new_share_ratio,
          start_date: input.transaction_date,
          history: [
            ...oldHistory,
            {
              action: 'Sermaye artırımı ile aktifleştirildi',
              transaction_no: transactionNo,
              new_committed_capital_amount: newPartnerSnapshot.new_committed_capital_amount,
              new_share_ratio: newPartnerSnapshot.new_share_ratio,
              changed_at: now,
            },
          ],
          updated_at: now,
        })
        .eq('id', input.new_partner.partner_id)
      updateDraft = applyTenantQueryScope(updateDraft, 'company_partners', access.tenantContext)
      const { error: updateDraftError } = await updateDraft
      if (updateDraftError) return capitalIncreaseError(updateDraftError.message, updateDraftError.code || 'DRAFT_PARTNER_UPDATE_FAILED', 500)
      newPartnerId = input.new_partner.partner_id
      newPartnerSnapshot.partner_id = newPartnerId
      newPartnerSnapshot.display_name = (draftPartner as Record<string, any>).display_name || (draftPartner as Record<string, any>).partner_name || newPartnerSnapshot.display_name
    } else {
      const displayName = String(input.new_partner?.display_name || '').trim()
      if (!displayName) return capitalIncreaseError('Yeni ortak adı / ünvanı girilmelidir.', 'NEW_PARTNER_NAME_REQUIRED')
      const insertPayload = withTenantInsertScopeForTable({
        company_id: companyId,
        owner_kind: input.new_partner?.owner_kind || 'person',
        partner_type: input.new_partner?.owner_kind || 'person',
        display_name: displayName,
        partner_name: displayName,
        identity_tax_number: input.new_partner?.identity_tax_number || '',
        status: 'active',
        record_status: 'active',
        capital_amount: newPartnerSnapshot.new_committed_capital_amount,
        paid_capital_amount: 0,
        share_ratio: newPartnerSnapshot.new_share_ratio,
        voting_ratio: newPartnerSnapshot.new_share_ratio,
        profit_ratio: newPartnerSnapshot.new_share_ratio,
        start_date: input.transaction_date,
        history: [{
          action: 'Sermaye artırımı ile oluşturuldu',
          transaction_no: transactionNo,
          new_committed_capital_amount: newPartnerSnapshot.new_committed_capital_amount,
          new_share_ratio: newPartnerSnapshot.new_share_ratio,
          changed_at: now,
        }],
        created_at: now,
        updated_at: now,
      }, 'company_partners', access.tenantContext)
      const { data: insertedPartner, error: insertPartnerError } = await supabase
        .from('company_partners')
        .insert(insertPayload)
        .select('id,display_name')
        .single()
      if (insertPartnerError) return capitalIncreaseError(insertPartnerError.message, insertPartnerError.code || 'NEW_PARTNER_CREATE_FAILED', 500)
      newPartnerId = insertedPartner.id
      newPartnerSnapshot.partner_id = insertedPartner.id
      newPartnerSnapshot.display_name = insertedPartner.display_name || displayName
    }
  }

  let companyUpdate = supabase
    .from('companies')
    .update({
      committed_capital_amount: newCapital,
      updated_at: now,
    })
    .eq('id', companyId)
  companyUpdate = applyTenantQueryScope(companyUpdate, 'companies', access.tenantContext)
  const { error: companyUpdateError } = await companyUpdate
  if (companyUpdateError) return capitalIncreaseError(companyUpdateError.message, companyUpdateError.code || 'COMPANY_CAPITAL_UPDATE_FAILED', 500)

  const transactionValues = withCapitalTenant({
    company_id: companyId,
    transaction_no: transactionNo,
    increase_type: input.increase_type,
    transaction_date: input.transaction_date,
    current_capital_amount: currentCapital,
    increase_amount: increaseAmount,
    new_capital_amount: newCapital,
    paid_capital_amount: precheck.paid_capital_amount,
    participants: newOwnership,
    previous_ownership: previousOwnership,
    new_ownership: newOwnership,
    new_partner_id: newPartnerId,
    document_files: documents,
    status: 'completed',
    notes: input.notes || null,
    warnings: Math.abs(totalNewShare - 100) > 0.01 ? [`Yuvarlama farkı: toplam yeni hisse %${totalNewShare}`] : [],
    history: [{ action: 'Sermaye artırımı tamamlandı', changed_at: now }],
    completed_at: now,
    created_at: now,
    updated_at: now,
  }, access.tenantContext)

  const { data: transaction, error: transactionError } = await supabase
    .from('company_capital_increase_transactions')
    .insert(transactionValues)
    .select(CAPITAL_INCREASE_SELECT)
    .single()
  if (transactionError) return capitalIncreaseError(transactionError.message, transactionError.code || 'CAPITAL_INCREASE_CREATE_FAILED', 500)

  let nextCompanyQuery = supabase
    .from('companies')
    .select('id,committed_capital_amount,paid_capital_amount,updated_at')
    .eq('id', companyId)
  nextCompanyQuery = applyTenantQueryScope(nextCompanyQuery, 'companies', access.tenantContext)
  const { data: company } = await nextCompanyQuery.maybeSingle()

  return NextResponse.json({
    data: {
      transaction,
      company,
      current_capital_amount: currentCapital,
      increase_amount: increaseAmount,
      new_capital_amount: newCapital,
      paid_capital_amount: precheck.paid_capital_amount,
    },
  }, { status: 201 })
}

function hasDocumentReference(document: Record<string, any>) {
  return Boolean(document.storagePath || document.documentId || document.url || document.previewUrl)
}

function normalizeDocuments(documents: Array<Record<string, any>>, meta: Record<string, { document_date?: string | null; description?: string | null }>) {
  return documents
    .filter(document => document && String(document.status || 'active') !== 'deleted')
    .map(document => ({
      slotId: String(document.slotId || ''),
      storagePath: document.storagePath || null,
      documentId: document.documentId || document.storagePath || null,
      name: document.name || null,
      size: document.size ?? null,
      type: document.type || null,
      uploadedAt: document.uploadedAt || null,
      status: document.status || 'active',
      version: document.version ?? null,
      url: document.url || undefined,
      previewUrl: document.previewUrl || undefined,
      thumbnailPath: document.thumbnailPath || undefined,
      thumbnailUrl: document.thumbnailUrl || undefined,
      document_date: meta?.[String(document.slotId || '')]?.document_date || null,
      description: meta?.[String(document.slotId || '')]?.description || null,
    }))
}
