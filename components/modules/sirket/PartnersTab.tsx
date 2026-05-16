'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  Clock,
  Crown,
  Edit3,
  Eye,
  History,
  Search,
  User,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formControlClass } from '@/components/ui/formControlStyles'
import { isSoftDeletedRecord } from '@/lib/forms/entityState'
import { companyService } from '@/lib/services/companyService'
import { employeeService } from '@/lib/services/employeeService'

type OwnerKind = 'person' | 'organization'
type PartnerSourceType =
  | 'calisan'
  | 'mevcut_temsilci'
  | 'harici_kisi'
  | 'yeni_kisi'
  | 'cari'
  | 'paydas'
  | 'grup_sirketi'
  | 'harici_sirket'
  | 'yeni_sirket'
type PartnerStatus = 'Aktif' | 'Pasif' | 'Devredildi' | 'Askıda' | 'Tarihsel'
type ControlType = 'Hisse Çoğunluğu' | 'Oy Çoğunluğu' | 'Sözleşmesel Kontrol' | 'Yönetim Kontrolü' | 'Altın Hisse' | 'Diğer'

export interface CompanyPartner {
  id?: string
  temp_id?: string
  owner_kind: OwnerKind
  source_type: PartnerSourceType
  source_id: string
  display_name: string
  identity_number?: string
  share_class?: string
  share_units?: string | number
  nominal_value?: string | number
  capital_amount?: string | number
  share_ratio?: string | number
  voting_ratio?: string | number
  profit_ratio?: string | number
  beneficial_owner?: boolean
  is_beneficial_owner?: boolean
  beneficial_ratio?: string | number
  beneficial_note?: string
  is_ultimate_controller?: boolean
  has_representation_right?: boolean
  has_control_right?: boolean
  control_type?: ControlType | string
  has_board_nomination_right?: boolean
  has_veto_right?: boolean
  has_privileged_share?: boolean
  start_date: string
  end_date?: string
  status: PartnerStatus
  document_reference_id?: string
  notes?: string
  is_deleted?: boolean
  deleted_at?: string
  history?: PartnerHistoryEntry[]
}

interface PartnerHistoryEntry {
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
  country?: string
  status?: string
  kind: OwnerKind
}

interface PartnersTabProps {
  value?: CompanyPartner[]
  onChange: (value: CompanyPartner[]) => void
  readOnly?: boolean
  representatives?: Array<Record<string, any>>
  documents?: Array<Record<string, any>>
  currentCompanyId?: string
}

interface DraftState {
  editIndex: number | null
  owner_kind: OwnerKind | ''
  source_type: PartnerSourceType | ''
  source_id: string
  display_name: string
  identity_number: string
  start_date: string
  end_date: string
  status: PartnerStatus | ''
  share_class: string
  share_units: string
  nominal_value: string
  capital_amount: string
  share_ratio: string
  voting_ratio: string
  profit_ratio: string
  beneficial_owner: boolean
  beneficial_ratio: string
  beneficial_note: string
  is_ultimate_controller: boolean
  has_representation_right: boolean
  has_control_right: boolean
  control_type: ControlType | ''
  has_board_nomination_right: boolean
  has_veto_right: boolean
  has_privileged_share: boolean
  document_reference_id: string
  notes: string
}

interface TransferState {
  rowIndex: number
  target_source_id: string
  target_display_name: string
  transfer_date: string
  transfer_ratio: string
  document_reference_id: string
  notes: string
}

const SOURCE_OPTIONS: Record<OwnerKind, Array<{ value: PartnerSourceType; label: string }>> = {
  person: [
    { value: 'calisan', label: 'Çalışan' },
    { value: 'mevcut_temsilci', label: 'Mevcut Temsilci' },
    { value: 'harici_kisi', label: 'Harici Kişi' },
    { value: 'yeni_kisi', label: 'Yeni Kişi' },
  ],
  organization: [
    { value: 'cari', label: 'Cari' },
    { value: 'paydas', label: 'Paydaş' },
    { value: 'grup_sirketi', label: 'Grup Şirketi' },
    { value: 'harici_sirket', label: 'Harici Şirket' },
    { value: 'yeni_sirket', label: 'Yeni Şirket' },
  ],
}

const SHARE_CLASS_OPTIONS = ['Adi Pay', 'İmtiyazlı Pay', 'Nama Yazılı', 'Hamiline', 'Kurucu Payı', 'Yatırımcı Payı', 'Diğer']
const STATUS_OPTIONS: PartnerStatus[] = ['Aktif', 'Pasif', 'Devredildi', 'Askıda', 'Tarihsel']
const CONTROL_TYPE_OPTIONS: ControlType[] = ['Hisse Çoğunluğu', 'Oy Çoğunluğu', 'Sözleşmesel Kontrol', 'Yönetim Kontrolü', 'Altın Hisse', 'Diğer']

const emptyDraft: DraftState = {
  editIndex: null,
  owner_kind: '',
  source_type: '',
  source_id: '',
  display_name: '',
  identity_number: '',
  start_date: '',
  end_date: '',
  status: '',
  share_class: 'Adi Pay',
  share_units: '',
  nominal_value: '',
  capital_amount: '',
  share_ratio: '',
  voting_ratio: '',
  profit_ratio: '',
  beneficial_owner: false,
  beneficial_ratio: '',
  beneficial_note: '',
  is_ultimate_controller: false,
  has_representation_right: false,
  has_control_right: false,
  control_type: '',
  has_board_nomination_right: false,
  has_veto_right: false,
  has_privileged_share: false,
  document_reference_id: '',
  notes: '',
}

export function PartnersTab({ value, onChange, readOnly = false, representatives = [], documents = [], currentCompanyId }: PartnersTabProps) {
  const partners = Array.isArray(value) ? value : []
  const [employees, setEmployees] = useState<SourceRecord[]>([])
  const [companies, setCompanies] = useState<SourceRecord[]>([])
  const [draft, setDraft] = useState<DraftState>(emptyDraft)
  const [search, setSearch] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [historyRow, setHistoryRow] = useState<number | null>(null)
  const [transfer, setTransfer] = useState<TransferState | null>(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      employeeService.list({ status: 'active' }),
      companyService.list(),
    ]).then(([employeePayload, companyPayload]) => {
      if (cancelled) return

      setEmployees(Array.isArray(employeePayload?.data) ? employeePayload.data.map((employee: any) => ({
        id: employee.id,
        displayName: [employee.ad, employee.last_name].filter(Boolean).join(' '),
        identity: employee.national_id,
        role: employee.job_title || employee.kadro?.title || employee.birim?.ad,
        status: employee.work_status || 'Aktif',
        kind: 'person' as OwnerKind,
      })) : [])

      setCompanies(Array.isArray(companyPayload?.data) ? companyPayload.data
        .filter((company: any) => company.id !== currentCompanyId)
        .map((company: any) => ({
          id: company.id,
          displayName: company.trade_name || company.short_name,
          identity: company.tax_number,
          country: company.country || 'Türkiye',
          status: company.is_deleted ? 'Pasif' : 'Aktif',
          kind: 'organization' as OwnerKind,
        })) : [])
    }).catch(() => {
      if (!cancelled) {
        setEmployees([])
        setCompanies([])
      }
    })

    return () => {
      cancelled = true
    }
  }, [currentCompanyId])

  const representativeRecords = useMemo<SourceRecord[]>(() => representatives.map((representative: any) => ({
    id: representative.id || representative.source_id || representative.display_name,
    displayName: representative.display_name || representative.full_name || 'Temsilci',
    identity: representative.identity_number,
    role: (representative.authority_types || []).join(', '),
    status: representative.status || 'Aktif',
    kind: representative.person_kind === 'organization' ? 'organization' as OwnerKind : 'person' as OwnerKind,
  })), [representatives])

  const sourceRecords = useMemo(() => {
    if (draft.source_type === 'calisan') return employees
    if (draft.source_type === 'mevcut_temsilci') return representativeRecords.filter(record => record.kind === 'person')
    if (draft.source_type === 'grup_sirketi') return companies
    if (['yeni_kisi', 'harici_kisi'].includes(draft.source_type)) return buildManualRecord(draft, 'person')
    if (['yeni_sirket', 'harici_sirket'].includes(draft.source_type)) return buildManualRecord(draft, 'organization')
    return []
  }, [companies, draft, employees, representativeRecords])

  const filteredRecords = sourceRecords.filter(record => {
    const query = search.trim().toLocaleLowerCase('tr-TR')
    if (!query) return true
    return [record.displayName, record.identity, record.role, record.country, record.status]
      .filter(Boolean)
      .some(item => String(item).toLocaleLowerCase('tr-TR').includes(query))
  })

  const activeStep = getActiveStep(draft)
  const selectedRecord = sourceRecords.find(record => record.id === draft.source_id)
  const activePartners = partners.filter(row => !isSoftDeletedRecord(row))
  const totalShare = round(activePartners.reduce((sum, row) => sum + toNumber(row.share_ratio), 0))
  const controlPartner = activePartners.find(row => toNumber(row.share_ratio) > 50)
  const canSaveDraft = draft.owner_kind && draft.source_type && draft.source_id && draft.start_date && draft.status && hasOwnershipMetric(draft)

  const selectOwnerKind = (owner_kind: OwnerKind) => {
    setDraft(prev => ({ ...prev, owner_kind, source_type: '', source_id: '', display_name: '', identity_number: '' }))
    setSearch('')
    setErrors(prev => ({ ...prev, owner_kind: '' }))
  }

  const selectSourceType = (source_type: PartnerSourceType) => {
    setDraft(prev => ({ ...prev, source_type, source_id: '', display_name: '', identity_number: '' }))
    setSearch('')
    setErrors(prev => ({ ...prev, source_type: '' }))
  }

  const selectRecord = (record: SourceRecord) => {
    setDraft(prev => ({ ...prev, source_id: record.id, display_name: record.displayName, identity_number: record.identity || '' }))
    setErrors(prev => ({ ...prev, source_id: '' }))
  }

  const saveDraft = () => {
    const nextErrors: Record<string, string> = {}
    if (!draft.owner_kind) nextErrors.owner_kind = 'Zorunlu Alan'
    if (!draft.source_type) nextErrors.source_type = 'Zorunlu Alan'
    if (!draft.source_id) nextErrors.source_id = 'Zorunlu Alan'
    if (!draft.start_date) nextErrors.start_date = 'Zorunlu Alan'
    if (!draft.status) nextErrors.status = 'Zorunlu Alan'
    if (!hasOwnershipMetric(draft)) nextErrors.ownership_metric = 'Hisse Oranı, Sermaye Tutarı veya Pay Adedi alanlarından biri zorunlu'

    const duplicate = partners.some((row, index) =>
      index !== draft.editIndex &&
      !row.is_deleted &&
      row.status === 'Aktif' &&
      row.owner_kind === draft.owner_kind &&
      row.source_type === draft.source_type &&
      row.source_id === draft.source_id &&
      (row.share_class || 'Adi Pay') === (draft.share_class || 'Adi Pay')
    )

    if (duplicate) nextErrors.source_id = 'Aynı kaynak ve hisse türü için active ortak var'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const nextRow: CompanyPartner = {
      temp_id: draft.editIndex === null ? `partner-${Date.now()}` : partners[draft.editIndex]?.temp_id,
      id: draft.editIndex === null ? undefined : partners[draft.editIndex]?.id,
      owner_kind: draft.owner_kind as OwnerKind,
      source_type: draft.source_type as PartnerSourceType,
      source_id: draft.source_id,
      display_name: draft.display_name || selectedRecord?.displayName || '',
      identity_number: draft.identity_number || selectedRecord?.identity,
      share_class: draft.share_class || 'Adi Pay',
      share_units: draft.share_units || undefined,
      nominal_value: draft.nominal_value || undefined,
      capital_amount: draft.capital_amount || undefined,
      share_ratio: draft.share_ratio || undefined,
      voting_ratio: draft.voting_ratio || undefined,
      profit_ratio: draft.profit_ratio || undefined,
      beneficial_owner: draft.beneficial_owner,
      is_beneficial_owner: draft.beneficial_owner,
      beneficial_ratio: draft.beneficial_ratio || undefined,
      beneficial_note: draft.beneficial_note || undefined,
      is_ultimate_controller: draft.is_ultimate_controller,
      has_representation_right: draft.has_representation_right,
      has_control_right: draft.has_control_right,
      control_type: draft.control_type || undefined,
      has_board_nomination_right: draft.has_board_nomination_right,
      has_veto_right: draft.has_veto_right,
      has_privileged_share: draft.has_privileged_share,
      start_date: draft.start_date,
      end_date: draft.end_date || undefined,
      status: draft.status as PartnerStatus,
      document_reference_id: draft.document_reference_id || undefined,
      notes: draft.notes || undefined,
      history: draft.editIndex === null ? [] : buildHistory(partners[draft.editIndex], draft),
    }

    const nextRows = [...partners]
    if (draft.editIndex === null) nextRows.push(nextRow)
    else nextRows[draft.editIndex] = nextRow
    onChange(nextRows)
    setDraft(emptyDraft)
    setSearch('')
    setErrors({})
  }

  const editRow = (row: CompanyPartner, index: number) => {
    setDraft({
      ...emptyDraft,
      editIndex: index,
      owner_kind: row.owner_kind || '',
      source_type: row.source_type || '',
      source_id: row.source_id || '',
      display_name: row.display_name || '',
      identity_number: row.identity_number || '',
      start_date: row.start_date || '',
      end_date: row.end_date || '',
      status: row.status || '',
      share_class: row.share_class || 'Adi Pay',
      share_units: String(row.share_units || ''),
      nominal_value: String(row.nominal_value || ''),
      capital_amount: String(row.capital_amount || ''),
      share_ratio: String(row.share_ratio || ''),
      voting_ratio: String(row.voting_ratio || ''),
      profit_ratio: String(row.profit_ratio || ''),
      beneficial_owner: !!row.beneficial_owner,
      beneficial_ratio: String(row.beneficial_ratio || ''),
      beneficial_note: row.beneficial_note || '',
      is_ultimate_controller: !!row.is_ultimate_controller,
      has_representation_right: !!row.has_representation_right,
      has_control_right: !!row.has_control_right,
      control_type: (row.control_type as ControlType) || '',
      has_board_nomination_right: !!row.has_board_nomination_right,
      has_veto_right: !!row.has_veto_right,
      has_privileged_share: !!row.has_privileged_share,
      document_reference_id: row.document_reference_id || '',
      notes: row.notes || '',
    })
  }

  const deactivateRow = (index: number) => {
    const row = partners[index]
    if (!row) return
    const nextRows = [...partners]
    nextRows[index] = {
      ...row,
      status: 'Pasif',
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      history: appendHistory(row.history, 'status', row.status, 'Pasif'),
    }
    onChange(nextRows)
  }

  const completeTransfer = () => {
    if (!transfer) return
    const fromRow = partners[transfer.rowIndex]
    if (!fromRow) return
    const ratio = toNumber(transfer.transfer_ratio)
    const currentRatio = toNumber(fromRow.share_ratio)
    if (!transfer.target_source_id || !transfer.transfer_date || ratio <= 0 || ratio > currentRatio) return

    const target = sourceRecords.find(record => record.id === transfer.target_source_id)
    const remainingRatio = round(currentRatio - ratio)
    const nextRows = [...partners]
    nextRows[transfer.rowIndex] = {
      ...fromRow,
      share_ratio: remainingRatio,
      end_date: remainingRatio === 0 ? transfer.transfer_date : fromRow.end_date,
      status: remainingRatio === 0 ? 'Devredildi' : fromRow.status,
      history: appendHistory(fromRow.history, 'share_ratio', fromRow.share_ratio, remainingRatio),
    }
    nextRows.push({
      ...fromRow,
      id: undefined,
      temp_id: `partner-transfer-${Date.now()}`,
      source_id: transfer.target_source_id,
      display_name: transfer.target_display_name || target?.displayName || 'Devralan Ortak',
      identity_number: target?.identity,
      share_ratio: ratio,
      start_date: transfer.transfer_date,
      end_date: undefined,
      status: 'Aktif',
      document_reference_id: transfer.document_reference_id || undefined,
      notes: transfer.notes || undefined,
      history: [{
        field: 'owner',
        old_value: fromRow.display_name,
        new_value: transfer.target_display_name || target?.displayName || 'Devralan Ortak',
        changed_at: new Date().toISOString(),
        changed_by: 'Sistem Kullanıcısı',
      }],
    })
    onChange(nextRows)
    setTransfer(null)
  }

  return (
    <div className="col-span-2 space-y-5 lg:col-span-3">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
        <SummaryCard label="Toplam Hisse" value={`${totalShare}%`} tone={totalShare === 100 ? 'green' : 'amber'} />
        <SummaryCard label="Aktif Ortak Sayısı" value={activePartners.length} />
        <SummaryCard label="Gerçek Kişi Ortak Sayısı" value={activePartners.filter(row => row.owner_kind === 'person').length} />
        <SummaryCard label="Tüzel Kişi Ortak Sayısı" value={activePartners.filter(row => row.owner_kind === 'organization').length} />
        <SummaryCard label="Kontrol Ortağı" value={controlPartner?.display_name || '-'} tone={controlPartner ? 'blue' : 'default'} />
      </div>

      {activePartners.length > 0 && totalShare !== 100 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle size={16} />
          Aktif ortaklık toplamı 100% değcity.
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Ortak Ekleme Akışı</h4>
          {draft.editIndex !== null && !readOnly && (
            <button type="button" onClick={() => setDraft(emptyDraft)} className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
              Düzenlemeyi Kapat
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <StepCard title="Ortak Türü" step={1} active={activeStep >= 1} error={errors.owner_kind}>
            <SegmentedChoice
              readOnly={readOnly}
              value={draft.owner_kind}
              options={[
                { value: 'person', label: 'Gerçek Kişi', icon: User },
                { value: 'organization', label: 'Tüzel Kişi', icon: Building2 },
              ]}
              onChange={(value) => selectOwnerKind(value as OwnerKind)}
            />
          </StepCard>

          <StepCard title="Kaynak Türü" step={2} active={activeStep >= 2} error={errors.source_type}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {draft.owner_kind ? SOURCE_OPTIONS[draft.owner_kind as OwnerKind].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !readOnly && selectSourceType(option.value)}
                  disabled={readOnly || activeStep < 2}
                  className={choiceClass(draft.source_type === option.value, readOnly || activeStep < 2)}
                >
                  {option.label}
                </button>
              )) : <p className="text-xs text-gray-500">-</p>}
            </div>
          </StepCard>

          <StepCard title="Kayıt Seçimi" step={3} active={activeStep >= 3} error={errors.source_id}>
            {['yeni_kisi', 'harici_kisi', 'yeni_sirket', 'harici_sirket'].includes(draft.source_type) && (
              <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={draft.display_name}
                  onChange={event => setDraft(prev => ({ ...prev, display_name: event.target.value, source_id: event.target.value ? `manual-${event.target.value}` : '' }))}
                  disabled={readOnly}
                  placeholder={draft.owner_kind === 'organization' ? 'Ticari Ünvan' : 'Ad Soyad'}
                  className={inputClass(errors.source_id)}
                />
                <input
                  value={draft.identity_number}
                  onChange={event => setDraft(prev => ({ ...prev, identity_number: event.target.value }))}
                  disabled={readOnly}
                  placeholder={draft.owner_kind === 'organization' ? 'VKN' : 'TCKN'}
                  className={inputClass()}
                />
              </div>
            )}
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-2.5 text-gray-400" size={14} />
              <input value={search} onChange={event => setSearch(event.target.value)} disabled={readOnly || activeStep < 3} placeholder="Ad / ünvan ara" className={formControlClass({ className: 'pl-8' })} />
            </div>
            <div className="max-h-48 space-y-2 overflow-auto pr-1">
              {activeStep >= 3 && filteredRecords.length === 0 && <p className="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-500 dark:border-gray-700">Bu kaynak için kayıt bulunamadı.</p>}
              {filteredRecords.map(record => (
                <button key={record.id} type="button" onClick={() => !readOnly && selectRecord(record)} disabled={readOnly} className={cn(choiceClass(draft.source_id === record.id, readOnly), "block w-full text-left")}>
                  <span className="block text-sm font-medium">{record.displayName}</span>
                  <span className="text-xs text-gray-500">{[record.identity, record.role || record.country, record.status].filter(Boolean).join(' • ')}</span>
                </button>
              ))}
            </div>
          </StepCard>
        </div>

        {activeStep >= 4 && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Ortaklık Detayları</h4>
              {draft.source_type === 'calisan' && <Tag>Çalışan Ortak</Tag>}
              {draft.source_type === 'grup_sirketi' && <Tag>Grup İçi Ortaklık</Tag>}
              {toNumber(draft.share_ratio) > 50 && <Tag tone="blue">Kontrol Hissesi</Tag>}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Başlangıç Tarihi" error={errors.start_date}><input type="date" value={draft.start_date} onChange={event => setDraft(prev => ({ ...prev, start_date: event.target.value }))} disabled={readOnly} className={inputClass(errors.start_date)} /></Field>
              <Field label="Bitiş Tarihi"><input type="date" value={draft.end_date} onChange={event => setDraft(prev => ({ ...prev, end_date: event.target.value }))} disabled={readOnly} className={inputClass()} /></Field>
              <Field label="Durum" error={errors.status}><select value={draft.status} onChange={event => setDraft(prev => ({ ...prev, status: event.target.value as PartnerStatus }))} disabled={readOnly} className={inputClass(errors.status)}><option value="">Seçiniz</option>{STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}</select></Field>
              <Field label="Hisse Türü"><select value={draft.share_class} onChange={event => setDraft(prev => ({ ...prev, share_class: event.target.value }))} disabled={readOnly} className={inputClass()}>{SHARE_CLASS_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}</select></Field>
              <Field label="Pay Adedi" error={errors.ownership_metric}><input type="number" value={draft.share_units} onChange={event => setDraft(prev => ({ ...prev, share_units: event.target.value }))} disabled={readOnly} className={inputClass(errors.ownership_metric)} /></Field>
              <Field label="Nominal Değer"><input type="number" value={draft.nominal_value} onChange={event => setDraft(prev => ({ ...prev, nominal_value: event.target.value }))} disabled={readOnly} className={inputClass()} /></Field>
              <Field label="Sermaye Tutarı" error={errors.ownership_metric}><input type="number" value={draft.capital_amount} onChange={event => setDraft(prev => ({ ...prev, capital_amount: event.target.value }))} disabled={readOnly} className={inputClass(errors.ownership_metric)} /></Field>
              <Field label="Hisse Oranı (%)" error={errors.ownership_metric}><input type="number" min={0} max={100} value={draft.share_ratio} onChange={event => setDraft(prev => ({ ...prev, share_ratio: event.target.value }))} disabled={readOnly} className={inputClass(errors.ownership_metric)} /></Field>
              <Field label="Oy Hakkı (%)"><input type="number" min={0} max={100} value={draft.voting_ratio} onChange={event => setDraft(prev => ({ ...prev, voting_ratio: event.target.value }))} disabled={readOnly} className={inputClass()} /></Field>
              <Field label="Kar Payı Oranı (%)"><input type="number" min={0} max={100} value={draft.profit_ratio} onChange={event => setDraft(prev => ({ ...prev, profit_ratio: event.target.value }))} disabled={readOnly} className={inputClass()} /></Field>
              <CheckField label="Kontrol Hakkı Var mı?" checked={draft.has_control_right} onChange={value => setDraft(prev => ({ ...prev, has_control_right: value }))} readOnly={readOnly} />
              {draft.has_control_right && <Field label="Kontrol Türü"><select value={draft.control_type} onChange={event => setDraft(prev => ({ ...prev, control_type: event.target.value as ControlType }))} disabled={readOnly} className={inputClass()}><option value="">Seçiniz</option>{CONTROL_TYPE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}</select></Field>}
              <Field label="Belge Referansı"><select value={draft.document_reference_id} onChange={event => setDraft(prev => ({ ...prev, document_reference_id: event.target.value }))} disabled={readOnly} className={inputClass()}><option value="">Seçiniz</option>{documents.map((document: any) => <option key={document.id || document.slotId || document.name} value={document.id || document.slotId || document.name}>{document.slotTitle || document.title || document.name || document.slotId}</option>)}</select></Field>
              <CheckField label="Temsil Yetkisi Var mı?" checked={draft.has_representation_right} onChange={value => setDraft(prev => ({ ...prev, has_representation_right: value }))} readOnly={readOnly} />
              <CheckField label="Yönetim Kurulu Aday Hakkı Var mı?" checked={draft.has_board_nomination_right} onChange={value => setDraft(prev => ({ ...prev, has_board_nomination_right: value }))} readOnly={readOnly} />
              <CheckField label="Veto Hakkı Var mı?" checked={draft.has_veto_right} onChange={value => setDraft(prev => ({ ...prev, has_veto_right: value }))} readOnly={readOnly} />
              <CheckField label="İmtiyazlı Pay Var mı?" checked={draft.has_privileged_share} onChange={value => setDraft(prev => ({ ...prev, has_privileged_share: value }))} readOnly={readOnly} />
              <CheckField label="Nihai Faydalanıcı mı?" checked={draft.beneficial_owner} onChange={value => setDraft(prev => ({ ...prev, beneficial_owner: value }))} readOnly={readOnly} />
              {draft.beneficial_owner && <Field label="Nihai Faydalanma Oranı"><input type="number" min={0} max={100} value={draft.beneficial_ratio} onChange={event => setDraft(prev => ({ ...prev, beneficial_ratio: event.target.value }))} disabled={readOnly} className={inputClass()} /></Field>}
              {draft.beneficial_owner && <CheckField label="Nihai Hakim Ortak mı?" checked={draft.is_ultimate_controller} onChange={value => setDraft(prev => ({ ...prev, is_ultimate_controller: value }))} readOnly={readOnly} />}
              {draft.beneficial_owner && <Field label="Açıklama"><input value={draft.beneficial_note} onChange={event => setDraft(prev => ({ ...prev, beneficial_note: event.target.value }))} disabled={readOnly} className={inputClass()} /></Field>}
              <Field label="Notlar" wide><textarea value={draft.notes} onChange={event => setDraft(prev => ({ ...prev, notes: event.target.value }))} disabled={readOnly} rows={3} className={inputClass()} /></Field>
            </div>

            {!readOnly && (
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={saveDraft} disabled={!canSaveDraft} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <Users size={16} />
                  Ortağı Kaydet
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <PartnersSmartList
        partners={partners}
        readOnly={readOnly}
        historyRow={historyRow}
        setHistoryRow={setHistoryRow}
        editRow={editRow}
        deactivateRow={deactivateRow}
        startTransfer={(rowIndex) => setTransfer({ rowIndex, target_source_id: '', target_display_name: '', transfer_date: '', transfer_ratio: '', document_reference_id: '', notes: '' })}
      />

      {transfer && (
        <TransferModal
          transfer={transfer}
          setTransfer={setTransfer}
          fromRow={partners[transfer.rowIndex]}
          sourceRecords={sourceRecords}
          documents={documents}
          completeTransfer={completeTransfer}
        />
      )}
    </div>
  )
}

function PartnersSmartList({ partners, readOnly, historyRow, setHistoryRow, editRow, deactivateRow, startTransfer }: {
  partners: CompanyPartner[]
  readOnly: boolean
  historyRow: number | null
  setHistoryRow: (value: number | null) => void
  editRow: (row: CompanyPartner, index: number) => void
  deactivateRow: (index: number) => void
  startTransfer: (index: number) => void
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Mevcut Ortaklar</h4>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">{partners.length} kayıt</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
          <thead>
            <tr className="text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              <th className="px-3 py-2">Ad / Ünvan</th>
              <th className="px-3 py-2">Tür</th>
              <th className="px-3 py-2">Kaynak</th>
              <th className="px-3 py-2">Hisse %</th>
              <th className="px-3 py-2">Oy %</th>
              <th className="px-3 py-2">Kar Payı %</th>
              <th className="px-3 py-2">Kontrol</th>
              <th className="px-3 py-2">Nihai Faydalanıcı</th>
              <th className="px-3 py-2">Başlangıç</th>
              <th className="px-3 py-2">Bitiş</th>
              <th className="px-3 py-2">Durum</th>
              <th className="px-3 py-2">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {partners.length === 0 && <tr><td colSpan={12} className="px-3 py-8 text-center text-sm text-gray-500">Ortak kaydı eklenmedi.</td></tr>}
            {partners.map((row, index) => (
              <tr key={row.id || row.temp_id || index} className={cn(row.is_deleted && "bg-gray-50 text-gray-500 dark:bg-gray-800/40")}>
                <td className="min-w-56 px-3 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-gray-900 dark:text-white">{row.display_name}</span>
                    {toNumber(row.share_ratio) > 50 && <Tag tone="blue">Ana Ortak</Tag>}
                    {(row.has_control_right || toNumber(row.voting_ratio || row.share_ratio) > 50) && <Tag tone="blue">Kontrol Sahibi</Tag>}
                    {row.source_type === 'grup_sirketi' && <Tag>Grup İçi</Tag>}
                    {row.beneficial_owner && <Tag>Nihai Faydalanıcı</Tag>}
                    {row.has_privileged_share && <Tag>İmtiyazlı</Tag>}
                    {row.status === 'Tarihsel' && <Tag>Tarihsel</Tag>}
                  </div>
                </td>
                <td className="px-3 py-3">{getOwnerKindLabel(row.owner_kind)}</td>
                <td className="px-3 py-3">{getSourceLabel(row.source_type)}</td>
                <td className="px-3 py-3">{formatPercent(row.share_ratio)}</td>
                <td className="px-3 py-3">{formatPercent(row.voting_ratio)}</td>
                <td className="px-3 py-3">{formatPercent(row.profit_ratio)}</td>
                <td className="px-3 py-3">{row.has_control_right ? row.control_type || 'Var' : '-'}</td>
                <td className="px-3 py-3">{row.beneficial_owner || row.is_beneficial_owner ? formatPercent(row.beneficial_ratio || row.share_ratio) : '-'}</td>
                <td className="px-3 py-3">{formatDate(row.start_date)}</td>
                <td className="px-3 py-3">{formatDate(row.end_date) || '-'}</td>
                <td className="px-3 py-3"><StatusBadge status={row.is_deleted ? 'Pasif' : row.status} /></td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <button type="button" title="Görüntüle" onClick={() => editRow(row, index)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800"><Eye size={15} /></button>
                    {!readOnly && <button type="button" title="Düzenle" onClick={() => editRow(row, index)} className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"><Edit3 size={15} /></button>}
                    {!readOnly && !row.is_deleted && <button type="button" title="Pay Devri" onClick={() => startTransfer(index)} className="rounded-md p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40"><ArrowRightLeft size={15} /></button>}
                    {!readOnly && !row.is_deleted && <button type="button" title="Pasifleştir" onClick={() => deactivateRow(index)} className="rounded-md p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"><Clock size={15} /></button>}
                    <div className="relative">
                      <button type="button" title="Geçmiş" onClick={() => setHistoryRow(historyRow === index ? null : index)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800"><History size={15} /></button>
                      {historyRow === index && <HistoryPopover history={row.history || []} />}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TransferModal({ transfer, setTransfer, fromRow, sourceRecords, documents, completeTransfer }: {
  transfer: TransferState
  setTransfer: (value: TransferState | null) => void
  fromRow?: CompanyPartner
  sourceRecords: SourceRecord[]
  documents: Array<Record<string, any>>
  completeTransfer: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-base font-semibold text-gray-900 dark:text-white">Pay Devri</h4>
          <button type="button" onClick={() => setTransfer(null)} className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">Kapat</button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Devreden Ortak"><input value={fromRow?.display_name || ''} readOnly className={inputClass()} /></Field>
          <Field label="Devralan Ortak">
            <select value={transfer.target_source_id} onChange={event => {
              const target = sourceRecords.find(record => record.id === event.target.value)
              setTransfer({ ...transfer, target_source_id: event.target.value, target_display_name: target?.displayName || '' })
            }} className={inputClass()}>
              <option value="">Seçiniz</option>
              {sourceRecords.filter(record => record.id !== fromRow?.source_id).map(record => <option key={record.id} value={record.id}>{record.displayName}</option>)}
            </select>
          </Field>
          <Field label="Devir Tarihi"><input type="date" value={transfer.transfer_date} onChange={event => setTransfer({ ...transfer, transfer_date: event.target.value })} className={inputClass()} /></Field>
          <Field label="Devir Oranı"><input type="number" min={0} max={toNumber(fromRow?.share_ratio)} value={transfer.transfer_ratio} onChange={event => setTransfer({ ...transfer, transfer_ratio: event.target.value })} className={inputClass()} /></Field>
          <Field label="Belge Referansı"><select value={transfer.document_reference_id} onChange={event => setTransfer({ ...transfer, document_reference_id: event.target.value })} className={inputClass()}><option value="">Seçiniz</option>{documents.map((document: any) => <option key={document.id || document.slotId || document.name} value={document.id || document.slotId || document.name}>{document.slotTitle || document.title || document.name || document.slotId}</option>)}</select></Field>
          <Field label="Not" wide><textarea value={transfer.notes} onChange={event => setTransfer({ ...transfer, notes: event.target.value })} rows={3} className={inputClass()} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setTransfer(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">İptal</button>
          <button type="button" onClick={completeTransfer} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Pay Devri</button>
        </div>
      </div>
    </div>
  )
}

function StepCard({ title, step, active, error, children }: { title: string; step: number; active: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border p-3 transition-colors", active ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900" : "border-gray-200 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-800/40", error && "border-red-400 dark:border-red-700")}>
      <div className="mb-3 flex items-center gap-2">
        <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold", active ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500 dark:bg-gray-700")}>{step}</span>
        <div><h5 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h5>{error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}</div>
      </div>
      {children}
    </div>
  )
}

function SegmentedChoice({ value, options, onChange, readOnly }: { value: string; options: Array<{ value: string; label: string; icon: typeof User }>; onChange: (value: string) => void; readOnly?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(option => {
        const Icon = option.icon
        return <button key={option.value} type="button" onClick={() => onChange(option.value)} disabled={readOnly} className={choiceClass(value === option.value, readOnly)}><Icon size={14} />{option.label}</button>
      })}
    </div>
  )
}

function SummaryCard({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'green' | 'amber' | 'blue' }) {
  return (
    <div className={cn("rounded-lg border p-3", tone === 'green' && "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30", tone === 'amber' && "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30", tone === 'blue' && "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30", tone === 'default' && "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900")}>
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  )
}

function Field({ label, error, wide, children }: { label: string; error?: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={cn("space-y-1", wide && "md:col-span-2 xl:col-span-4")}><span className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>{children}{error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}</label>
}

function CheckField({ label, checked, onChange, readOnly }: { label: string; checked: boolean; onChange: (value: boolean) => void; readOnly?: boolean }) {
  return <label className="flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} disabled={readOnly} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />{label}</label>
}

function Tag({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'blue' }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", tone === 'green' ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300")}><Crown size={11} />{children}</span>
}

function StatusBadge({ status }: { status?: string }) {
  return <span className={cn("rounded-full px-2 py-1 text-xs font-medium", status === 'Aktif' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300")}>{status || '-'}</span>
}

function HistoryPopover({ history }: { history: PartnerHistoryEntry[] }) {
  return (
    <div className="absolute right-0 top-8 z-30 w-80 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-2 flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700"><History size={14} className="text-gray-500" /><span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Geçmiş</span></div>
      {history.length === 0 ? <p className="text-xs text-gray-500">Bu satır için geçmiş kaydı yok.</p> : <div className="max-h-64 space-y-2 overflow-auto">{history.map((entry, index) => <div key={`${entry.field}-${entry.changed_at}-${index}`} className="rounded-md bg-gray-50 p-2 text-xs dark:bg-gray-800"><div className="font-medium text-gray-700 dark:text-gray-200">{entry.field}</div><div className="mt-1 text-gray-500">{String(entry.old_value ?? '-')} → {String(entry.new_value ?? '-')}</div><div className="mt-1 text-gray-400">{formatDateTime(entry.changed_at)} · {entry.changed_by || 'Sistem Kullanıcısı'}</div></div>)}</div>}
    </div>
  )
}

function choiceClass(selected: boolean, disabled?: boolean) {
  return cn("inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors", selected ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300", disabled && "cursor-not-allowed opacity-60")
}

function inputClass(error?: string) {
  return formControlClass({ state: error ? 'invalid' : 'neutral' })
}

function buildManualRecord(draft: DraftState, kind: OwnerKind): SourceRecord[] {
  if (!draft.display_name) return []
  return [{ id: draft.source_id || `manual-${draft.display_name}`, displayName: draft.display_name, identity: draft.identity_number, status: 'Yeni', kind }]
}

function getActiveStep(draft: DraftState) {
  if (!draft.owner_kind) return 1
  if (!draft.source_type) return 2
  if (!draft.source_id) return 3
  return 4
}

function hasOwnershipMetric(draft: DraftState) {
  return !!(draft.share_ratio || draft.capital_amount || draft.share_units)
}

function toNumber(value: unknown) {
  const numeric = Number(value || 0)
  return Number.isFinite(numeric) ? numeric : 0
}

function round(value: number) {
  return Math.round(value * 100) / 100
}

function formatPercent(value: unknown) {
  return value === undefined || value === null || value === '' ? '-' : `${toNumber(value)}%`
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleDateString('tr-TR') : ''
}

function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString('tr-TR') : ''
}

function getOwnerKindLabel(value?: OwnerKind) {
  if (value === 'person') return 'Gerçek Kişi'
  if (value === 'organization') return 'Tüzel Kişi'
  return '-'
}

function getSourceLabel(value?: PartnerSourceType) {
  return SOURCE_OPTIONS.person.concat(SOURCE_OPTIONS.organization).find(option => option.value === value)?.label || '-'
}

function appendHistory(history: PartnerHistoryEntry[] = [], field: string, oldValue: unknown, newValue: unknown) {
  return [...history, { field, old_value: oldValue ?? '', new_value: newValue ?? '', changed_at: new Date().toISOString(), changed_by: 'Sistem Kullanıcısı' }]
}

function buildHistory(previous: CompanyPartner | undefined, draft: DraftState) {
  if (!previous) return []
  const entries: PartnerHistoryEntry[] = [...(previous.history || [])]
  const fields: Array<[string, unknown, unknown]> = [
    ['share_ratio', previous.share_ratio, draft.share_ratio],
    ['voting_ratio', previous.voting_ratio, draft.voting_ratio],
    ['profit_ratio', previous.profit_ratio, draft.profit_ratio],
    ['control_type', previous.control_type, draft.control_type],
    ['status', previous.status, draft.status],
    ['start_date', previous.start_date, draft.start_date],
    ['end_date', previous.end_date, draft.end_date],
    ['source_id', previous.source_id, draft.source_id],
  ]
  fields.forEach(([field, oldValue, newValue]) => {
    if (JSON.stringify(oldValue ?? '') === JSON.stringify(newValue ?? '')) return
    entries.push({ field, old_value: oldValue ?? '', new_value: newValue ?? '', changed_at: new Date().toISOString(), changed_by: 'Sistem Kullanıcısı' })
  })
  return entries
}
