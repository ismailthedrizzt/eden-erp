'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, ChevronDown, Eye, History, Pencil, Plus, Star, Trash2, X } from 'lucide-react'
import { cn, getTurkishIbanBanks, resolveTurkishIban } from '@/lib/utils'
import { AutomationBadge, type AutomationBadgeStatus } from './AutomationBadge'
import { IBANInput } from './IBANInput'
import { formControlClass } from './formControlStyles'
import { usePermissions } from '@/lib/security/permissionStore'
import { COUNTRY_OPTIONS } from '@/lib/reference/country-nationalities'
import {
  ENTITY_BANK_ACCOUNT_PERMISSIONS,
  VERIFICATION_STATUS_LABELS,
  type BankAccountFormPriorityMode,
  type EntityBankAccount,
  type EntityBankAccountKind,
} from '@/lib/modules/entity-bank-accounts/entityBankAccounts.types'

type Props = {
  entityKind?: EntityBankAccountKind | null
  entityId?: string | null
  masterName?: string
  masterCountry?: string
  readOnly?: boolean
  multiple?: boolean
  value?: Array<Partial<EntityBankAccount>>
  onChange?: (rows: Array<Partial<EntityBankAccount>>) => void
}

const emptyDraft: Partial<EntityBankAccount> = {
  beneficiary_name: '',
  is_same_as_master_name: true,
  iban: '',
  account_number: '',
  account_country: '',
  account_currency: '',
  bank_name: '',
  bank_country: '',
  bank_code: '',
  branch_name: '',
  branch_code: '',
  swift_bic: '',
  bank_address: '',
  local_clearing_code_type: '',
  local_clearing_code: '',
  has_intermediary_bank: false,
  intermediary_bank_name: '',
  intermediary_swift_bic: '',
  intermediary_bank_address: '',
  intermediary_account_number: '',
  preferred_currency: 'TRY',
  payment_purpose: '',
  swift_charge_type: 'SHA',
  payment_note: '',
  verification_status: 'unverified',
  document_reference_id: '',
  is_default: false,
  status: 'active',
}

const localCodeTypeOptions = ['Bank Code', 'Branch Code', 'Routing Number / ABA', 'Sort Code', 'IFSC', 'BSB', 'Other']
const currencyOptions = ['TRY', 'USD', 'EUR', 'GBP']
const swiftChargeOptions = ['SHA', 'OUR', 'BEN']
const countryOptionLabels = Object.fromEntries(COUNTRY_OPTIONS.map(option => [option.value, option.label]))
type IbanAutomationStatus = AutomationBadgeStatus
const internationalTransferFields = new Set([
  'preferred_currency',
  'swift_bic',
  'bank_country',
  'bank_address',
  'account_country',
  'account_currency',
  'local_clearing_code_type',
  'local_clearing_code',
  'has_intermediary_bank',
  'payment_purpose',
  'swift_charge_type',
  'payment_note',
  'verification_status',
  'document_reference_id',
])
const intermediaryBankFields = new Set([
  'intermediary_bank_name',
  'intermediary_swift_bic',
  'intermediary_bank_address',
  'intermediary_account_number',
])
const turkishBanksByCode = Object.fromEntries(getTurkishIbanBanks().map(bank => [bank.bankCode, bank]))

export function EntityBankAccountsPanel({ entityKind, entityId, masterName = '', masterCountry = '', readOnly = false, multiple = false, value, onChange }: Props) {
  const { can } = usePermissions()
  const [rows, setRows] = useState<EntityBankAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'list' | 'view' | 'edit' | 'create'>('list')
  const [draft, setDraft] = useState<Partial<EntityBankAccount>>(emptyDraft)
  const [historyRow, setHistoryRow] = useState<EntityBankAccount | null>(null)
  const [priorityMode, setPriorityMode] = useState<BankAccountFormPriorityMode>(getLocalPriorityMode(masterCountry))
  const [ibanAutomationStatus, setIbanAutomationStatus] = useState<IbanAutomationStatus>('idle')
  const [internationalOpen, setInternationalOpen] = useState(false)
  const singleSelectionKeyRef = useRef('')
  const ibanParseRequestRef = useRef(0)

  const embedded = !!onChange
  const hasPersistedEntity = !!entityKind && !!entityId
  const canView = embedded || can(ENTITY_BANK_ACCOUNT_PERMISSIONS.view)
  const canInsert = embedded || can(ENTITY_BANK_ACCOUNT_PERMISSIONS.insert)
  const canEdit = embedded || can(ENTITY_BANK_ACCOUNT_PERMISSIONS.edit)
  const canPassivate = embedded || can(ENTITY_BANK_ACCOUNT_PERMISSIONS.passivate)
  const canSetDefault = embedded || can(ENTITY_BANK_ACCOUNT_PERMISSIONS.setDefault)
  const locked = readOnly || !canEdit

  const load = useCallback(async () => {
    if (!entityKind || !entityId) return
    setLoading(true)
    setError('')
    try {
      const payload = await fetchJson(`/api/entities/${entityKind}/${entityId}/bank-accounts`)
      const nextRows = payload.data || []
      setRows(nextRows)
      onChange?.(nextRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Banka bilgileri alınamadı')
    } finally {
      setLoading(false)
    }
  // Keep this tied to the entity only; EntityForm passes a fresh onChange function on rerenders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityKind, entityId])

  useEffect(() => {
    if (!embedded) return
    setRows(Array.isArray(value) ? value as EntityBankAccount[] : [])
  }, [embedded, value])

  useEffect(() => {
    if (!entityKind || !entityId || !canView) return
    load()
    fetch(`/api/entity-bank-accounts/form-priority-mode?entityKind=${entityKind}&entityId=${entityId}`)
      .then(response => response.ok ? response.json() : null)
      .then(payload => payload?.data?.mode && setPriorityMode(payload.data.mode))
      .catch(() => setPriorityMode(getLocalPriorityMode(masterCountry)))
  }, [entityKind, entityId, canView, load, masterCountry])

  const orderedFields = useMemo(() => getOrderedFields(priorityMode), [priorityMode])
  const primaryFields = useMemo(() => orderedFields.filter(field => !internationalTransferFields.has(field)), [orderedFields])
  const internationalFields = useMemo(() => orderedFields.filter(field => internationalTransferFields.has(field) && !intermediaryBankFields.has(field)), [orderedFields])

  useEffect(() => {
    if (multiple) return
    const activeRows = rows.filter(row => row.status !== 'passive' && row.status !== 'invalid')
    const selected = activeRows.find(row => row.is_default) || activeRows[0] || rows[0]
    const nextDraft = selected || buildInitialDraft(rows.length === 0)
    const selectionKey = selected?.id || 'new'
    setDraft(nextDraft)
    setMode(selected ? (readOnly ? 'view' : 'edit') : 'create')
    if (selectionKey !== singleSelectionKeyRef.current) {
      singleSelectionKeyRef.current = selectionKey
      setIbanAutomationStatus(getInitialIbanAutomationStatus(nextDraft))
      setInternationalOpen(false)
    }
  }, [multiple, rows, masterName, masterCountry, readOnly])

  if (!hasPersistedEntity && !embedded) {
    return <EmptyPanel text="Banka bilgileri master kişi/kurum kaydı oluşunca girilebilir." />
  }

  if (!canView) {
    return <EmptyPanel text="Banka bilgilerini görüntüleme yetkiniz yok." />
  }

  function buildInitialDraft(markDefault: boolean) {
    return {
      ...emptyDraft,
      id: `tmp-${Date.now()}`,
      beneficiary_name: masterName,
      is_same_as_master_name: true,
      account_country: masterCountry,
      bank_country: masterCountry,
      preferred_currency: masterCountry === 'TR' ? 'TRY' : 'USD',
      is_default: markDefault,
    } as Partial<EntityBankAccount>
  }

  function startCreate() {
    const nextDraft = buildInitialDraft(rows.length === 0)
    setDraft(nextDraft)
    if (embedded) updateRows([...rows, nextDraft as EntityBankAccount])
    setIbanAutomationStatus('idle')
    setInternationalOpen(false)
    setMode('create')
  }

  function startEdit(row: EntityBankAccount, nextMode: 'view' | 'edit') {
    setDraft(row)
    setIbanAutomationStatus(getInitialIbanAutomationStatus(row))
    setInternationalOpen(false)
    setMode(nextMode)
  }

  async function save() {
    const payload = normalizeDraft(draft, masterName)
    if (!hasPersistedEntity) {
      updateRows(rows.map(row => row.id === draft.id ? { ...row, ...payload } as EntityBankAccount : row))
      setMode('list')
      return
    }
    const url = mode === 'create'
      ? `/api/entities/${entityKind}/${entityId}/bank-accounts`
      : `/api/entity-bank-accounts/${draft.id}`
    const method = mode === 'create' ? 'POST' : 'PATCH'
    await fetchJson(url, { method, body: JSON.stringify(payload) })
    setMode('list')
    await load()
  }

  async function mutateRow(row: EntityBankAccount, action: 'set-default' | 'passivate') {
    if (!hasPersistedEntity) {
      if (action === 'passivate') {
        updateRows(rows.map(item => item.id === row.id ? { ...item, status: 'passive' } : item))
      } else {
        updateRows(rows.map(item => ({ ...item, is_default: item.id === row.id })))
      }
      return
    }
    await fetchJson(`/api/entity-bank-accounts/${row.id}/${action}`, { method: 'POST' })
    await load()
  }

  async function parseIban(value: string) {
    const requestId = ibanParseRequestRef.current + 1
    ibanParseRequestRef.current = requestId
    const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    const optimisticValues = getProgressiveIbanValues(value)

    setDraft(prev => {
      const next = { ...prev, iban: value, ...optimisticValues }
      if (embedded && next.id) {
        updateRows(upsertEmbeddedBankRow(rows, next as EntityBankAccount))
      }
      return next
    })

    if (!clean) {
      setIbanAutomationStatus('idle')
      return
    }

    if (Object.keys(optimisticValues).length > 0) {
      setIbanAutomationStatus(clean.length >= 26 ? 'working' : 'done')
    } else {
      setIbanAutomationStatus(clean.length >= 26 ? 'working' : 'no_data')
    }

    if (!/^TR\d{2}[A-Z0-9]{22}$/.test(clean)) return

    const currentDraft = { ...draft, iban: value, ...optimisticValues }
    const payload = await fetchJson('/api/entity-bank-accounts/parse-iban', {
      method: 'POST',
      body: JSON.stringify({ iban: value, current: currentDraft }),
    }).catch(() => null)

    if (requestId !== ibanParseRequestRef.current) return

    if (payload?.data?.values) {
      setDraft(prev => {
        const next = { ...prev, ...payload.data.values }
        if (embedded && next.id) {
            updateRows(upsertEmbeddedBankRow(rows, next as EntityBankAccount))
        }
        return next
      })
      setIbanAutomationStatus(Object.keys(payload.data.values).length > 0 ? 'done' : 'no_data')
    } else {
      setIbanAutomationStatus(Object.keys(optimisticValues).length > 0 ? 'done' : 'no_data')
    }
  }

  if (!multiple) {
    return (
      <div className="space-y-4">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

        {loading ? <EmptyPanel text="Yükleniyor..." /> : (
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {primaryFields.map(field => renderField(field, draft, mode === 'view' || locked, updateDraft, parseIban, ibanAutomationStatus))}
            </div>

            {internationalFields.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setInternationalOpen(open => !open)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  <ChevronDown size={16} className={cn('transition-transform', internationalOpen && 'rotate-180')} />
                  Uluslararası Para Transferi
                </button>

                {internationalOpen && (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {internationalFields.map(field => renderField(field, draft, mode === 'view' || locked, updateDraft, parseIban, ibanAutomationStatus))}
                    {draft.has_intermediary_bank && (
                      <>
                        {renderField('intermediary_bank_name', draft, mode === 'view' || locked, updateDraft, parseIban, ibanAutomationStatus)}
                        {renderField('intermediary_swift_bic', draft, mode === 'view' || locked, updateDraft, parseIban, ibanAutomationStatus)}
                        {renderField('intermediary_bank_address', draft, mode === 'view' || locked, updateDraft, parseIban, ibanAutomationStatus)}
                        {renderField('intermediary_account_number', draft, mode === 'view' || locked, updateDraft, parseIban, ibanAutomationStatus)}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {mode !== 'view' && !readOnly && !embedded && (
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={save} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">Kaydet</button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!readOnly && canInsert && (
        <div className="flex justify-end">
          <button type="button" onClick={startCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus size={16} />
            Hesap Ekle
          </button>
        </div>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

      {mode === 'list' ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <div className="grid grid-cols-[80px_1.4fr_1.2fr_90px_1.4fr_100px_130px_90px_150px] gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
            {['Varsayılan', 'Hesap Sahibi', 'Banka', 'Ülke', 'IBAN / Hesap No', 'SWIFT / BIC', 'Para Birimi', 'Durum', 'İşlemler'].map(label => <span key={label}>{label}</span>)}
          </div>
          {loading ? <EmptyPanel text="Yükleniyor..." /> : rows.length === 0 ? <EmptyPanel text="Banka bilgisi eklenmedi." /> : rows.map(row => (
            <div key={row.id} className="grid grid-cols-[80px_1.4fr_1.2fr_90px_1.4fr_100px_130px_90px_150px] items-center gap-2 border-b border-gray-100 px-3 py-3 text-xs dark:border-gray-800">
              <span>{row.is_default ? <Star size={16} className="fill-amber-400 text-amber-500" /> : '-'}</span>
              <span className="truncate font-medium text-gray-900 dark:text-white">{row.beneficiary_name}</span>
              <span className="truncate">{row.bank_name || '-'}</span>
              <span>{countryOptionLabels[row.bank_country || row.account_country || ''] || row.bank_country || row.account_country || '-'}</span>
              <span className="truncate">{row.iban || row.account_number || '-'}</span>
              <span>{row.swift_bic || '-'}</span>
              <span>{row.preferred_currency || row.account_currency || '-'}</span>
              <span>{row.status === 'active' ? 'Aktif' : 'Pasif'}</span>
              <span className="flex items-center gap-1">
                <IconButton title="Görüntüle" onClick={() => startEdit(row, 'view')} icon={<Eye size={15} />} />
                {!readOnly && canEdit && <IconButton title="Düzenle" onClick={() => startEdit(row, 'edit')} icon={<Pencil size={15} />} />}
                {!readOnly && canSetDefault && !row.is_default && row.status === 'active' && <IconButton title="Varsayılan Yap" onClick={() => mutateRow(row, 'set-default')} icon={<CheckCircle2 size={15} />} />}
                {!readOnly && canPassivate && row.status === 'active' && <IconButton title="Pasifleştir" onClick={() => mutateRow(row, 'passivate')} icon={<Trash2 size={15} />} />}
                <IconButton title="Geçmiş" onClick={() => setHistoryRow(row)} icon={<History size={15} />} />
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex justify-end">
            <button type="button" onClick={() => setMode('list')} className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={16} /></button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {primaryFields.map(field => renderField(field, draft, mode === 'view' || locked, updateDraft, parseIban, ibanAutomationStatus))}
          </div>

          {internationalFields.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setInternationalOpen(open => !open)}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                <ChevronDown size={16} className={cn('transition-transform', internationalOpen && 'rotate-180')} />
                Uluslararası Para Transferi
              </button>

              {internationalOpen && (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {internationalFields.map(field => renderField(field, draft, mode === 'view' || locked, updateDraft, parseIban, ibanAutomationStatus))}
                  {draft.has_intermediary_bank && (
                    <>
                      {renderField('intermediary_bank_name', draft, mode === 'view' || locked, updateDraft, parseIban, ibanAutomationStatus)}
                      {renderField('intermediary_swift_bic', draft, mode === 'view' || locked, updateDraft, parseIban, ibanAutomationStatus)}
                      {renderField('intermediary_bank_address', draft, mode === 'view' || locked, updateDraft, parseIban, ibanAutomationStatus)}
                      {renderField('intermediary_account_number', draft, mode === 'view' || locked, updateDraft, parseIban, ibanAutomationStatus)}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {mode !== 'view' && !readOnly && (
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setMode('list')} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">İptal</button>
              {!embedded && <button type="button" onClick={save} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">Kaydet</button>}
            </div>
          )}
        </div>
      )}

      {historyRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-4 shadow-xl dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold">Geçmiş</h4>
              <button onClick={() => setHistoryRow(null)}><X size={18} /></button>
            </div>
            {(historyRow.history || []).length === 0 ? <p className="text-sm text-gray-500">Geçmiş kaydı yok.</p> : historyRow.history?.map((item, index) => (
              <div key={index} className="mb-2 rounded-lg bg-gray-50 p-2 text-xs dark:bg-gray-800">
                <div className="font-medium">{String(item.action || item.field || 'Değişiklik')}</div>
                <div className="text-gray-500">{String(item.old_value ?? '-')} → {String(item.new_value ?? '-')}</div>
                <div className="text-gray-400">{String(item.changed_at || '')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  function updateDraft(field: string, value: any) {
    setDraft(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'beneficiary_name' && masterName && value !== masterName) next.is_same_as_master_name = false
      if (embedded && next.id) {
        const hasRow = rows.some(row => row.id === next.id)
        updateRows(hasRow ? rows.map(row => row.id === next.id ? { ...row, ...next } : row) : [next as EntityBankAccount])
      }
      return next
    })
  }

  function updateRows(nextRows: EntityBankAccount[]) {
    setRows(nextRows)
    onChange?.(nextRows)
  }
}

function upsertEmbeddedBankRow(rows: EntityBankAccount[], next: EntityBankAccount) {
  if (!next.id) return rows
  const hasRow = rows.some(row => row.id === next.id)
  return hasRow ? rows.map(row => row.id === next.id ? { ...row, ...next } : row) : [next]
}

function renderField(field: string, draft: Partial<EntityBankAccount>, disabled: boolean, onChange: (field: string, value: any) => void, onIban: (value: string) => void, ibanAutomationStatus: IbanAutomationStatus) {
  const labels: Record<string, string> = {
    beneficiary_name: 'Hesap Sahibi Adı',
    is_same_as_master_name: 'Hesap sahibi master kayıt ile aynı mı?',
    beneficiary_name_note: 'Farklılık açıklaması',
    iban: 'IBAN',
    account_number: 'Hesap Numarası',
    account_country: 'Hesap Ülkesi',
    account_currency: 'Hesap Para Birimi',
    bank_name: 'Banka Adı',
    bank_country: 'Banka Ülkesi',
    bank_code: 'Banka Kodu',
    branch_name: 'Şube Adı',
    branch_code: 'Şube Kodu',
    swift_bic: 'SWIFT / BIC',
    bank_address: 'Banka Adresi',
    local_clearing_code_type: 'Yerel Banka Kodu Tipi',
    local_clearing_code: 'Yerel Banka Kodu',
    has_intermediary_bank: 'Aracı Banka Var mı?',
    preferred_currency: 'Para Birimi',
    payment_purpose: 'Ödeme Amacı / Purpose',
    swift_charge_type: 'SWIFT Masraf Tipi',
    payment_note: 'Ödeme Notu',
    verification_status: 'Doğrulama Durumu',
    document_reference_id: 'Belge Referansı',
  }
  const value = (draft as any)[field] ?? ''
  const common = formControlClass()

  if (field === 'is_same_as_master_name' || field === 'has_intermediary_bank') {
    return <label key={field} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!value} disabled={disabled} onChange={event => onChange(field, event.target.checked)} />{labels[field]}</label>
  }

  if (field === 'beneficiary_name_note' && draft.is_same_as_master_name !== false) return null

  if (field === 'local_clearing_code_type') return <Select key={field} label={labels[field]} value={value} disabled={disabled} options={['', ...localCodeTypeOptions]} onChange={next => onChange(field, next)} />
  if (field === 'account_country' || field === 'bank_country') return <Select key={field} label={labels[field]} value={value} disabled={disabled} options={['', ...COUNTRY_OPTIONS.map(option => option.value)]} optionLabels={countryOptionLabels} onChange={next => onChange(field, next)} />
  if (field === 'preferred_currency' || field === 'account_currency') return <Select key={field} label={labels[field]} value={value} disabled={disabled} options={['', ...currencyOptions]} onChange={next => onChange(field, next)} />
  if (field === 'swift_charge_type') return <Select key={field} label={labels[field]} value={value} disabled={disabled} options={['', ...swiftChargeOptions]} onChange={next => onChange(field, next)} />
  if (field === 'verification_status') return <Select key={field} label={labels[field]} value={value} disabled={disabled} options={Object.keys(VERIFICATION_STATUS_LABELS)} optionLabels={VERIFICATION_STATUS_LABELS} onChange={next => onChange(field, next)} />
  if (field === 'iban') {
    return (
      <label key={field} className="space-y-1">
        <span className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
          {labels[field]}
          <span data-tour-id="entity-bank-iban-automation">
            <AutomationBadge
              status={ibanAutomationStatus}
              title="IBAN girilince banka, şube ve para birimi alanları otomatik doldurulur."
              workingLabel="Çözülüyor"
            />
          </span>
        </span>
        <IBANInput
          value={String(value || '')}
          disabled={disabled}
          onChange={onIban}
        />
      </label>
    )
  }

  const wide = ['bank_address', 'payment_note', 'beneficiary_name_note', 'document_reference_id'].includes(field)
  return (
    <label key={field} className={cn("space-y-1", wide && "md:col-span-2")}>
      <span className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
        {labels[field] || field}
      </span>
      {wide ? (
        <textarea value={value} disabled={disabled} rows={2} onChange={event => onChange(field, event.target.value)} className={common} />
      ) : (
        <input value={value} disabled={disabled} onChange={event => field === 'iban' ? onIban(event.target.value) : onChange(field, event.target.value)} className={common} />
      )}
    </label>
  )
}

function Select({ label, value, options, optionLabels, disabled, onChange }: { label: string; value: any; options: string[]; optionLabels?: Record<string, string>; disabled: boolean; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      <select value={value || ''} disabled={disabled} onChange={event => onChange(event.target.value)} className={formControlClass({ surface: 'enum' })}>
        {options.map((option, index) => <option key={`${option || 'empty'}-${index}`} value={option}>{option ? optionLabels?.[option] || option : 'Seçiniz'}</option>)}
      </select>
    </label>
  )
}

function getOrderedFields(mode: BankAccountFormPriorityMode) {
  const commonTail = ['local_clearing_code_type', 'local_clearing_code', 'has_intermediary_bank', 'payment_purpose', 'swift_charge_type', 'payment_note', 'verification_status', 'document_reference_id']
  const identity = ['beneficiary_name', 'is_same_as_master_name', 'beneficiary_name_note']
  if (mode === 'international_priority') {
    return [...identity, 'account_number', 'iban', 'bank_name', 'bank_code', 'branch_name', 'branch_code', 'preferred_currency', 'swift_bic', 'bank_country', 'bank_address', 'account_country', 'account_currency', ...commonTail]
  }
  return [...identity, 'iban', 'bank_name', 'bank_code', 'branch_name', 'branch_code', 'account_number', 'preferred_currency', 'swift_bic', 'bank_country', 'bank_address', 'account_country', 'account_currency', ...commonTail]
}

function normalizeDraft(draft: Partial<EntityBankAccount>, masterName: string) {
  const payload = { ...draft }
  if (String(payload.id || '').startsWith('tmp-')) delete payload.id
  if (!payload.beneficiary_name) payload.beneficiary_name = masterName
  if (!payload.iban && !payload.account_number) throw new Error('IBAN veya Account Number alanlarından biri zorunludur.')
  return payload
}

async function fetchJson(url: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}) } })
  const payload = await response.json().catch(() => ({}))
  const method = String(init.method || 'GET').toUpperCase()
  if (!response.ok) {
    if (method === 'GET' && response.status === 404) return { data: [] }
    throw new Error(payload.error || 'İşlem başarısız')
  }
  return payload
}

function IconButton({ title, icon, onClick }: { title: string; icon: React.ReactNode; onClick: () => void }) {
  return <button type="button" title={title} onClick={onClick} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800">{icon}</button>
}

function EmptyPanel({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">{text}</div>
}

function getLocalPriorityMode(country?: string): BankAccountFormPriorityMode {
  if (!country) return 'unknown_country'
  return country === 'TR' || country.toLocaleLowerCase('tr-TR') === 'türkiye' ? 'tr_priority' : 'international_priority'
}

function getInitialIbanAutomationStatus(row: Partial<EntityBankAccount>): IbanAutomationStatus {
  if (!row.iban) return 'idle'
  return row.bank_name || row.bank_code || row.account_number ? 'done' : 'no_data'
}

function getProgressiveIbanValues(value: string): Partial<EntityBankAccount> {
  const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (!clean) return { bank_name: '', bank_code: '', branch_name: '', branch_code: '', account_number: '', swift_bic: '' }
  if (!clean.startsWith('TR')) return {}

  const values: Partial<EntityBankAccount> = {
    bank_name: '',
    bank_code: '',
    branch_name: '',
    branch_code: '',
    account_number: '',
    swift_bic: '',
  }
  if (/^TR\d{2}\d{5}/.test(clean)) {
    values.bank_code = clean.substring(4, 9)
    const bank = turkishBanksByCode[values.bank_code]
    if (bank) {
      values.bank_name = bank.bankName
      values.swift_bic = bank.swiftCode || values.swift_bic
      values.bank_country = 'TR'
      values.account_country = 'TR'
      values.preferred_currency = 'TRY'
      values.account_currency = 'TRY'
    }
  }
  if (clean.length >= 10) values.account_number = clean.substring(10, 26)

  const details = resolveTurkishIban(clean)
  if (details) {
    values.iban = details.iban
    values.bank_code = details.bankCode
    values.bank_name = details.bankName !== 'Bilinmeyen Banka' ? details.bankName : values.bank_name
    values.account_number = details.accountNo
    values.branch_code = details.branchCode || values.branch_code
    values.branch_name = details.branchName || values.branch_name
    values.swift_bic = details.swiftCode || values.swift_bic
    values.bank_country = 'TR'
    values.account_country = 'TR'
    values.preferred_currency = 'TRY'
    values.account_currency = 'TRY'
  }

  return Object.fromEntries(Object.entries(values).filter(([, item]) => item !== undefined && item !== null)) as Partial<EntityBankAccount>
}


function priorityModeLabel(mode: BankAccountFormPriorityMode) {
  if (mode === 'tr_priority') return 'Türkiye öncelikli'
  if (mode === 'international_priority') return 'Yabancı ülke öncelikli'
  return 'Ülke bilinmiyor'
}
