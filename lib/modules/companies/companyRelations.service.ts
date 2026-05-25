import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import { applyTenantQueryScope, type TenantContext, withTenantInsertScopeForTable } from '@/lib/tenancy/server'
import { isMissingTableError } from './companyErrors'

export async function ensureCompanyRootUnit(
  supabase: ReturnType<typeof createServiceClient>,
  companyId: string,
  companyData: Record<string, any>,
  tenantContext: TenantContext
) {
  const { data: unitType, error: typeError } = await supabase
    .from('organization_unit_types')
    .upsert({ name: 'Şirket', slug: 'company', color: '#0f766e', icon: 'Building2', sort_order: 0, is_active: true }, { onConflict: 'slug' })
    .select('id')
    .single()

  if (typeError) return isMissingTableError(typeError) ? null : typeError

  const companyName = companyData.trade_name || companyData.short_name || 'Şirket'
  let existingQuery = supabase
    .from('organization_units')
    .select('id')
    .eq('company_id', companyId)
    .is('parent_unit_id', null)
    .eq('type', 'company')
    .eq('is_deleted', false)
    .limit(1)

  existingQuery = applyTenantQueryScope(existingQuery, 'organization_units', tenantContext)
  const { data: existing, error: findError } = await existingQuery.maybeSingle()

  if (findError) return isMissingTableError(findError) ? null : findError

  const payload = withTenantInsertScopeForTable({
    company_id: companyId,
    parent_unit_id: null,
    name: companyName,
    short_name: companyData.short_name || null,
    type: 'company',
    unit_type_id: unitType?.id || null,
    status: 'Aktif',
    active: true,
    is_deleted: false,
  }, 'organization_units', tenantContext)

  if (existing?.id) {
    let updateQuery = supabase.from('organization_units').update(payload).eq('id', existing.id)
    updateQuery = applyTenantQueryScope(updateQuery, 'organization_units', tenantContext)
    const { error } = await updateQuery
    return isMissingTableError(error) ? null : error
  }

  const { error } = await supabase.from('organization_units').insert(payload)
  return isMissingTableError(error) ? null : error
}

export async function insertCompanyPartners(
  supabase: ReturnType<typeof createServiceClient>,
  companyId: string,
  partners: Record<string, any>[] | undefined,
  tenantContext: TenantContext
) {
  if (!partners?.length) return null

  const { error } = await supabase
    .from('company_partners')
    .insert(partners.map(partner => withTenantInsertScopeForTable(mapPartnerForDb(companyId, partner), 'company_partners', tenantContext)))

  return error
}

export async function insertCompanyRepresentatives(
  supabase: ReturnType<typeof createServiceClient>,
  companyId: string,
  representatives: Record<string, any>[] | undefined,
  tenantContext: TenantContext
) {
  if (!representatives?.length) return null

  const { error } = await supabase
    .from('company_representatives')
    .insert(representatives.map(representative =>
      withTenantInsertScopeForTable(mapRepresentativeForDb(companyId, representative), 'company_representatives', tenantContext)
    ))

  return error
}

function mapPartnerForDb(companyId: string, partner: Record<string, any>) {
  const displayName = partner.display_name || [partner.first_name, partner.last_name].filter(Boolean).join(' ').trim() || partner.partner_name || 'Ortak'
  const status = partner.status || partnerStatusLabel(partner.record_status)
  const ownerKind = normalizePartnerKind(partner.owner_kind || partner.partner_type)

  return {
    company_id: companyId,
    partner_name: displayName,
    partner_type: ownerKind,
    identity_tax_number: partner.identity_number || partner.identity_tax_number || null,
    share_ratio: partner.share_ratio ? Number(partner.share_ratio) : null,
    signature_authority: !!(partner.has_representation_right ?? partner.signature_authority),
    owner_kind: ownerKind,
    source_type: partner.source_type || null,
    source_id: partner.source_id || null,
    display_name: displayName,
    identity_number: partner.identity_number || partner.identity_tax_number || null,
    share_class: partner.share_class || 'Adi Pay',
    share_units: partner.share_units ? Number(partner.share_units) : null,
    nominal_value: partner.nominal_value ? Number(partner.nominal_value) : null,
    capital_amount: partner.capital_amount ? Number(partner.capital_amount) : null,
    voting_ratio: partner.voting_ratio ? Number(partner.voting_ratio) : null,
    profit_ratio: partner.profit_ratio ? Number(partner.profit_ratio) : null,
    beneficial_owner: !!partner.beneficial_owner,
    is_beneficial_owner: !!(partner.beneficial_owner || partner.is_beneficial_owner),
    beneficial_ratio: partner.beneficial_ratio ? Number(partner.beneficial_ratio) : null,
    beneficial_note: partner.beneficial_note || null,
    is_ultimate_controller: !!partner.is_ultimate_controller,
    has_representation_right: !!(partner.has_representation_right ?? partner.signature_authority),
    has_control_right: !!partner.has_control_right,
    control_type: partner.control_type || null,
    has_board_nomination_right: !!partner.has_board_nomination_right,
    has_veto_right: !!partner.has_veto_right,
    has_privileged_share: !!partner.has_privileged_share,
    start_date: partner.start_date || null,
    end_date: partner.end_date || null,
    status,
    record_status: partner.record_status || normalizePartnerRecordStatus(status),
    document_reference_id: partner.document_reference_id || null,
    notes: partner.notes || null,
    history: partner.history || [],
    is_deleted: !!partner.is_deleted,
    deleted_at: partner.deleted_at || null,
  }
}

function normalizePartnerKind(value: unknown): 'person' | 'organization' {
  const text = String(value || '').trim().toLocaleLowerCase('tr-TR')
  return ['organization', 'company', 'sirket', 'şirket', 'tüzel_kisi'].includes(text) ? 'organization' : 'person'
}

function normalizePartnerRecordStatus(status: unknown): 'draft' | 'active' | 'passive' {
  const normalized = String(status || '').trim().toLocaleLowerCase('tr-TR')
  if (normalized === 'active' || normalized === 'aktif') return 'active'
  if (normalized === 'passive' || normalized === 'pasif') return 'passive'
  return 'draft'
}

function partnerStatusLabel(recordStatus: unknown) {
  if (recordStatus === 'active') return 'Aktif'
  if (recordStatus === 'passive') return 'Pasif'
  return 'Taslak'
}

function normalizeCompanyRepresentativeAuthority(value: unknown) {
  return String(value || '').trim()
}

function getCompanyRepresentativePrimaryAuthority(representative: Record<string, any>) {
  const candidates = [
    representative.job_title,
    representative.primary_authority_type,
    Array.isArray(representative.authority_types) ? representative.authority_types[0] : null,
    representative.authority_type,
  ]
  return candidates.map(normalizeCompanyRepresentativeAuthority).find(Boolean) || ''
}

function mapRepresentativeForDb(companyId: string, representative: Record<string, any>) {
  const primaryAuthority = getCompanyRepresentativePrimaryAuthority(representative)
  const authorityTypes = Array.isArray(representative.authority_types) && representative.authority_types.length
    ? representative.authority_types.map(normalizeCompanyRepresentativeAuthority).filter(Boolean)
    : [primaryAuthority].filter(Boolean)

  return {
    company_id: companyId,
    full_name: representative.display_name || representative.full_name || 'Temsilci',
    job_title: primaryAuthority || null,
    authority_type: primaryAuthority || 'other',
    authority_types: authorityTypes,
    person_kind: representative.person_kind || 'person',
    source_type: representative.source_type || null,
    source_id: representative.source_id || null,
    display_name: representative.display_name || representative.full_name || null,
    start_date: representative.start_date || null,
    end_date: representative.end_date || null,
    status: representative.status || 'Aktif',
    document_reference_id: representative.document_reference_id || null,
    notes: representative.notes || null,
    bank_authority_level: representative.bank_authority_level || null,
    transaction_limit: representative.transaction_limit ? Number(representative.transaction_limit) : null,
    payment_approval_limit: representative.payment_approval_limit ? Number(representative.payment_approval_limit) : null,
    purchase_approval_limit: representative.purchase_approval_limit ? Number(representative.purchase_approval_limit) : null,
    currency: representative.currency || 'TRY',
    signature_type: representative.signature_type || null,
    signature_degree: representative.signature_degree || null,
    requires_joint_signature: !!representative.requires_joint_signature,
    can_approve_alone: !!representative.can_approve_alone,
    department_scope: representative.department_scope || null,
    gib_permissions: representative.gib_permissions || null,
    can_submit_declaration: !!representative.can_submit_declaration,
    can_process_e_invoice: !!representative.can_process_e_invoice,
    sgk_permissions: representative.sgk_permissions || null,
    can_submit_hiring_notice: !!representative.can_submit_hiring_notice,
    can_submit_termination_notice: !!representative.can_submit_termination_notice,
    history: representative.history || [],
    is_deleted: !!representative.is_deleted,
    deleted_at: representative.deleted_at || null,
  }
}
