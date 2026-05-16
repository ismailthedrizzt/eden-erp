'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  Clock,
  CreditCard,
  Eye,
  FileSignature,
  History,
  Landmark,
  PenLine,
  ReceiptText,
  Scale,
  Search,
  ShieldCheck,
  ShoppingCart,
  UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formControlClass } from '@/components/ui/formControlStyles'
import { isSoftDeletedRecord } from '@/lib/forms/entityState'
import { employeeService } from '@/lib/services/employeeService'

type AuthorityType =
  | 'signature_authority'
  | 'bank_authority'
  | 'gib_authority'
  | 'sgk_authority'
  | 'contract_authority'
  | 'purchase_approval_authority'
  | 'payment_approval_authority'
  | 'responsible_manager'
  | 'legal_representative'

type PersonKind = 'person' | 'organization'
type SourceType = 'calisan' | 'ortak' | 'yonetim_kurulu_uyesi' | 'dis_kisi' | 'cari' | 'paydas' | 'ortak_sirket'
type AuthorityStatus = 'Aktif' | 'Pasif' | 'Askıda' | 'Süresi Dolmuş'

export interface CompanyRepresentative {
  id?: string
  temp_id?: string
  authority_types: AuthorityType[]
  person_kind: PersonKind
  source_type: SourceType
  source_id: string
  display_name: string
  start_date: string
  end_date?: string
  status: AuthorityStatus
  document_reference_id?: string
  notes?: string
  bank_authority_level?: string
  transaction_limit?: string | number
  payment_approval_limit?: string | number
  purchase_approval_limit?: string | number
  currency?: string
  signature_type?: string
  signature_degree?: string
  requires_joint_signature?: boolean
  can_approve_alone?: boolean
  department_scope?: string
  gib_permissions?: string
  can_submit_declaration?: boolean
  can_process_e_invoice?: boolean
  sgk_permissions?: string
  can_submit_hiring_notice?: boolean
  can_submit_termination_notice?: boolean
  is_deleted?: boolean
  deleted_at?: string
  history?: RepresentativeHistoryEntry[]
}

interface RepresentativeHistoryEntry {
  field: string
  old_value: unknown
  new_value: unknown
  changed_at: string
  changed_by?: string
}

interface SourceRecord {
  id: string
  displayName: string
  identity?: string
  role?: string
  status?: string
  kind: PersonKind
}

interface RepresentativesTabProps {
  value?: CompanyRepresentative[]
  onChange: (value: CompanyRepresentative[]) => void
  readOnly?: boolean
  partners?: Array<Record<string, any>>
  documents?: Array<Record<string, any>>
}

interface DraftState {
  editIndex: number | null
  authority_types: AuthorityType[]
  person_kind: PersonKind | ''
  source_type: SourceType | ''
  source_id: string
  display_name: string
  start_date: string
  end_date: string
  status: AuthorityStatus | ''
  document_reference_id: string
  notes: string
  bank_authority_level: string
  transaction_limit: string
  payment_approval_limit: string
  purchase_approval_limit: string
  currency: string
  signature_type: string
  signature_degree: string
  requires_joint_signature: boolean
  can_approve_alone: boolean
  department_scope: string
  gib_permissions: string
  can_submit_declaration: boolean
  can_process_e_invoice: boolean
  sgk_permissions: string
  can_submit_hiring_notice: boolean
  can_submit_termination_notice: boolean
}

const AUTHORITY_OPTIONS: Array<{ value: AuthorityType; label: string; icon: typeof PenLine }> = [
  { value: 'signature_authority', label: 'İmza Yetkilisi', icon: PenLine },
  { value: 'bank_authority', label: 'Banka Yetkilisi', icon: Landmark },
  { value: 'gib_authority', label: 'GİB Yetkilisi', icon: ReceiptText },
  { value: 'sgk_authority', label: 'SGK Yetkilisi', icon: ShieldCheck },
  { value: 'contract_authority', label: 'Sözleşme Yetkilisi', icon: FileSignature },
  { value: 'purchase_approval_authority', label: 'Satınalma Onay Yetkilisi', icon: ShoppingCart },
  { value: 'payment_approval_authority', label: 'Ödeme Onay Yetkilisi', icon: CreditCard },
  { value: 'responsible_manager', label: 'Mesul Müdür', icon: UserCheck },
  { value: 'legal_representative', label: 'Kanuni Temsilci', icon: Scale },
]

const SOURCE_OPTIONS: Record<PersonKind, Array<{ value: SourceType; label: string; description: string }>> = {
  person: [
    { value: 'calisan', label: 'Çalışan', description: 'Çalışanlar tablosundan seçilir' },
    { value: 'ortak', label: 'Ortak', description: 'Gerçek kişi ortaklardan seçilir' },
    { value: 'yonetim_kurulu_uyesi', label: 'Yönetim Kurulu Üyesi', description: 'Yönetim kurulu kayıtları' },
    { value: 'dis_kisi', label: 'Dış Kişi', description: 'Harici kişi veya kontak' },
  ],
  organization: [
    { value: 'cari', label: 'Cari', description: 'Cari hesap kayıtları' },
    { value: 'paydas', label: 'Paydaş', description: 'Paydaş kayıtları' },
    { value: 'ortak_sirket', label: 'Ortak Şirket', description: 'Tüzel kişi ortaklardan seçilir' },
  ],
}

const STATUS_OPTIONS: AuthorityStatus[] = ['Aktif', 'Pasif', 'Askıda', 'Süresi Dolmuş']
const CURRENCY_OPTIONS = ['TRY', 'USD', 'EUR', 'GBP']

const emptyDraft: DraftState = {
  editIndex: null,
  authority_types: [],
  person_kind: '',
  source_type: '',
  source_id: '',
  display_name: '',
  start_date: '',
  end_date: '',
  status: '',
  document_reference_id: '',
  notes: '',
  bank_authority_level: '',
  transaction_limit: '',
  payment_approval_limit: '',
  purchase_approval_limit: '',
  currency: 'TRY',
  signature_type: '',
  signature_degree: '',
  requires_joint_signature: false,
  can_approve_alone: false,
  department_scope: '',
  gib_permissions: '',
  can_submit_declaration: false,
  can_process_e_invoice: false,
  sgk_permissions: '',
  can_submit_hiring_notice: false,
  can_submit_termination_notice: false,
}

export function RepresentativesTab({ value, onChange, readOnly = false, partners = [], documents = [] }: RepresentativesTabProps) {
  const representatives = Array.isArray(value) ? value : []
  const [employees, setEmployees] = useState<SourceRecord[]>([])
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<DraftState>(emptyDraft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [historyRow, setHistoryRow] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    employeeService.list({ status: 'active' })
      .then(payload => {
        if (cancelled || !Array.isArray(payload?.data)) return
        setEmployees(payload.data.map((employee: any) => ({
          id: employee.id,
          displayName: [employee.ad, employee.last_name].filter(Boolean).join(' '),
          identity: employee.national_id,
          role: employee.job_title || employee.kadro?.title || employee.birim?.ad,
          status: employee.work_status || 'Aktif',
          kind: 'person' as PersonKind,
        })))
      })
      .catch(() => setEmployees([]))

    return () => {
      cancelled = true
    }
  }, [])

  const partnerRecords = useMemo(() => partners.map((partner: any) => ({
    id: partner.id || partner.temp_id || partner.identity_tax_number || partner.partner_name,
    displayName: [partner.ad, partner.last_name].filter(Boolean).join(' ') || partner.partner_name || partner.display_name || 'Ortak',
    identity: partner.identity_tax_number,
    role: partner.share_ratio ? `Hisse: %${partner.share_ratio}` : 'Ortak',
    status: partner.signature_authority ? 'Yetkili' : 'Aktif',
    kind: partner.partner_type === 'sirket' ? 'organization' as PersonKind : 'person' as PersonKind,
  })), [partners])

  const sourceRecords = useMemo(() => {
    if (!draft.source_type) return []
    if (draft.source_type === 'calisan') return employees
    if (draft.source_type === 'ortak') return partnerRecords.filter(record => record.kind === 'person')
    if (draft.source_type === 'ortak_sirket') return partnerRecords.filter(record => record.kind === 'organization')
    return []
  }, [draft.source_type, employees, partnerRecords])

  const filteredRecords = sourceRecords.filter(record => {
    const query = search.trim().toLocaleLowerCase('tr-TR')
    if (!query) return true
    return [record.displayName, record.identity, record.role, record.status]
      .filter(Boolean)
      .some(item => String(item).toLocaleLowerCase('tr-TR').includes(query))
  })

  const activeStep = getActiveStep(draft)
  const selectedRecord = sourceRecords.find(record => record.id === draft.source_id)
  const canSaveDraft = draft.authority_types.length > 0 && draft.person_kind && draft.source_type && draft.source_id && draft.start_date && draft.status

  const toggleAuthority = (authority: AuthorityType) => {
    setDraft(prev => ({
      ...prev,
      authority_types: prev.authority_types.includes(authority)
        ? prev.authority_types.filter(item => item !== authority)
        : [...prev.authority_types, authority],
    }))
    setErrors(prev => ({ ...prev, authority_types: '' }))
  }

  const selectPersonKind = (person_kind: PersonKind) => {
    setDraft(prev => ({ ...prev, person_kind, source_type: '', source_id: '', display_name: '' }))
    setSearch('')
    setErrors(prev => ({ ...prev, person_kind: '' }))
  }

  const selectSourceType = (source_type: SourceType) => {
    setDraft(prev => ({ ...prev, source_type, source_id: '', display_name: '' }))
    setSearch('')
    setErrors(prev => ({ ...prev, source_type: '' }))
  }

  const selectRecord = (record: SourceRecord) => {
    setDraft(prev => ({ ...prev, source_id: record.id, display_name: record.displayName }))
    setErrors(prev => ({ ...prev, source_id: '' }))
  }

  const saveDraft = () => {
    const nextErrors: Record<string, string> = {}
    if (draft.authority_types.length === 0) nextErrors.authority_types = 'Zorunlu Alan'
    if (!draft.person_kind) nextErrors.person_kind = 'Zorunlu Alan'
    if (!draft.source_type) nextErrors.source_type = 'Zorunlu Alan'
    if (!draft.source_id) nextErrors.source_id = 'Zorunlu Alan'
    if (!draft.start_date) nextErrors.start_date = 'Zorunlu Alan'
    if (!draft.status) nextErrors.status = 'Zorunlu Alan'

    const duplicateAuthorities = representatives
      .filter((row, index) => index !== draft.editIndex)
      .filter(row => !isSoftDeletedRecord(row))
      .filter(row => row.source_type === draft.source_type && row.source_id === draft.source_id)
      .flatMap(row => row.authority_types || [])
      .filter(authority => draft.authority_types.includes(authority))

    if (duplicateAuthorities.length > 0) {
      nextErrors.authority_types = `Aktif temsilci tekrarı: ${duplicateAuthorities.map(getAuthorityLabel).join(', ')}`
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const nextRow: CompanyRepresentative = {
      temp_id: draft.editIndex === null ? `rep-${Date.now()}` : representatives[draft.editIndex]?.temp_id,
      id: draft.editIndex === null ? undefined : representatives[draft.editIndex]?.id,
      authority_types: draft.authority_types,
      person_kind: draft.person_kind as PersonKind,
      source_type: draft.source_type as SourceType,
      source_id: draft.source_id,
      display_name: draft.display_name || selectedRecord?.displayName || '',
      start_date: draft.start_date,
      end_date: draft.end_date || undefined,
      status: draft.status as AuthorityStatus,
      document_reference_id: draft.document_reference_id || undefined,
      notes: draft.notes || undefined,
      bank_authority_level: draft.bank_authority_level || undefined,
      transaction_limit: draft.transaction_limit || undefined,
      payment_approval_limit: draft.payment_approval_limit || undefined,
      purchase_approval_limit: draft.purchase_approval_limit || undefined,
      currency: draft.currency || 'TRY',
      signature_type: draft.signature_type || undefined,
      signature_degree: draft.signature_degree || undefined,
      requires_joint_signature: draft.requires_joint_signature,
      can_approve_alone: draft.can_approve_alone,
      department_scope: draft.department_scope || undefined,
      gib_permissions: draft.gib_permissions || undefined,
      can_submit_declaration: draft.can_submit_declaration,
      can_process_e_invoice: draft.can_process_e_invoice,
      sgk_permissions: draft.sgk_permissions || undefined,
      can_submit_hiring_notice: draft.can_submit_hiring_notice,
      can_submit_termination_notice: draft.can_submit_termination_notice,
      history: draft.editIndex === null
        ? []
        : buildHistory(representatives[draft.editIndex], draft),
    }

    const nextRows = [...representatives]
    if (draft.editIndex === null) nextRows.push(nextRow)
    else nextRows[draft.editIndex] = nextRow

    onChange(nextRows)
    setDraft(emptyDraft)
    setSearch('')
    setErrors({})
  }

  const editRow = (row: CompanyRepresentative, index: number) => {
    setDraft({
      ...emptyDraft,
      editIndex: index,
      authority_types: row.authority_types || [],
      person_kind: row.person_kind || '',
      source_type: row.source_type || '',
      source_id: row.source_id || '',
      display_name: row.display_name || '',
      start_date: row.start_date || '',
      end_date: row.end_date || '',
      status: row.status || '',
      document_reference_id: row.document_reference_id || '',
      notes: row.notes || '',
      bank_authority_level: row.bank_authority_level || '',
      transaction_limit: String(row.transaction_limit || ''),
      payment_approval_limit: String(row.payment_approval_limit || ''),
      purchase_approval_limit: String(row.purchase_approval_limit || ''),
      currency: row.currency || 'TRY',
      signature_type: row.signature_type || '',
      signature_degree: row.signature_degree || '',
      requires_joint_signature: !!row.requires_joint_signature,
      can_approve_alone: !!row.can_approve_alone,
      department_scope: row.department_scope || '',
      gib_permissions: row.gib_permissions || '',
      can_submit_declaration: !!row.can_submit_declaration,
      can_process_e_invoice: !!row.can_process_e_invoice,
      sgk_permissions: row.sgk_permissions || '',
      can_submit_hiring_notice: !!row.can_submit_hiring_notice,
      can_submit_termination_notice: !!row.can_submit_termination_notice,
    })
  }

  const deactivateRow = (index: number) => {
    const row = representatives[index]
    if (!row) return
    const nextRows = [...representatives]
    nextRows[index] = {
      ...row,
      status: 'Pasif',
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      history: [
        ...(row.history || []),
        {
          field: 'status',
          old_value: row.status,
          new_value: 'Pasif',
          changed_at: new Date().toISOString(),
          changed_by: 'Sistem Kullanıcısı',
        },
      ],
    }
    onChange(nextRows)
  }

  return (
    <div className="col-span-2 space-y-5 lg:col-span-3">
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Temsilci Ekleme Akışı</h4>
          </div>
          {draft.editIndex !== null && !readOnly && (
            <button
              type="button"
              onClick={() => setDraft(emptyDraft)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Düzenlemeyi Kapat
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <StepCard title="Yetki / Temsil Tipi" step={1} active={activeStep >= 1} error={errors.authority_types}>
            <div className="flex flex-wrap gap-2">
              {AUTHORITY_OPTIONS.map(option => {
                const Icon = option.icon
                const selected = draft.authority_types.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !readOnly && toggleAuthority(option.value)}
                    disabled={readOnly}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors",
                      selected
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300"
                        : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
                      readOnly && "cursor-not-allowed opacity-70"
                    )}
                  >
                    <Icon size={13} />
                    {option.label}
                  </button>
                )
              })}
            </div>
          </StepCard>

          <StepCard title="Kişi / Kurum Tipi" step={2} active={activeStep >= 2} error={errors.person_kind}>
            <SegmentedChoice
              readOnly={readOnly || activeStep < 2}
              value={draft.person_kind}
              options={[
                { value: 'person', label: 'Gerçek Kişi' },
                { value: 'organization', label: 'Tüzel Kişi' },
              ]}
              onChange={(value) => selectPersonKind(value as PersonKind)}
            />
          </StepCard>

          <StepCard title="Kaynak Türü" step={3} active={activeStep >= 3} error={errors.source_type}>
            <div className="space-y-2">
              {draft.person_kind ? SOURCE_OPTIONS[draft.person_kind as PersonKind].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !readOnly && selectSourceType(option.value)}
                  disabled={readOnly || activeStep < 3}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                    draft.source_type === option.value
                      ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40"
                      : "border-gray-200 bg-white hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900",
                    (readOnly || activeStep < 3) && "cursor-not-allowed opacity-60"
                  )}
                >
                  <span className="block text-sm font-medium text-gray-900 dark:text-white">{option.label}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{option.description}</span>
                </button>
              )) : (
                <p className="text-xs text-gray-500">Önce kişi / kurum tipi seçiniz.</p>
              )}
            </div>
          </StepCard>

          <StepCard title="Kayıt Seçimi" step={4} active={activeStep >= 4} error={errors.source_id}>
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 text-gray-400" size={14} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  disabled={readOnly || activeStep < 4}
                  placeholder="Ad / ünvan ara"
                  className={formControlClass({ className: 'pl-8' })}
                />
              </div>
              <div className="max-h-52 space-y-2 overflow-auto pr-1">
                {activeStep < 4 && <p className="text-xs text-gray-500">Önce kaynak türü seçiniz.</p>}
                {activeStep >= 4 && filteredRecords.length === 0 && (
                  <p className="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-500 dark:border-gray-700">
                    Bu kaynak için kayıt bulunamadı.
                  </p>
                )}
                {filteredRecords.map(record => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => !readOnly && selectRecord(record)}
                    disabled={readOnly}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                      draft.source_id === record.id
                        ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40"
                        : "border-gray-200 bg-white hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900",
                      readOnly && "cursor-not-allowed opacity-70"
                    )}
                  >
                    <span className="block text-sm font-medium text-gray-900 dark:text-white">{record.displayName}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {[record.identity, record.role, record.status].filter(Boolean).join(' • ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </StepCard>
        </div>

        {activeStep >= 5 && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
            <div className="mb-3 flex items-center gap-2">
              <BadgeCheck size={16} className="text-blue-600" />
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Yetki Detayları</h4>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Başlangıç Tarihi" error={errors.start_date}>
                <input
                  type="date"
                  value={draft.start_date}
                  onChange={(event) => setDraft(prev => ({ ...prev, start_date: event.target.value }))}
                  disabled={readOnly}
                  className={inputClass(errors.start_date)}
                />
              </Field>
              <Field label="Bitiş Tarihi">
                <input
                  type="date"
                  value={draft.end_date}
                  onChange={(event) => setDraft(prev => ({ ...prev, end_date: event.target.value }))}
                  disabled={readOnly}
                  className={inputClass()}
                />
              </Field>
              <Field label="Yetki Durumu" error={errors.status}>
                <select
                  value={draft.status}
                  onChange={(event) => setDraft(prev => ({ ...prev, status: event.target.value as AuthorityStatus }))}
                  disabled={readOnly}
                  className={inputClass(errors.status)}
                >
                  <option value="">Seçiniz</option>
                  {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </Field>
              <Field label="Belge Referansı">
                <select
                  value={draft.document_reference_id}
                  onChange={(event) => setDraft(prev => ({ ...prev, document_reference_id: event.target.value }))}
                  disabled={readOnly}
                  className={inputClass()}
                >
                  <option value="">Seçiniz</option>
                  {documents.map((document: any) => (
                    <option key={document.id || document.slotId || document.name} value={document.id || document.slotId || document.name}>
                      {document.slotTitle || document.title || document.name || document.slotId}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Yetki Açıklaması / Not" wide>
                <textarea
                  value={draft.notes}
                  onChange={(event) => setDraft(prev => ({ ...prev, notes: event.target.value }))}
                  disabled={readOnly}
                  rows={3}
                  className={inputClass()}
                />
              </Field>
            </div>

            <ConditionalFields draft={draft} setDraft={setDraft} readOnly={readOnly} />

            {!readOnly && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={!canSaveDraft}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <BriefcaseBusiness size={16} />
                  Temsilciyi Kaydet
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Mevcut Temsilciler</h4>
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {representatives.length} kayıt
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
            <thead>
              <tr className="text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                <th className="px-3 py-2">Yetki Tipleri</th>
                <th className="px-3 py-2">Kişi / Kurum Tipi</th>
                <th className="px-3 py-2">Kaynak Türü</th>
                <th className="px-3 py-2">Ad / Ünvan</th>
                <th className="px-3 py-2">Başlangıç Tarihi</th>
                <th className="px-3 py-2">Bitiş Tarihi</th>
                <th className="px-3 py-2">Durum</th>
                <th className="px-3 py-2">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {representatives.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-gray-500">
                    Temsilci kaydı eklenmedi.
                  </td>
                </tr>
              )}
              {representatives.map((row, index) => (
                <tr key={row.id || row.temp_id || index} className={cn(row.is_deleted && "bg-gray-50 text-gray-500 dark:bg-gray-800/40")}>
                  <td className="min-w-56 px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {(row.authority_types || []).map(authority => (
                        <AuthorityBadge key={authority} authority={authority} />
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3">{getPersonKindLabel(row.person_kind)}</td>
                  <td className="px-3 py-3">{getSourceTypeLabel(row.source_type)}</td>
                  <td className="px-3 py-3 font-medium text-gray-900 dark:text-white">{row.display_name}</td>
                  <td className="px-3 py-3">{formatDate(row.start_date)}</td>
                  <td className="px-3 py-3">{formatDate(row.end_date) || '-'}</td>
                  <td className="px-3 py-3">
                    <span className={cn(
                      "rounded-full px-2 py-1 text-xs font-medium",
                      !isSoftDeletedRecord(row)
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                    )}>
                      {row.is_deleted ? 'Pasif' : row.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button type="button" title="Görüntüle" onClick={() => editRow(row, index)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800">
                        <Eye size={15} />
                      </button>
                      {!readOnly && (
                        <button type="button" title="Düzenle" onClick={() => editRow(row, index)} className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40">
                          <PenLine size={15} />
                        </button>
                      )}
                      {!readOnly && !row.is_deleted && (
                        <button type="button" title="Pasifleştir" onClick={() => deactivateRow(index)} className="rounded-md p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40">
                          <Clock size={15} />
                        </button>
                      )}
                      <div className="relative">
                        <button type="button" title="Geçmiş" onClick={() => setHistoryRow(historyRow === index ? null : index)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800">
                          <History size={15} />
                        </button>
                        {historyRow === index && (
                          <HistoryPopover history={row.history || []} />
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StepCard({ title, step, active, error, children }: { title: string; step: number; active: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className={cn(
      "rounded-lg border p-3 transition-colors",
      active ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900" : "border-gray-200 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-800/40",
      error && "border-red-400 dark:border-red-700"
    )}>
      <div className="mb-3 flex items-center gap-2">
        <span className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
          active ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500 dark:bg-gray-700"
        )}>
          {step}
        </span>
        <div>
          <h5 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h5>
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function SegmentedChoice({ value, options, onChange, readOnly }: { value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void; readOnly?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          disabled={readOnly}
          className={cn(
            "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            value === option.value
              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
              : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300",
            readOnly && "cursor-not-allowed opacity-60"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function ConditionalFields({ draft, setDraft, readOnly }: { draft: DraftState; setDraft: React.Dispatch<React.SetStateAction<DraftState>>; readOnly?: boolean }) {
  const hasAuthority = (authority: AuthorityType) => draft.authority_types.includes(authority)

  if (draft.authority_types.length === 0) return null

  return (
    <div className="mt-4 space-y-4">
      {hasAuthority('bank_authority') && (
        <ConditionalSection title="Banka Yetkilisi">
          <Field label="Banka Yetki Seviyesi"><input value={draft.bank_authority_level} onChange={event => setDraft(prev => ({ ...prev, bank_authority_level: event.target.value }))} disabled={readOnly} className={inputClass()} /></Field>
          <Field label="İşlem Limiti"><input type="number" value={draft.transaction_limit} onChange={event => setDraft(prev => ({ ...prev, transaction_limit: event.target.value }))} disabled={readOnly} className={inputClass()} /></Field>
          <Field label="Para Birimi"><CurrencySelect value={draft.currency} onChange={value => setDraft(prev => ({ ...prev, currency: value }))} readOnly={readOnly} /></Field>
          <CheckField label="Müşterek İmza Gerekli mi?" checked={draft.requires_joint_signature} onChange={value => setDraft(prev => ({ ...prev, requires_joint_signature: value }))} readOnly={readOnly} />
        </ConditionalSection>
      )}

      {hasAuthority('payment_approval_authority') && (
        <ConditionalSection title="Ödeme Onay Yetkilisi">
          <Field label="Ödeme Onay Limiti"><input type="number" value={draft.payment_approval_limit} onChange={event => setDraft(prev => ({ ...prev, payment_approval_limit: event.target.value }))} disabled={readOnly} className={inputClass()} /></Field>
          <Field label="Para Birimi"><CurrencySelect value={draft.currency} onChange={value => setDraft(prev => ({ ...prev, currency: value }))} readOnly={readOnly} /></Field>
          <CheckField label="Tek Başına Onaylayabilir mi?" checked={draft.can_approve_alone} onChange={value => setDraft(prev => ({ ...prev, can_approve_alone: value }))} readOnly={readOnly} />
        </ConditionalSection>
      )}

      {hasAuthority('purchase_approval_authority') && (
        <ConditionalSection title="Satınalma Onay Yetkilisi">
          <Field label="Satınalma Onay Limiti"><input type="number" value={draft.purchase_approval_limit} onChange={event => setDraft(prev => ({ ...prev, purchase_approval_limit: event.target.value }))} disabled={readOnly} className={inputClass()} /></Field>
          <Field label="Para Birimi"><CurrencySelect value={draft.currency} onChange={value => setDraft(prev => ({ ...prev, currency: value }))} readOnly={readOnly} /></Field>
          <Field label="Departman / Birim Kapsamı"><input value={draft.department_scope} onChange={event => setDraft(prev => ({ ...prev, department_scope: event.target.value }))} disabled={readOnly} className={inputClass()} /></Field>
        </ConditionalSection>
      )}

      {hasAuthority('signature_authority') && (
        <ConditionalSection title="İmza Yetkilisi">
          <Field label="İmza Türü">
            <select value={draft.signature_type} onChange={event => setDraft(prev => ({ ...prev, signature_type: event.target.value }))} disabled={readOnly} className={inputClass()}>
              <option value="">Seçiniz</option>
              <option value="Münferit">Münferit</option>
              <option value="Müşterek">Müşterek</option>
              <option value="Sınırlı">Sınırlı</option>
              <option value="Süresiz">Süresiz</option>
            </select>
          </Field>
          <CheckField label="Münferit / Müşterek" checked={draft.requires_joint_signature} onChange={value => setDraft(prev => ({ ...prev, requires_joint_signature: value }))} readOnly={readOnly} />
          <Field label="İmza Derecesi"><input value={draft.signature_degree} onChange={event => setDraft(prev => ({ ...prev, signature_degree: event.target.value }))} disabled={readOnly} className={inputClass()} /></Field>
        </ConditionalSection>
      )}

      {hasAuthority('gib_authority') && (
        <ConditionalSection title="GİB Yetkilisi">
          <Field label="GİB İşlem Yetkileri"><input value={draft.gib_permissions} onChange={event => setDraft(prev => ({ ...prev, gib_permissions: event.target.value }))} disabled={readOnly} className={inputClass()} /></Field>
          <CheckField label="Beyanname Gönderme Yetkisi" checked={draft.can_submit_declaration} onChange={value => setDraft(prev => ({ ...prev, can_submit_declaration: value }))} readOnly={readOnly} />
          <CheckField label="E-Fatura İşlem Yetkisi" checked={draft.can_process_e_invoice} onChange={value => setDraft(prev => ({ ...prev, can_process_e_invoice: value }))} readOnly={readOnly} />
        </ConditionalSection>
      )}

      {hasAuthority('sgk_authority') && (
        <ConditionalSection title="SGK Yetkilisi">
          <Field label="SGK İşlem Yetkileri"><input value={draft.sgk_permissions} onChange={event => setDraft(prev => ({ ...prev, sgk_permissions: event.target.value }))} disabled={readOnly} className={inputClass()} /></Field>
          <CheckField label="İşe Giriş Bildirgesi Yetkisi" checked={draft.can_submit_hiring_notice} onChange={value => setDraft(prev => ({ ...prev, can_submit_hiring_notice: value }))} readOnly={readOnly} />
          <CheckField label="İşten Çıkış Bildirgesi Yetkisi" checked={draft.can_submit_termination_notice} onChange={value => setDraft(prev => ({ ...prev, can_submit_termination_notice: value }))} readOnly={readOnly} />
        </ConditionalSection>
      )}
    </div>
  )
}

function ConditionalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      <h5 className="mb-3 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{title}</h5>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
    </div>
  )
}

function Field({ label, error, wide, children }: { label: string; error?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={cn("space-y-1", wide && "md:col-span-2 xl:col-span-4")}>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
      {children}
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  )
}

function CheckField({ label, checked, onChange, readOnly }: { label: string; checked: boolean; onChange: (value: boolean) => void; readOnly?: boolean }) {
  return (
    <label className="flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        disabled={readOnly}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      {label}
    </label>
  )
}

function CurrencySelect({ value, onChange, readOnly }: { value: string; onChange: (value: string) => void; readOnly?: boolean }) {
  return (
    <select value={value} onChange={event => onChange(event.target.value)} disabled={readOnly} className={inputClass()}>
      {CURRENCY_OPTIONS.map(currency => <option key={currency} value={currency}>{currency}</option>)}
    </select>
  )
}

function AuthorityBadge({ authority }: { authority: AuthorityType }) {
  const option = AUTHORITY_OPTIONS.find(item => item.value === authority)
  const Icon = option?.icon || Banknote

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
      <Icon size={12} />
      {option?.label || authority}
    </span>
  )
}

function HistoryPopover({ history }: { history: RepresentativeHistoryEntry[] }) {
  return (
    <div className="absolute right-0 top-8 z-30 w-80 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-2 flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
        <History size={14} className="text-gray-500" />
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Geçmiş</span>
      </div>
      {history.length === 0 ? (
        <p className="text-xs text-gray-500">Bu satır için geçmiş kaydı yok.</p>
      ) : (
        <div className="max-h-64 space-y-2 overflow-auto">
          {history.map((entry, index) => (
            <div key={`${entry.field}-${entry.changed_at}-${index}`} className="rounded-md bg-gray-50 p-2 text-xs dark:bg-gray-800">
              <div className="font-medium text-gray-700 dark:text-gray-200">{entry.field}</div>
              <div className="mt-1 text-gray-500">
                {String(entry.old_value ?? '-')} → {String(entry.new_value ?? '-')}
              </div>
              <div className="mt-1 text-gray-400">
                {formatDateTime(entry.changed_at)} · {entry.changed_by || 'Sistem Kullanıcısı'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function inputClass(error?: string) {
  return formControlClass({ state: error ? 'invalid' : 'neutral' })
}

function getActiveStep(draft: DraftState) {
  if (!draft.authority_types.length) return 1
  if (!draft.person_kind) return 2
  if (!draft.source_type) return 3
  if (!draft.source_id) return 4
  return 5
}

function getAuthorityLabel(value: AuthorityType) {
  return AUTHORITY_OPTIONS.find(option => option.value === value)?.label || value
}

function getPersonKindLabel(value?: PersonKind) {
  if (value === 'person') return 'Gerçek Kişi'
  if (value === 'organization') return 'Tüzel Kişi'
  return '-'
}

function getSourceTypeLabel(value?: SourceType) {
  return SOURCE_OPTIONS.person.concat(SOURCE_OPTIONS.organization).find(option => option.value === value)?.label || '-'
}

function formatDate(value?: string) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('tr-TR')
}

function formatDateTime(value?: string) {
  if (!value) return ''
  return new Date(value).toLocaleString('tr-TR')
}

function buildHistory(previous: CompanyRepresentative | undefined, draft: DraftState) {
  if (!previous) return []

  const entries: RepresentativeHistoryEntry[] = [...(previous.history || [])]
  const fields: Array<[string, unknown, unknown]> = [
    ['authority_type', previous.authority_types, draft.authority_types],
    ['person_type', previous.person_kind, draft.person_kind],
    ['source_type', previous.source_type, draft.source_type],
    ['source_id', previous.source_id, draft.source_id],
    ['start_date', previous.start_date, draft.start_date],
    ['end_date', previous.end_date, draft.end_date],
    ['status', previous.status, draft.status],
    ['limits', {
      transaction_limit: previous.transaction_limit,
      payment_approval_limit: previous.payment_approval_limit,
      purchase_approval_limit: previous.purchase_approval_limit,
    }, {
      transaction_limit: draft.transaction_limit,
      payment_approval_limit: draft.payment_approval_limit,
      purchase_approval_limit: draft.purchase_approval_limit,
    }],
    ['notes', previous.notes, draft.notes],
  ]

  fields.forEach(([field, oldValue, newValue]) => {
    if (JSON.stringify(oldValue ?? '') === JSON.stringify(newValue ?? '')) return
    entries.push({
      field,
      old_value: oldValue ?? '',
      new_value: newValue ?? '',
      changed_at: new Date().toISOString(),
      changed_by: 'Sistem Kullanıcısı',
    })
  })

  return entries
}
