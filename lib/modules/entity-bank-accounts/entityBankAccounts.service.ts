import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BankAccountAutoFillService } from './BankAccountAutoFillService'
import type { EntityBankAccountKind } from './entityBankAccounts.types'

const PERSON_MASTER_SELECT = 'id,full_name,first_name,last_name,display_name,country,ulke,nationality_country'
const ORGANIZATION_MASTER_SELECT = 'id,legal_name,trade_name,ticari_unvan,display_name,short_name,country,ulke,nationality_country'
const BANK_ACCOUNT_SELECT = 'id,entity_kind,person_id,organization_id,beneficiary_name,is_same_as_master_name,beneficiary_name_note,iban,account_number,account_country,account_currency,bank_name,bank_country,bank_code,branch_name,branch_code,swift_bic,bank_address,local_clearing_code_type,local_clearing_code,has_intermediary_bank,intermediary_bank_name,intermediary_swift_bic,intermediary_bank_address,intermediary_account_number,preferred_currency,payment_purpose,swift_charge_type,payment_note,verification_status,document_reference_id,is_default,status,history,autofill_sources,created_at,created_by,updated_at,updated_by,is_deleted,deleted_at,deleted_by,version'

export const EntityBankAccountSchema = z.object({
  beneficiary_name: z.string().min(1),
  is_same_as_master_name: z.boolean().default(true),
  beneficiary_name_note: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  account_number: z.string().optional().nullable(),
  account_country: z.string().optional().nullable(),
  account_currency: z.string().optional().nullable(),
  bank_name: z.string().optional().nullable(),
  bank_country: z.string().optional().nullable(),
  bank_code: z.string().optional().nullable(),
  branch_name: z.string().optional().nullable(),
  branch_code: z.string().optional().nullable(),
  swift_bic: z.string().optional().nullable(),
  bank_address: z.string().optional().nullable(),
  local_clearing_code_type: z.string().optional().nullable(),
  local_clearing_code: z.string().optional().nullable(),
  has_intermediary_bank: z.boolean().default(false),
  intermediary_bank_name: z.string().optional().nullable(),
  intermediary_swift_bic: z.string().optional().nullable(),
  intermediary_bank_address: z.string().optional().nullable(),
  intermediary_account_number: z.string().optional().nullable(),
  preferred_currency: z.string().optional().nullable(),
  payment_purpose: z.string().optional().nullable(),
  swift_charge_type: z.enum(['SHA', 'OUR', 'BEN']).optional().nullable(),
  payment_note: z.string().optional().nullable(),
  verification_status: z.enum(['unverified', 'manually_verified', 'document_verified', 'bank_integration_verified', 'invalid']).default('unverified'),
  document_reference_id: z.string().optional().nullable(),
  is_default: z.boolean().default(false),
  status: z.enum(['active', 'passive', 'invalid']).default('active'),
})

export type EntityBankAccountInput = z.infer<typeof EntityBankAccountSchema>

export class EntityBankAccountsService {
  constructor(private supabase: SupabaseClient) {}

  async getMaster(kind: EntityBankAccountKind, id: string) {
    const table = kind === 'person' ? 'persons' : 'organizations'
    const select = kind === 'person' ? PERSON_MASTER_SELECT : ORGANIZATION_MASTER_SELECT
    const { data, error } = await this.supabase.from(table).select(select).eq('id', id).maybeSingle()
    if (error) throw error
    return data || null
  }

  async list(kind: EntityBankAccountKind, id: string) {
    const column = kind === 'person' ? 'person_id' : 'organization_id'
    const { data, error } = await this.supabase
      .from('entity_bank_accounts')
      .select(BANK_ACCOUNT_SELECT)
      .eq('entity_kind', kind)
      .eq(column, id)
      .eq('is_deleted', false)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async get(id: string) {
    const { data, error } = await this.supabase.from('entity_bank_accounts').select(BANK_ACCOUNT_SELECT).eq('id', id).maybeSingle()
    if (error) throw error
    return data
  }

  async create(kind: EntityBankAccountKind, entityId: string, input: EntityBankAccountInput, userId: string | null) {
    const master = await this.getMaster(kind, entityId)
    const defaults = BankAccountAutoFillService.buildDefaults(kind, master)
    const row = this.normalize({
      ...defaults,
      ...input,
      entity_kind: kind,
      person_id: kind === 'person' ? entityId : null,
      organization_id: kind === 'organization' ? entityId : null,
      created_by: userId,
      updated_by: userId,
      history: [historyItem('Banka hesabı eklendi', userId)],
    })

    if (row.is_default) await this.clearDefault(kind, entityId)
    const { data, error } = await this.supabase.from('entity_bank_accounts').insert(row).select(BANK_ACCOUNT_SELECT).single()
    if (error) throw error
    if (!row.is_default) await this.ensureOneDefault(kind, entityId)
    return data
  }

  async syncMany(kind: EntityBankAccountKind, entityId: string, rows: Array<Record<string, any>>, userId: string | null) {
    if (!Array.isArray(rows)) return []
    const master = await this.getMaster(kind, entityId)
    const defaults = BankAccountAutoFillService.buildDefaults(kind, master)
    const saved: Record<string, any>[] = []

    for (const row of rows) {
      if (!row || typeof row !== 'object') continue
      if (!row.iban && !row.account_number && !row.id) continue
      const parsed = EntityBankAccountSchema.safeParse({
        ...row,
        beneficiary_name: row.beneficiary_name || defaults.beneficiary_name || 'Hesap Sahibi',
        is_default: row.is_default ?? rows.length === 1,
      })
      if (!parsed.success) continue

      const rawId = String(row.id || '')
      if (rawId && !rawId.startsWith('tmp-')) {
        saved.push(await this.update(rawId, parsed.data, userId))
      } else {
        saved.push(await this.create(kind, entityId, parsed.data, userId))
      }
    }

    return saved
  }

  async update(id: string, input: Partial<EntityBankAccountInput>, userId: string | null) {
    const current = await this.get(id)
    if (!current) throw new Error('Banka hesabı bulunamadı.')
    const next = this.normalize({
      ...current,
      ...input,
      updated_at: new Date().toISOString(),
      updated_by: userId,
      version: (current.version || 1) + 1,
      history: [...(Array.isArray(current.history) ? current.history : []), ...buildHistory(current, input, userId)],
    })

    if (next.is_default && !current.is_default) {
      await this.clearDefault(current.entity_kind, current.person_id || current.organization_id)
    }

    const { data, error } = await this.supabase.from('entity_bank_accounts').update(next).eq('id', id).select(BANK_ACCOUNT_SELECT).single()
    if (error) throw error
    return data
  }

  async setDefault(id: string, userId: string | null) {
    const current = await this.get(id)
    if (!current) throw new Error('Banka hesabı bulunamadı.')
    const entityId = current.person_id || current.organization_id
    await this.clearDefault(current.entity_kind, entityId)
    const history = [...(Array.isArray(current.history) ? current.history : []), historyItem('Varsayılan hesap değiştirildi', userId)]
    const { data, error } = await this.supabase
      .from('entity_bank_accounts')
      .update({ is_default: true, updated_at: new Date().toISOString(), updated_by: userId, history })
      .eq('id', id)
      .select(BANK_ACCOUNT_SELECT)
      .single()
    if (error) throw error
    return data
  }

  async passivate(id: string, userId: string | null) {
    const current = await this.get(id)
    if (!current) throw new Error('Banka hesabı bulunamadı.')
    const history = [...(Array.isArray(current.history) ? current.history : []), historyItem('Hesap pasifleştirildi', userId)]
    const { data, error } = await this.supabase
      .from('entity_bank_accounts')
      .update({ status: 'passive', is_default: false, is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId, updated_by: userId, history })
      .eq('id', id)
      .select(BANK_ACCOUNT_SELECT)
      .single()
    if (error) throw error
    await this.ensureOneDefault(current.entity_kind, current.person_id || current.organization_id)
    return data
  }

  private normalize(row: Record<string, any>) {
    const normalized = { ...row }
    const suggestion = BankAccountAutoFillService.applyIban(normalized, normalized)
    Object.assign(normalized, suggestion.values)
    normalized.autofill_sources = { ...(normalized.autofill_sources || {}), ...suggestion.sources }
    normalized.swift_bic = normalized.swift_bic ? String(normalized.swift_bic).replace(/\s/g, '').toUpperCase() : null
    normalized.iban = normalized.iban ? String(normalized.iban).replace(/(.{4})/g, '$1 ').trim() : null
    normalized.beneficiary_name = String(normalized.beneficiary_name || '').trim()
    return normalized
  }

  private async clearDefault(kind: EntityBankAccountKind, entityId?: string | null) {
    if (!entityId) return
    const column = kind === 'person' ? 'person_id' : 'organization_id'
    await this.supabase
      .from('entity_bank_accounts')
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('entity_kind', kind)
      .eq(column, entityId)
      .eq('is_deleted', false)
  }

  private async ensureOneDefault(kind: EntityBankAccountKind, entityId?: string | null) {
    if (!entityId) return
    const rows = await this.list(kind, entityId)
    if (rows.some(row => row.is_default && row.status === 'active')) return
    const first = rows.find(row => row.status === 'active')
    if (first) await this.supabase.from('entity_bank_accounts').update({ is_default: true }).eq('id', first.id)
  }
}

function historyItem(action: string, userId: string | null, extra: Record<string, any> = {}) {
  return { action, changed_at: new Date().toISOString(), changed_by: userId || 'Sistem Kullanıcısı', ...extra }
}

function buildHistory(current: Record<string, any>, patch: Record<string, any>, userId: string | null) {
  const labels: Record<string, string> = {
    iban: 'IBAN değiştirildi',
    account_number: 'Account Number değiştirildi',
    beneficiary_name: 'Beneficiary Name değiştirildi',
    verification_status: 'Doğrulama durumu değiştirildi',
    document_reference_id: 'Belge bağlandı',
    swift_bic: 'SWIFT bilgileri değiştirildi',
    intermediary_bank_name: 'Aracı banka bilgileri değiştirildi',
    intermediary_swift_bic: 'Aracı banka bilgileri değiştirildi',
    intermediary_bank_address: 'Aracı banka bilgileri değiştirildi',
    intermediary_account_number: 'Aracı banka bilgileri değiştirildi',
  }

  return Object.entries(labels)
    .filter(([field]) => field in patch && patch[field] !== current[field])
    .map(([field, action]) => historyItem(action, userId, { field, old_value: current[field] ?? null, new_value: patch[field] ?? null }))
}
