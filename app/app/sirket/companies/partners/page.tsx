'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, FileText, ListChecks, Users } from 'lucide-react'
import { EntityForm, FormField, FormMode, FormTab, type FormOperationAction, type FormOperationActionGroup, type FormOperationProgress } from '@/components/ui/EntityForm'
import { RecordLifecycleWizard, type RecordLifecycleWizardStep } from '@/components/ui/RecordLifecycleWizard'
import { PageBanner } from '@/components/ui/PageBanner'
import {
  DEFAULT_RECORD_STATUS_FILTERS,
  SmartDataTable,
  ColumnDef,
  SortConfig,
  WidgetDef,
  normalizeRecordStatusFilters,
  type RecordStatusFilterValue,
} from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { DraftCreateNotice } from '@/components/ui/DraftCreateNotice'
import { SmartEmptyState } from '@/components/ui/SmartEmptyState'
import { useRegisterActionGuideContext } from '@/components/ai/ActionGuideContext'
import { formControlClass } from '@/components/ui/formControlStyles'
import { cn } from '@/lib/utils'
import { normalizeCountryId } from '@/lib/reference/country-nationalities'
import { createRealPersonMasterTabs } from '@/lib/identity/realPersonFormSections'
import { createLegalEntityMasterTabs } from '@/lib/identity/legalEntityFormSections'
import { isSoftDeletedRecord } from '@/lib/forms/entityState'
import { createProgressiveFormLoadStages } from '@/lib/forms/progressiveFormLoading'
import { invalidateEntityDetailCache, readEntityDetailCache, writeEntityDetailCache } from '@/lib/forms/entityDetailCache'
import { companyService } from '@/lib/services/companyService'
import { buildOperationToast } from '@/lib/operations/operationClient'
import { ownershipTransactionsService } from '@/lib/modules/ownership-transactions/ownershipTransactions.service'
import { useModules } from '@/lib/security/moduleStore'
import { usePermissions } from '@/lib/security/permissionStore'
import { applyVisibilityToOperationGroups } from '@/lib/visibility/actionVisibility'
import {
  INITIAL_PARTNERSHIP_ENTRY_TYPE,
  getOwnershipTransactionTypeLabel,
  isInitialPartnershipEntryType,
  transactionTypes,
} from '@/lib/modules/ownership-transactions/ownershipTransactions.config'
import type { OwnershipTransactionType } from '@/lib/modules/ownership-transactions/ownershipTransactions.types'
import type { ListMeta } from '@/lib/api/listEndpoint'

type PageState = 'list' | 'create' | 'view' | 'edit'
type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }
type SaveError = Error & { toast?: ToastState; fieldErrors?: Record<string, string> }
type Option = { value: string; label: string }
type CompanyOption = Option & {
  trade_name?: string
  short_name?: string
  tax_number?: string
  record_status?: string
  company_status?: string
  is_deleted?: boolean
  committed_capital_amount?: number
  paid_capital_amount?: number
  default_currency?: string
}

interface PartnerRow {
  id: string
  company_id?: string
  company_name?: string
  owner_kind?: 'person' | 'organization'
  partner_type?: 'person' | 'organization' | 'company' | 'kisi' | 'sirket'
  display_name?: string
  partner_name?: string
  identity_number?: string
  identity_tax_number?: string
  share_ratio?: number
  voting_ratio?: number
  profit_ratio?: number
  source_type?: string
  source_id?: string
  share_units?: number
  nominal_value?: number
  capital_amount?: number
  has_control_right?: boolean
  control_type?: string
  has_board_nomination_right?: boolean
  has_veto_right?: boolean
  has_privileged_share?: boolean
  beneficial_owner?: boolean
  is_beneficial_owner?: boolean
  beneficial_ratio?: number
  is_ultimate_controller?: boolean
  start_date?: string
  end_date?: string
  status?: string
  record_status?: 'draft' | 'active' | 'passive'
  history?: Array<{ value: unknown; date: string; user?: string }>
  partner_profile?: Record<string, any>
  photo_logo?: Array<Record<string, any>>
  partner_documents?: Array<Record<string, any>>
  current_ownership?: CurrentOwnershipRow | null
  current_share_ratio?: number
  current_voting_ratio?: number
  current_profit_ratio?: number
  current_capital_amount?: number
  current_share_units?: number
  ownership_flags?: string[] | string
  last_ownership_transaction?: string
  ownership_warnings?: string[]
  representative_authority_count?: number
  representative_authorities?: RepresentativeAuthorityRow[]
  ownership_transaction_history?: OwnershipTransactionHistoryRow[]
  updated_at?: string
  version?: number
}

interface CurrentOwnershipRow {
  company_id: string
  partner_id: string
  current_share_ratio?: number
  current_voting_ratio?: number
  current_profit_ratio?: number
  current_capital_amount?: number
  current_share_units?: number
  has_control_right?: boolean
  control_type?: string
  has_veto_right?: boolean
  has_board_nomination_right?: boolean
  has_privileged_share?: boolean
  is_beneficial_owner?: boolean
  beneficial_ratio?: number
  warnings?: string[]
}

interface OwnershipTransactionHistoryRow {
  id: string
  company_id?: string
  transaction_no?: string
  transaction_type?: string
  transaction_date?: string
  effective_date?: string
  status?: string
  approval_status?: string
  from_partner_id?: string | null
  to_partner_id?: string | null
  affected_partner_id?: string | null
  share_ratio?: number | null
  voting_ratio?: number | null
  profit_ratio?: number | null
  capital_amount?: number | null
  committed_capital_amount?: number | null
  share_units?: number | null
  nominal_value?: number | null
  currency?: string | null
  has_control_right?: boolean
  control_type?: string | null
  has_veto_right?: boolean
  has_board_nomination_right?: boolean
  has_privileged_share?: boolean
  privilege_type?: string | null
  privilege_description?: string | null
  document_status?: string | null
  document_files?: Record<string, any>[] | null
  new_values?: Record<string, any> | string | null
  notes?: string | null
  description?: string | null
  created_at?: string
}

interface RepresentativeAuthorityRow {
  id: string
  company_id?: string
  person_id?: string | null
  organization_id?: string | null
  source_id?: string | null
  display_name?: string
  full_name?: string
  status?: string
  authority_types?: string[]
  job_title?: string
  signature_type?: string | null
  transaction_limit?: number | null
  currency?: string | null
  requires_joint_signature?: boolean
  can_approve_alone?: boolean
  start_date?: string
  end_date?: string | null
}

type PartnerHistorySectionsValue = {
  ownershipTransactions?: OwnershipTransactionHistoryRow[]
  technicalChanges?: any[]
}

const PARTNER_OWNERSHIP_ENTRY_ACTION_KEY = 'ownership_entry'

const AUTHORITY_LABEL_BY_VALUE: Record<string, string> = {
  signature_authority: 'İmza Yetkilisi',
  bank_authority: 'Banka Yetkilisi',
  gib_authority: 'GİB Yetkilisi',
  sgk_authority: 'SGK Yetkilisi',
  contract_authority: 'Sözleşme Yetkilisi',
  purchase_approval_authority: 'Satınalma Onay Yetkilisi',
  payment_approval_authority: 'Ödeme Onay Yetkilisi',
  responsible_manager: 'Mesul Müdür',
  legal_representative: 'Kanuni Temsilci',
}

function toAuthorityLabel(value?: string | null) {
  if (!value) return ''
  return AUTHORITY_LABEL_BY_VALUE[value] || value
}

const FIELD_LABELS: Record<string, string> = {
  company_id: 'Ortağı Olduğu Şirket',
  partner_type: 'Ortak Türü',
  first_name: 'Adı',
  last_name: 'Soyadı',
  gender: 'Cinsiyeti',
  identity_number: 'TCKN / VKN',
  trade_name: 'Ticari Unvan',
  tax_number: 'VKN',
  country: 'Ülke',
  mersis_number: 'MERSİS',
  trade_registry_no: 'Ticaret Sicil No',
  share_ratio: 'Pay Oranı',
  voting_ratio: 'Oy Hakkı',
  profit_ratio: 'Kar Payı',
  source_type: 'Kaynak Türü',
  source_id: 'Kayıt Seçimi',
  control_type: 'Kontrol Türü',
  start_date: 'Başlangıç Tarihi',
  status: 'Durum',
}

const PARTNER_LIFECYCLE_CONTROL = {
  category: 'lifecycle' as const,
  operations: ['İlk Ortaklık Girişi', 'Ortaklıktan Çıkış', 'Pay Devri'],
}

const PARTNER_OWNERSHIP_REGISTRATION_CONTROL = {
  category: 'registration' as const,
  operations: ['Pay Devri', 'Ortaklıktan Çıkış', 'Sermaye Artırımı', 'Düzeltme Kaydı'],
}

const columns: ColumnDef[] = [
  { key: 'record_status', label: 'Durum', type: 'enum', width: 44, minWidth: 44, maxWidth: 44, fixedWidth: true, sortable: false, hideHeaderLabel: true, category: 'Durum', order: -100, fixed: true, hideable: false, render: (_value, row) => <PartnerStatusDot status={getPartnerRecordStatus(row)} /> },
  { key: 'avatar', label: 'Avatar', type: 'avatar', width: 48, minWidth: 48, maxWidth: 48, fixedWidth: true, sortable: false, hideHeaderLabel: true, category: 'Kimlik', order: -90, fixed: true, hideable: false, imageFit: 'cover', imageShape: 'circle' },
  { key: 'display_name', label: 'Ortak Adı / Ünvanı', type: 'text', width: 280, sortable: true, category: 'Kimlik', render: (value, row) => <PartnerNameCell value={value} row={row} /> },
  { key: 'partner_type_label', label: 'Ortak Türü', type: 'enum', width: 130, category: 'Kimlik' },
  { key: 'company_name', label: 'Şirket', type: 'text', width: 220, category: 'Şirket' },
  { key: 'current_share_ratio', label: 'Hisse %', type: 'number', width: 110, category: 'Hesaplanan' },
  { key: 'current_voting_ratio', label: 'Oy %', type: 'number', width: 100, category: 'Hesaplanan' },
  { key: 'current_profit_ratio', label: 'Kar Payı %', type: 'number', width: 120, category: 'Hesaplanan' },
  { key: 'current_capital_amount', label: 'Sermaye', type: 'number', width: 130, category: 'Hesaplanan' },
  { key: 'current_share_units', label: 'Pay Adedi', type: 'number', width: 120, category: 'Hesaplanan' },
  { key: 'ownership_flags', label: 'İmtiyaz / Kontrol', type: 'enum', width: 150, category: 'Haklar', render: value => <OwnershipFlagsCell value={value} /> },
  { key: 'last_ownership_transaction', label: 'Son İşlem', type: 'text', width: 160, category: 'Geçmiş' },
  { key: 'start_date', label: 'Başlangıç', type: 'date', width: 120, category: 'Dönem' },
  { key: 'end_date', label: 'Bitiş', type: 'date', width: 120, category: 'Dönem' },
]

const heroFields: FormField[] = [
  { name: 'company_id', label: 'Ortağı Olduğu Şirket', type: 'select', required: true, searchable: true, controlledByOperation: PARTNER_LIFECYCLE_CONTROL },
  { name: 'first_name', label: 'Adı', type: 'text', required: true, visibleWhen: { field: 'partner_type', operator: 'equals', value: 'person' } },
  { name: 'last_name', label: 'Soyadı', type: 'text', required: true, visibleWhen: { field: 'partner_type', operator: 'equals', value: 'person' } },
  {
    name: 'nationality',
    label: 'Uyruğu',
    type: 'select',
    required: true,
    visibleWhen: { field: 'partner_type', operator: 'equals', value: 'person' },
    options: [
      { value: 'TR', label: 'Türkiye Cumhuriyeti' },
      { value: 'US', label: 'Amerika Birleşik Devletleri' },
      { value: 'DE', label: 'Almanya' },
      { value: 'GB', label: 'Birleşik Krallık' },
      { value: 'FR', label: 'Fransa' },
      { value: 'OTHER', label: 'Diğer' },
    ],
  },
  {
    name: 'gender',
    label: 'Cinsiyeti',
    type: 'select',
    required: true,
    visibleWhen: { field: 'partner_type', operator: 'equals', value: 'person' },
    options: [
      { value: 'male', label: 'Erkek' },
      { value: 'female', label: 'Kadın' },
    ],
  },
  { name: 'national_id', label: 'TC Kimlik No', type: 'text', maxLength: 11, visibleWhen: { field: 'partner_type', operator: 'equals', value: 'person' } },
  { name: 'passport_no', label: 'Pasaport No', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'person' } },
  { name: 'first_name', label: 'Ticari Unvan', type: 'text', required: true, visibleWhen: { field: 'partner_type', operator: 'equals', value: 'organization' } },
  { name: 'last_name', label: 'Kısa Unvan', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'organization' } },
  { name: 'identity_number', label: 'VKN', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'organization' } },
  { name: 'start_date', label: 'Başlangıç Tarihi', type: 'date', required: true, controlledByOperation: PARTNER_LIFECYCLE_CONTROL },
  {
    name: 'partner_status_summary',
    label: 'Durum Ozeti',
    type: 'custom',
    colSpan: 3,
    hideLabel: true,
    render: ({ data }: { data?: Record<string, any> }) => <PartnerStatusSummary partner={data} />,
  },
]

const tabs: FormTab[] = [
  {
    id: 'genel',
    label: 'Genel',
    fields: [
      { name: 'birth_date', label: 'Doğum Tarihi', type: 'date', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'person' } },
      { name: 'birth_place', label: 'Doğum Yeri', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'person' } },
      {
        name: 'gender',
        label: 'Cinsiyet',
        type: 'select',
        required: true,
        visibleWhen: { field: 'partner_type', operator: 'equals', value: 'person' },
        options: [
          { value: 'male', label: 'Erkek' },
          { value: 'female', label: 'Kadın' },
        ],
      },
      { name: 'occupation', label: 'Meslek', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'person' } },
      { name: 'marital_status', label: 'Medeni Durum', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'person' } },
      { name: 'foundation_date', label: 'Kuruluş Tarihi', type: 'date', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'organization' } },
      { name: 'company_type', label: 'Şirket Türü', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'organization' } },
      { name: 'mersis_number', label: 'MERSİS', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'organization' } },
      { name: 'trade_registry_no', label: 'Ticaret Sicil No', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'organization' } },
    ],
  },
  {
    id: 'iletisim',
    label: 'İletişim',
    fields: [
      {
        name: 'phones',
        label: 'Telefon',
        type: 'list',
        colSpan: 3,
        listConfig: {
          addLabel: 'Telefon Ekle',
          emptyText: 'Telefon eklenmedi.',
          fields: [
            { name: 'label', key: 'label', label: 'Etiket', type: 'text', placeholder: 'Cep, iş, ev' },
            { name: 'phone', key: 'phone', label: 'Telefon Numarası', type: 'tel', required: true, placeholder: '+90 5XX XXX XX XX' },
          ],
        },
      },
      {
        name: 'emails',
        label: 'E-posta',
        type: 'list',
        colSpan: 3,
        listConfig: {
          addLabel: 'E-posta Ekle',
          emptyText: 'E-posta eklenmedi.',
          fields: [
            { name: 'label', key: 'label', label: 'Etiket', type: 'text', placeholder: 'Kişisel, iş' },
            { name: 'address', key: 'address', label: 'E-posta Adresi', type: 'email', required: true },
          ],
        },
      },
      { name: 'address', label: 'Ev Adresi', type: 'textarea', colSpan: 2 },
      { name: 'city', label: 'İl', type: 'text', compact: true },
      { name: 'district', label: 'İlçe', type: 'text', compact: true },
      { name: 'acil_baslik', label: 'Acil Durumda Ulaşılacak Kişi', type: 'section', colSpan: 3 },
      { name: 'emergency_contact_first_name', label: 'Adı', type: 'text', requiredGroup: 'emergency_contact' },
      { name: 'emergency_contact_last_name', label: 'Soyadı', type: 'text', requiredGroup: 'emergency_contact' },
      { name: 'emergency_contact_relationship', label: 'Yakınlık Derecesi', type: 'text', requiredGroup: 'emergency_contact' },
      { name: 'emergency_contact_phone', label: 'Telefon Numarası', type: 'tel', requiredGroup: 'emergency_contact' },
    ],
  },
  {
    id: 'sermaye',
    label: 'Sermaye',
    fields: [
      {
        name: 'current_ownership',
        label: 'Onaylı İşlemlerden Hesaplanan Sermaye',
        type: 'custom',
        colSpan: 3,
        controlledByOperation: PARTNER_OWNERSHIP_REGISTRATION_CONTROL,
        render: ({ value }) => <CurrentOwnershipPanel value={value} section="capital" />,
      },
    ],
  },
  {
    id: 'yetkiler',
    label: 'Yetkiler',
    fields: [
      {
        name: 'current_ownership',
        label: 'Onaylı İşlemlerden Hesaplanan Yönetim Hakları',
        type: 'custom',
        colSpan: 3,
        controlledByOperation: PARTNER_OWNERSHIP_REGISTRATION_CONTROL,
        render: ({ value }) => <CurrentOwnershipPanel value={value} section="rights" />,
      },
      {
        name: 'representative_authorities',
        label: 'Temsilci / Kurul Kaynaklı Yetkiler',
        type: 'custom',
        colSpan: 3,
        render: ({ value }) => <RepresentativeAuthoritiesPanel value={Array.isArray(value) ? value : []} />,
      },
    ],
  },
  {
    id: 'vergi',
    label: 'Vergi',
    fields: [
      { name: 'tax_office', label: 'Vergi Dairesi', type: 'text', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'organization' } },
      { name: 'e_invoice_status', label: 'E-Fatura Durumu', type: 'checkbox', visibleWhen: { field: 'partner_type', operator: 'equals', value: 'organization' } },
    ],
  },
  {
    id: 'notes',
    label: 'Notlar',
    fields: [
      { name: 'notes', label: 'Notlar', type: 'textarea', colSpan: 3 },
    ],
  },
  {
    id: 'gecmis',
    label: 'Geçmiş',
    fields: [
      {
        name: 'history_sections',
        label: 'Geçmiş',
        type: 'custom',
        colSpan: 3,
        render: ({ value }) => <PartnerHistorySections value={value as PartnerHistorySectionsValue} />,
      },
    ],
  },
]

export default function OrtaklarPage() {
  const searchParams = useSearchParams()
  const pendingPartnerOpenRef = useRef<string | null>(null)
  const [pageState, setPageState] = useState<PageState>('list')
  const [partners, setPartners] = useState<PartnerRow[]>([])
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [currentOwnershipRows, setCurrentOwnershipRows] = useState<CurrentOwnershipRow[]>([])
  const [representatives] = useState<RepresentativeAuthorityRow[]>([])
  const [selectedPartner, setSelectedPartner] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [relationContextLoading, setRelationContextLoading] = useState(false)
  const [relationContextError, setRelationContextError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [statusFilters, setStatusFilters] = useState<RecordStatusFilterValue[]>(DEFAULT_RECORD_STATUS_FILTERS)
  const [listQuery, setListQuery] = useState({ page: 1, pageSize: 50, search: '', sort: 'created_at', direction: 'desc' as 'asc' | 'desc' })
  const [listMeta, setListMeta] = useState<ListMeta>({ page: 1, pageSize: 50, total: 0, totalPages: 1 })
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<ToastState | null>(null)
  const [ownershipNoticeOpen, setOwnershipNoticeOpen] = useState(false)
  const [ownershipWizardOpen, setOwnershipWizardOpen] = useState(false)
  const [ownershipWizardPartner, setOwnershipWizardPartner] = useState<Record<string, any> | null>(null)
  const [ownershipWizardInitialType, setOwnershipWizardInitialType] = useState<OwnershipTransactionType | null>(null)
  const [ownershipWizardReadOnly, setOwnershipWizardReadOnly] = useState(false)
  const [ownershipWizardSourceTransaction, setOwnershipWizardSourceTransaction] = useState<OwnershipTransactionHistoryRow | null>(null)

  const includePassive = statusFilters.includes('passive')
  const selectedRecordStatus = getPartnerRecordStatus(selectedPartner)
  const isSelectedPassive = selectedRecordStatus === 'passive'
  const modules = useModules()
  const permissions = usePermissions()
  const operationVisibilityContext = useMemo(() => ({
    currentPage: 'partners',
    moduleKey: 'partners',
    recordType: 'partner',
    recordId: selectedPartner?.id,
    recordStatus: selectedPartner ? selectedRecordStatus : undefined,
    companyId: selectedPartner?.company_id,
    permissions: Array.from(permissions.permissions),
    modules: modules.runtimeModules,
  }), [modules.runtimeModules, permissions.permissions, selectedPartner, selectedRecordStatus])
  useRegisterActionGuideContext({
    currentPage: 'partners',
    selectedRecordId: selectedPartner?.id || null,
    selectedRecordType: selectedPartner?.id ? 'partner' : null,
    selectedRecordStatus: selectedPartner ? selectedRecordStatus : null,
    activeCompanyId: selectedPartner?.company_id || null,
    context: {
      currentOwnershipAvailable: Boolean(selectedPartner?.current_ownership || selectedPartner?.current_share_ratio !== undefined),
      currentShareRatio: selectedPartner?.current_ownership?.current_share_ratio ?? selectedPartner?.current_share_ratio ?? null,
    },
  })
  const formMode: FormMode = pageState === 'create' ? 'create' : isSelectedPassive ? 'passive' : pageState === 'edit' ? 'edit' : 'view'
  const formLoadStages = createProgressiveFormLoadStages({
    mode: formMode,
    hasSnapshot: pageState !== 'create' && !!selectedPartner,
    detailLoading,
    detailError: !!formError,
    detailReady: pageState !== 'create' && !!selectedPartner && !detailLoading,
    hasMaster: !!(selectedPartner?.person_id || selectedPartner?.organization_id || selectedPartner?.master_record_id || selectedPartner?.master),
    referencesLoading: relationContextLoading,
    referencesReady: companies.length > 0 || currentOwnershipRows.length > 0,
    referencesError: relationContextError,
  })

  const loadRelationContext = useCallback(async (force = false) => {
    setRelationContextLoading(true)
    setRelationContextError(false)
    try {
      const companyPayload = await companyService.list({ statuses: ['active'], pageSize: 100, useCache: !force })

      const companyOptions: CompanyOption[] = Array.isArray(companyPayload.data) ? companyPayload.data.map((company: any) => ({
        value: company.id,
        label: formatCompanyOptionLabel(company),
        trade_name: company.trade_name,
        short_name: company.short_name,
        tax_number: company.tax_number,
        record_status: company.record_status,
        company_status: company.company_status,
        is_deleted: !!company.is_deleted,
        committed_capital_amount: Number(company.committed_capital_amount || 0),
        paid_capital_amount: Number(company.paid_capital_amount || 0),
        default_currency: company.default_currency || 'TRY',
      })) : []
      setCompanies(companyOptions)
    } catch (error) {
      setRelationContextError(true)
      throw error
    } finally {
      setRelationContextLoading(false)
    }
  }, [])

  const loadOwnershipContext = useCallback(async (force = false, companyIds?: string[]) => {
    const scopedCompanyIds = (companyIds?.length ? companyIds : companies.map(company => company.value)).filter(Boolean)
    if (!scopedCompanyIds.length) {
      setCurrentOwnershipRows([])
      return
    }

    const ownershipPayload = await companyService.currentOwnership(scopedCompanyIds, { useCache: !force })
    setCurrentOwnershipRows(Array.isArray(ownershipPayload.data) ? ownershipPayload.data : [])
  }, [companies])

  const loadData = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      if (force) companyService.invalidateRelations()
      const partnerPayload = await companyService.partnersList({ includePassive, statuses: statusFilters, useCache: !force, ...listQuery })

      setPartners(Array.isArray(partnerPayload.data) ? partnerPayload.data : [])
      setListMeta(partnerPayload.meta ?? { page: listQuery.page, pageSize: listQuery.pageSize, total: partnerPayload.data?.length ?? 0, totalPages: 1 })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [includePassive, listQuery, statusFilters])
  useEffect(() => {
    loadData()
  }, [loadData])

  const activeCompanyOptions = useMemo(() => companies.filter(isActiveCompanyForNewPartner), [companies])
  const companyNameById = useMemo(() => Object.fromEntries(companies.map(company => [company.value, company.label])), [companies])
  const currentOwnershipByCompanyPartnerKey = useMemo(() => Object.fromEntries(currentOwnershipRows.map(row => [ownershipKey(row.company_id, row.partner_id), row])), [currentOwnershipRows])
  const representativeAuthoritiesForPartner = useCallback((partner: Record<string, any> | null | undefined) => {
    if (!partner) return []
    if (Array.isArray(partner.representative_authorities)) return partner.representative_authorities
    const companyId = partner.company_id
    const personId = partner.person_id
    const organizationId = partner.organization_id
    const sourceId = partner.source_id || personId || organizationId
    const displayName = partner.display_name || partner.partner_name

    return representatives.filter(representative =>
      (!companyId || representative.company_id === companyId) &&
      !isSoftDeletedRecord(representative) &&
      (
        (personId && representative.person_id === personId) ||
        (organizationId && representative.organization_id === organizationId) ||
        (sourceId && representative.source_id === sourceId) ||
        (!!displayName && (representative.display_name === displayName || representative.full_name === displayName))
      )
    )
  }, [representatives])

  const tableData = useMemo(() => partners.map(partner => {
    const projectionOwnership: CurrentOwnershipRow | null = hasProjectionOwnership(partner)
      ? {
          company_id: partner.company_id || '',
          partner_id: partner.id,
          current_share_ratio: partner.current_share_ratio,
          current_voting_ratio: partner.current_voting_ratio,
          current_profit_ratio: partner.current_profit_ratio,
          current_capital_amount: partner.current_capital_amount,
          current_share_units: partner.current_share_units,
        }
      : null
    const currentOwnership = partner.current_ownership || projectionOwnership || currentOwnershipByCompanyPartnerKey[ownershipKey(partner.company_id, partner.id)]
    const representativeAuthorities = representativeAuthoritiesForPartner(partner)
    const partnerType = normalizePartnerType(partner.owner_kind || partner.partner_type)
    const transactionHistory = Array.isArray(partner.ownership_transaction_history) ? partner.ownership_transaction_history : []
    const lastOwnershipTransaction = transactionHistory[0]
    const enrichedPartner = { ...partner, current_ownership: currentOwnership || null }
    return ({
    ...partner,
    display_name: partner.display_name || partner.partner_name || '',
    avatar: getPartnerAvatarUrl(partner),
    identity_number: partner.identity_number || partner.identity_tax_number || '',
    partner_type_label: partnerType === 'organization' ? 'Tüzel Kişi' : 'Gerçek Kişi',
    company_name: partner.company_name || companyNameById[partner.company_id || ''] || '-',
    current_ownership: currentOwnership || null,
    current_share_ratio: currentOwnership?.current_share_ratio ?? partner.current_share_ratio ?? 0,
    current_voting_ratio: currentOwnership?.current_voting_ratio ?? partner.current_voting_ratio ?? 0,
    current_profit_ratio: currentOwnership?.current_profit_ratio ?? partner.current_profit_ratio ?? 0,
    current_capital_amount: currentOwnership?.current_capital_amount ?? partner.current_capital_amount ?? 0,
    current_share_units: currentOwnership?.current_share_units ?? partner.current_share_units ?? 0,
    ownership_flags: getPartnerOwnershipFlags(enrichedPartner),
    last_ownership_transaction: lastOwnershipTransaction?.transaction_type || partner.last_ownership_transaction || '-',
    ownership_warnings: buildPartnerOwnershipWarnings(enrichedPartner, transactionHistory),
    representative_authorities: representativeAuthorities,
  })
  }), [companyNameById, currentOwnershipByCompanyPartnerKey, partners, representativeAuthoritiesForPartner])

  const activePartners = useMemo(() => tableData.filter(partner => getPartnerRecordStatus(partner) === 'active'), [tableData])
  const draftPartners = useMemo(() => tableData.filter(partner => getPartnerRecordStatus(partner) === 'draft'), [tableData])
  const ownershipWarningCount = useMemo(() => tableData.filter(partner => Array.isArray(partner.ownership_warnings) && partner.ownership_warnings.length > 0).length, [tableData])
  const visibleShareTotal = useMemo(() => roundRatio(tableData.reduce((sum, partner) => sum + Number(partner.current_share_ratio || 0), 0)), [tableData])
  const privilegedOrControlCount = useMemo(() => tableData.filter(partner => {
    const flags = Array.isArray(partner.ownership_flags) ? partner.ownership_flags : []
    return flags.length > 0
  }).length, [tableData])
  const widgets: WidgetDef<any>[] = useMemo(() => [
    { key: 'total', label: 'Toplam Ortak', render: () => tableData.length },
    { key: 'active', label: 'Aktif Ortak', render: () => activePartners.length },
    { key: 'draft', label: 'Taslak Kart', render: () => draftPartners.length },
    { key: 'visible_share', label: 'Görünen Pay', render: () => formatPercent(visibleShareTotal) },
    { key: 'control', label: 'İmtiyaz / Kontrol', render: () => privilegedOrControlCount },
    { key: 'warnings', label: 'Uyarı', render: () => ownershipWarningCount },
  ], [activePartners, draftPartners, ownershipWarningCount, privilegedOrControlCount, tableData, visibleShareTotal])

  const handleListSortChange = (sorts: SortConfig[]) => {
    const sort = sorts[0]
    setListQuery(prev => ({ ...prev, page: 1, sort: sort?.key || 'created_at', direction: sort?.direction || 'desc' }))
  }

  const configuredHeroFields = heroFields.filter(field =>
    pageState !== 'create' || !['start_date', 'partner_status_summary'].includes(field.name)
  ).map(field => {
    if (field.name === 'company_id') {
      return {
        ...field,
        options: pageState === 'create' ? activeCompanyOptions : companies,
        remoteOptions: {
          endpoint: pageState === 'create'
            ? '/api/companies?statuses=active&pageSize=40'
            : '/api/companies?statuses=draft,active&pageSize=40',
          queryParam: 'ara',
          minQueryLength: 2,
          limit: 40,
        },
        placeholder: pageState === 'create' && activeCompanyOptions.length === 0
          ? 'Aktif şirket bulunamadı'
          : field.placeholder,
      }
    }
    return field
  })
  const configuredTabs = [
    ...createRealPersonMasterTabs({
      visibleWhen: { field: 'partner_type', operator: 'equals', value: 'person' },
      includeEmergencyContact: true,
    }),
    ...createLegalEntityMasterTabs({
      visibleWhen: { field: 'partner_type', operator: 'equals', value: 'organization' },
      websiteField: 'website',
    }),
    ...tabs.filter(tab => !['genel', 'iletisim'].includes(tab.id)).map(tab => ({
      ...tab,
      fields: tab.fields.map(field => field.name === 'current_ownership'
        ? {
            ...field,
            render: ({ value }: { value: any }) => (
              <CurrentOwnershipPanel
                value={value}
                section={tab.id === 'sermaye' ? 'capital' : 'rights'}
              />
            ),
          }
        : field),
    })),
  ]
  const withFieldHistory = (field: FormField) => {
    const history = selectedPartner?.field_history?.[field.name]
    return history ? { ...field, history } : field
  }

  const handleRowClick = async (row: any) => {
    const cached = readEntityDetailCache<Record<string, any>>('company-partners', row.id)
    setSelectedPartner(cached?.data || normalizePartnerForForm(row))
    setPageState('view')
    setFormError(null)
    setFieldErrors({})
    if (row.company_id) {
      void loadOwnershipContext(false, [row.company_id]).catch(() => undefined)
    }
    if (cached) {
      setDetailLoading(false)
      return
    }
    setDetailLoading(true)

    try {
      const [response, transactionHistory] = await Promise.all([
        companyService.partnerDetail(row.id),
        fetchApprovedOwnershipTransactionsForPartner(row),
      ])
      const result = response
      if (!result.data) throw new Error('Ortak detayı yüklenemedi')
      const normalized = normalizePartnerForForm({
        ...result.data,
        current_ownership: row.current_ownership,
        representative_authorities: row.representative_authorities,
        ownership_transaction_history: transactionHistory,
      })
      setSelectedPartner(normalized)
      writeEntityDetailCache('company-partners', row.id, normalized)
    } catch (err: any) {
      setFormError(err.message || 'Ortak detayı yüklenemedi')
      setToast(err.toast || { type: 'error', title: 'Detay Yüklenemedi', message: err.message || 'Ortak detayı yüklenemedi' })
    } finally {
      setDetailLoading(false)
    }
  }

  const handleFormTabChange = useCallback(async (tabId: string) => {
    const partnerId = selectedPartner?.id
    if (!partnerId) return

    if (tabId === 'yetkiler' && !selectedPartner.__authoritiesLoaded) {
      try {
        const result = await companyService.partnerDetailSection(partnerId, 'authorities')
        const next = normalizePartnerForForm({
          ...(selectedPartner as PartnerRow),
          ...(result.data || {}),
          __authoritiesLoaded: true,
        } as PartnerRow)
        setSelectedPartner(next)
        writeEntityDetailCache('company-partners', partnerId, next)
      } catch {
        setToast({ type: 'warning', title: 'Yetki Özeti Yüklenemedi', message: 'Temsilci yetkileri şu anda yüklenemedi.' })
      }
    }

    if (tabId === 'sermaye' && !selectedPartner.__ownershipLoaded) {
      try {
        const result = await companyService.partnerDetailSection(partnerId, 'ownership')
        const next = normalizePartnerForForm({
          ...(selectedPartner as PartnerRow),
          ...(result.data || {}),
          __ownershipLoaded: true,
        } as PartnerRow)
        setSelectedPartner(next)
        writeEntityDetailCache('company-partners', partnerId, next)
      } catch {
        setToast({ type: 'warning', title: 'Sermaye Özeti Yüklenemedi', message: 'Güncel ortaklık özeti şu anda yüklenemedi.' })
      }
    }
  }, [selectedPartner])

  useEffect(() => {
    const pendingPartnerId = searchParams.get('id')
    const pendingTransactionId = searchParams.get('transaction_id')
    const pendingOpenKey = pendingPartnerId ? `partner:${pendingPartnerId}` : pendingTransactionId ? `transaction:${pendingTransactionId}` : ''
    if (!pendingOpenKey || loading || pageState !== 'list' || pendingPartnerOpenRef.current === pendingOpenKey) return

    pendingPartnerOpenRef.current = pendingOpenKey
    void openPartnerFromNotification({ partnerId: pendingPartnerId, transactionId: pendingTransactionId })
  }, [loading, pageState, searchParams, tableData])

  const handleSave = async (data: Record<string, any>, mode: FormMode) => {
    setSaving(true)
    setFormError(null)
    setFieldErrors({})
    try {
      const payload = normalizePayload(data, activeCompanyOptions, mode)
      const validationPayload = mode === 'edit' && selectedPartner
        ? normalizePayload({ ...selectedPartner, ...payload }, activeCompanyOptions, mode)
        : payload
      const companySelectionError = mode === 'create' ? getPartnerCompanySelectionError(validationPayload, activeCompanyOptions) : null
      if (companySelectionError) throw companySelectionError
      const missingPartnerFields = getMissingPartnerFields(validationPayload)
      if (missingPartnerFields.length > 0) {
        const message = missingPartnerFields.map(field => FIELD_LABELS[field] || field).join(', ')
        const error = new Error(`Eksik Zorunlu Alan [${message}]`) as SaveError
        error.fieldErrors = Object.fromEntries(missingPartnerFields.map(field => [field, `${FIELD_LABELS[field] || field} zorunludur`]))
        error.toast = { type: 'warning', title: 'Eksik Zorunlu Alan', message }
        throw error
      }
      const updatePayload = mode === 'edit' && selectedPartner
        ? withPartnerConcurrency(payload, selectedPartner)
        : payload
      const result = mode === 'create'
        ? await companyService.createPartner(payload)
        : await companyService.updatePartner(selectedPartner?.id || '', updatePayload)
      const normalized = result.data ? normalizePartnerForForm(result.data) : null
      if (normalized) setSelectedPartner(normalized)
      setToast(buildOperationToast(result as any, {
        type: 'success',
        title: 'Kayıt Başarılı',
        message: mode === 'create' ? 'Ortak kaydı oluşturuldu' : 'Ortak bilgileri güncellendi',
      }))
      await loadData(true)
      if (mode === 'create') invalidateEntityDetailCache('company-partners')
      else invalidateEntityDetailCache('company-partners', selectedPartner?.id)
      setPageState(mode === 'create' && normalized ? 'view' : 'list')
    } catch (err: any) {
      const normalizedError = normalizePartnerSaveError(err)
      setFormError(normalizedError.message)
      setFieldErrors(normalizedError.fieldErrors || {})
      setToast(normalizedError.toast || { type: 'error', title: 'Kayıt Başarısız', message: normalizedError.message })
      throw normalizedError
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedPartner?.id) return
    setDeleting(true)
    try {
      await companyService.deletePartner(selectedPartner.id)
      invalidateEntityDetailCache('company-partners', selectedPartner.id)
      setToast({ type: 'success', title: 'Kayıt Başarılı', message: 'Ortak kartı taslağı kalıcı olarak silindi.' })
      await loadData(true)
      setPageState('list')
    } catch (err: any) {
      if (err?.code === 'PARTNER_DELETE_REQUIRES_OWNERSHIP_EXIT') {
        const message = 'Ortaklık hakkı veya işlem geçmişi olan kayıt doğrudan silinemez. Pay Devri veya Ortaklıktan Çıkış işlemini kullanın.'
        setToast({ type: 'warning', title: 'Ortaklık İşlemi Gerekli', message })
        return
      }
      setToast(err.toast || { type: 'error', title: 'Kayıt Başarısız', message: err.message })
      throw err
    } finally {
      setDeleting(false)
    }
  }

  function openOwnershipWizard(partner: Record<string, any>, transactionType?: OwnershipTransactionType) {
    if (!partner?.id) return
    const normalized = normalizePartnerForForm(partner as PartnerRow)
    const recordStatus = getPartnerRecordStatus(normalized)
    setOwnershipWizardReadOnly(false)
    setOwnershipWizardSourceTransaction(null)
    setSelectedPartner(prev => prev?.id === normalized.id ? prev : normalized)
    setOwnershipWizardPartner(normalized)
    setOwnershipWizardInitialType(transactionType || null)
    if (!companies.length) loadRelationContext(false).catch(() => undefined)
    if (normalized.company_id) loadOwnershipContext(false, [normalized.company_id]).catch(() => undefined)

    if (recordStatus === 'draft' && !isInitialPartnershipEntryType(transactionType)) {
      setOwnershipNoticeOpen(true)
      return
    }

    setOwnershipWizardOpen(true)
  }

  async function openCompletedInitialPartnershipViewer() {
    if (!selectedPartner?.id) return

    try {
      let sourcePartner = selectedPartner
      let transaction = findInitialPartnershipTransaction(sourcePartner)

      if (!transaction) {
        const transactionHistory = await fetchApprovedOwnershipTransactionsForPartner(sourcePartner)
        transaction = findInitialPartnershipTransaction({ ...sourcePartner, ownership_transaction_history: transactionHistory })
        if (transaction) {
          sourcePartner = { ...sourcePartner, ownership_transaction_history: transactionHistory }
          setSelectedPartner(sourcePartner)
          writeEntityDetailCache('company-partners', sourcePartner.id, sourcePartner)
        }
      }

      if (!transaction) {
        setToast({
          type: 'warning',
          title: 'İşlem Detayı Bulunamadı',
          message: 'Bu işlem tamamlanmış görünüyor ancak detay form kaydı bulunamadı.',
        })
        return
      }

      setOwnershipWizardReadOnly(true)
      setOwnershipWizardSourceTransaction(transaction)
      setOwnershipWizardPartner(sourcePartner)
      setOwnershipWizardInitialType(INITIAL_PARTNERSHIP_ENTRY_TYPE)
      setOwnershipWizardOpen(true)
    } catch (error: any) {
      setToast({
        type: 'warning',
        title: 'İşlem Detayı Açılamadı',
        message: error?.message || 'Bu işlem tamamlanmış görünüyor ancak detay form kaydı bulunamadı.',
      })
    }
  }

  async function openPartnerFromNotification({ partnerId, transactionId }: { partnerId?: string | null; transactionId?: string | null }) {
    try {
      let resolvedPartnerId = partnerId || ''

      if (!resolvedPartnerId && transactionId) {
        const transaction = await ownershipTransactionsService.get(transactionId)
        resolvedPartnerId = transaction.affected_partner_id
          || transaction.to_partner_id
          || transaction.from_partner_id
          || ''
      }

      if (!resolvedPartnerId) throw new Error('Bildirimle ilişkili ortak kaydı bulunamadı')

      const tableRow = tableData.find(partner => partner.id === resolvedPartnerId)
      if (tableRow) {
        await handleRowClick(tableRow)
        return
      }

      const result = await companyService.partnerDetail(resolvedPartnerId)
      if (!result.data) throw new Error('Ortak kaydı bulunamadı')
      await handleRowClick(normalizePartnerForForm(result.data))
    } catch (error: any) {
      pendingPartnerOpenRef.current = null
      setToast({
        type: 'error',
        title: 'Bildirim Açılamadı',
        message: error?.message || 'Bildirimdeki ortak formu açılamadı.',
      })
    }
  }

  const handleOwnershipActionClick = (transactionType?: OwnershipTransactionType) => {
    if (!selectedPartner?.id) return
    openOwnershipWizard(selectedPartner, transactionType)
  }

  const handleContinueOwnershipTransaction = (transactionType: string) => {
    handleOwnershipActionClick(transactionType as OwnershipTransactionType)
  }

  useEffect(() => {
    const onGuideCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ action_type?: string; wizard_key?: string }>).detail
      if (!detail) return
      if (detail.action_type === 'start_create') {
        setSelectedPartner(null)
        setPageState('create')
        if (!companies.length) loadRelationContext(false).catch(() => undefined)
        return
      }
      if (detail.action_type !== 'open_wizard' || !selectedPartner?.id) return
      if (detail.wizard_key === 'initial_partnership_entry') openOwnershipWizard(selectedPartner, INITIAL_PARTNERSHIP_ENTRY_TYPE)
      if (detail.wizard_key === 'share_transfer') openOwnershipWizard(selectedPartner, 'Pay Devri' as OwnershipTransactionType)
      if (detail.wizard_key === 'ownership_exit') openOwnershipWizard(selectedPartner, 'Ortaklıktan Çıkış' as OwnershipTransactionType)
      if (detail.wizard_key === 'partner_rights_change') openOwnershipWizard(selectedPartner, 'Oy Hakkı Değişikliği' as OwnershipTransactionType)
      if (detail.wizard_key === 'ownership_correction') openOwnershipWizard(selectedPartner, 'Düzeltme Kaydı' as OwnershipTransactionType)
    }

    window.addEventListener('eden:action-guide-command', onGuideCommand)
    return () => window.removeEventListener('eden:action-guide-command', onGuideCommand)
  })

  const handleCreateOwnershipTransaction = async (partner: Record<string, any>, payload: Record<string, any>) => {
    if (!partner?.id) return
    setSaving(true)
    try {
      const transactionResult = await ownershipTransactionsService.create(payload)

      ownershipTransactionsService.invalidateList()
      invalidateEntityDetailCache('company-partners', partner.id)
      setOwnershipWizardOpen(false)
      setOwnershipWizardPartner(null)
      setOwnershipWizardInitialType(null)
      setToast(buildOperationToast(transactionResult as any, {
        type: 'success',
        title: 'Ortaklık İşlemi Oluşturuldu',
        message: 'İşlem taslağı Ortaklarımız sayfasından oluşturuldu.',
      }))
      await loadData(true)
      setPageState('view')
    } catch (err: any) {
      setToast(err.toast || { type: 'error', title: 'Ortaklık İşlemi Başarısız', message: err.message })
      throw err
    } finally {
      setSaving(false)
    }
  }

  const getFormOperationActions = (): FormOperationActionGroup[] => {
    if (!selectedPartner?.id || pageState === 'create') return []
    const recordStatus = getPartnerRecordStatus(selectedPartner)
    const lifecycleProgress = getPartnerLifecycleOperationProgress(recordStatus)
    const completedLifecycleActions = new Set(lifecycleProgress.completedActionKeys || [])
    const initialPartnershipCompleted = completedLifecycleActions.has(PARTNER_OWNERSHIP_ENTRY_ACTION_KEY)
    const lifecycleActions: FormOperationAction[] = [{
      key: PARTNER_OWNERSHIP_ENTRY_ACTION_KEY,
      label: initialPartnershipCompleted ? 'İlk Ortaklık Girişini Görüntüle' : getOwnershipTransactionTypeLabel(INITIAL_PARTNERSHIP_ENTRY_TYPE),
      icon: <ListChecks size={15} />,
      onClick: () => {
        if (initialPartnershipCompleted) {
          void openCompletedInitialPartnershipViewer()
          return
        }
        handleOwnershipActionClick(INITIAL_PARTNERSHIP_ENTRY_TYPE)
      },
      disabled: !initialPartnershipCompleted && recordStatus !== 'draft',
      disabledReason: !initialPartnershipCompleted && recordStatus !== 'draft'
        ? 'İlk Ortaklık Girişi yalnızca taslak ortak kartı üzerinde başlatılır.'
        : undefined,
    }]
    const officialUpdateActions: FormOperationAction[] = recordStatus === 'active'
      ? transactionTypes.filter(type => !isInitialPartnershipEntryType(type)).map(transactionType => ({
          key: `ownership-${transactionType}`,
          label: getOwnershipTransactionTypeLabel(transactionType),
          icon: <ListChecks size={15} />,
          onClick: () => handleOwnershipActionClick(transactionType),
        }))
      : []
    const basicUpdateActions: FormOperationAction[] = pageState === 'view' && recordStatus !== 'passive'
      ? [{
          key: 'edit',
          label: 'Güncelle',
          onClick: () => setPageState('edit'),
        }]
      : []

    const groups: FormOperationActionGroup[] = [
      {
        key: 'lifecycle',
        progress: lifecycleProgress,
        actions: lifecycleActions,
      },
      ...(officialUpdateActions.length ? [{
        key: 'official_updates',
        actions: officialUpdateActions,
      }] : []),
      ...(basicUpdateActions.length ? [{
        key: 'basic_update',
        actions: basicUpdateActions,
      }] : []),
    ]
    return applyVisibilityToOperationGroups(groups, operationVisibilityContext)
  }

  const bannerConfig = pageState === 'list'
    ? {
        mode: 'list' as const,
        title: 'Ortaklarımız',
        subtitle: 'Şirket ortaklık ve pay kayıtlarını yönetin',
        onAddClick: () => {
          setSelectedPartner(null)
          setPageState('create')
          if (!companies.length) loadRelationContext(false).catch(() => undefined)
        },
        addButtonText: 'Ekle',
      }
    : {
        mode: 'form' as const,
        formMode,
        title: pageState === 'create' ? 'Yeni Ortak' : selectedPartner?.display_name || 'Ortak Detayı',
        subtitle: pageState === 'create' ? 'Yeni ortak kaydı oluştur' : pageState === 'edit' ? 'Ortak bilgilerini güncelle' : 'Ortak kayıt detayları',
        onBackClick: () => setPageState('list'),
      }

  return (
    <div className="relative">
      <PageBanner
        mode={bannerConfig.mode}
        {...(bannerConfig.mode === 'form' && { formMode: (bannerConfig as any).formMode })}
        title={bannerConfig.title}
        subtitle={bannerConfig.subtitle}
        icon={<Users size={24} />}
        {...(bannerConfig.mode === 'list'
          ? { onAddClick: (bannerConfig as any).onAddClick, addButtonText: (bannerConfig as any).addButtonText, addButtonTourId: 'quick-actions' }
          : { onBackClick: (bannerConfig as any).onBackClick }
        )}
      />

      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {pageState === 'list' && (
        <div className="mt-6 space-y-5">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          <SmartDataTable
            columns={columns}
            data={tableData}
            loading={loading}
            widgets={widgets}
            defaultView="list"
            storageKey="companies-partners-table"
            emptyText={
              <SmartEmptyState
                title="Henüz ortak kaydı yok"
                message="+ Ekle ile ortak kartı taslağı oluşturabilir, ardından İlk Ortaklık Girişi işlemiyle ortaklık haklarını tanımlayabilirsiniz."
              />
            }
            onRowClick={handleRowClick}
            onRefresh={() => loadData(true)}
            defaultPageSize={listQuery.pageSize}
            pagination={{
              mode: 'server',
              page: listMeta.page,
              pageSize: listMeta.pageSize,
              total: listMeta.total,
              onPageChange: page => setListQuery(prev => ({ ...prev, page })),
              onPageSizeChange: pageSize => setListQuery(prev => ({ ...prev, page: 1, pageSize })),
              onSearchChange: search => setListQuery(prev => ({ ...prev, page: 1, search })),
              onSortChange: handleListSortChange,
            }}
            showPassiveToggle
            activeStatusFilters={statusFilters}
            onStatusFiltersChange={(next) => {
              setStatusFilters(normalizeRecordStatusFilters(next))
              setListQuery(prev => ({ ...prev, page: 1 }))
            }}
          />
        </div>
      )}

      {pageState !== 'list' && (
        <div className="mt-6 space-y-4">
          {pageState === 'create' && (
            <DraftCreateNotice message="Bu işlem ortak kartı taslağı oluşturur. Ortaklık hakları, pay oranı, oy hakkı, kar payı ve sermaye bilgileri İlk Ortaklık Girişi veya ilgili ortaklık işlemleriyle oluşturulur." />
          )}
          <EntityForm
            mode={formMode}
            entityName="Ortaklarımız"
            entityNameSingular="Ortak"
            identityGate={{
              enabled: true,
              allowedEntityKinds: ['person', 'organization'],
              masterTable: 'both',
              uniqueFields: {
                person: ['nationality', 'national_id', 'passport_no'],
                organization: ['country', 'tax_number', 'registration_number'],
              },
              roleTable: 'company_partners',
              roleDuplicateCheck: 'company_id + person_id/organization_id',
            }}
            heroFields={configuredHeroFields.map(withFieldHistory)}
            tabs={configuredTabs.map(tab => ({ ...tab, fields: tab.fields.map(withFieldHistory) }))}
            roleHeroCardTitle="Ortaklık Bilgileri"
            showHeroHeader={false}
            showMasterSummaryBadge={false}
            masterSummaryTitle="Ortak Bilgileri"
            masterSummaryTitleAsField
            masterSummaryMode="entityIdentity"
            data={selectedPartner || undefined}
            saving={saving}
            deleting={deleting}
            error={formError}
            loadStages={formLoadStages}
            externalFieldErrors={fieldErrors}
            onSave={handleSave}
            onCancel={() => setPageState('list')}
            onDelete={selectedRecordStatus === 'draft' ? handleDelete : undefined}
            onActivate={undefined}
            onModeChange={(mode) => setPageState(mode)}
            onActiveTabChange={handleFormTabChange}
            operationActions={getFormOperationActions()}
            onIdentityGateOpenExistingRole={async (roleRecord) => {
              await handleRowClick(roleRecord as any)
              setPageState('edit')
            }}
            onIdentityGateCancelDuplicate={() => setPageState('list')}

            enableHistory
            imageSlot={{
              title: selectedPartner?.partner_type === 'organization' ? 'Logo' : 'Fotoğraf',
              dataField: 'photo_logo',
              slots: [
                { id: 'photo_logo', title: selectedPartner?.partner_type === 'organization' ? 'Logo' : 'Fotoğraf', required: false },
              ],
            }}
            documentSlot={{
              title: 'Ortak Profil Belgeleri',
              dataField: 'partner_documents',
              slots: [
                { id: 'kimlik_pasaport', title: 'Kimlik / Pasaport', required: false },
                { id: 'cv', title: 'CV', required: false },
                { id: 'imza_beyani', title: 'İmza Beyanı', required: false },
                { id: 'vergi_levhasi', title: 'Vergi Levhası', required: false },
                { id: 'ticaret_sicil', title: 'Ticaret Sicil Gazetesi', required: false },
                { id: 'diger', title: 'Diğer Belgeler', required: false },
              ],
              acceptedTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'],
              maxSizeMB: 20,
            }}
            onValidationError={(fields) => setToast({
              type: 'warning',
              title: 'Eksik Zorunlu Alan',
              message: fields.join(', '),
            })}
          />
        </div>
      )}

      {ownershipNoticeOpen && (
        <PartnerOwnershipNotice
          onCancel={() => setOwnershipNoticeOpen(false)}
          onConfirm={() => {
            setOwnershipNoticeOpen(false)
            setOwnershipWizardOpen(true)
          }}
        />
      )}

      {ownershipWizardOpen && (ownershipWizardPartner || selectedPartner) && (
        <PartnerOwnershipActionWizard
          partner={(ownershipWizardPartner || selectedPartner) as Record<string, any>}
          companies={companies}
          partners={tableData}
          ownershipRows={currentOwnershipRows}
          initialTransactionType={ownershipWizardInitialType}
          recordStatus={getPartnerRecordStatus(ownershipWizardPartner || selectedPartner)}
          saving={saving}
          onClose={() => {
            setOwnershipWizardOpen(false)
            setOwnershipWizardPartner(null)
            setOwnershipWizardInitialType(null)
            setOwnershipWizardReadOnly(false)
            setOwnershipWizardSourceTransaction(null)
          }}
          readOnly={ownershipWizardReadOnly}
          sourceTransaction={ownershipWizardSourceTransaction}
          onSubmit={handleCreateOwnershipTransaction}
        />
      )}
    </div>
  )
}

function PartnerOwnershipNotice({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-lg border border-amber-200 bg-white p-5 shadow-xl dark:border-amber-900 dark:bg-gray-950">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Taslak Ortaklık Uyarısı</h3>
        <p className="mt-3 text-sm leading-6 text-gray-700 dark:text-gray-200">
          Bu ortak henüz taslak durumdadır. Taslak ortak, yalnızca şirkette tahsis edilmemiş pay/sermaye varsa doğrudan ortaklığa alınabilir. Şirket paylarının tamamı dağıtılmışsa yeni ortak girişi sermaye artırımı veya pay devri işlemiyle yapılmalıdır.
          <span className="hidden">
          Taslak ortaklara ortaklık ancak Hisse Payında boşluk olan şirketlere ortak atamakta kullanılabilir. Hisse payı halihazırda ortaklara dağıtılmış şirketlerdeki pay değişiklikleri Hissesini devreden ortak üzerinden yapmanız gerekmektedir.
          </span>
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">
            Vazgeç
          </button>
          <button type="button" onClick={onConfirm} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Devam Et
          </button>
        </div>
      </div>
    </div>
  )
}

type PartnerOwnershipActionWizardProps = {
  partner: Record<string, any>
  companies: CompanyOption[]
  partners: Record<string, any>[]
  ownershipRows: CurrentOwnershipRow[]
  initialTransactionType?: OwnershipTransactionType | null
  recordStatus: 'draft' | 'active' | 'passive'
  saving: boolean
  readOnly?: boolean
  sourceTransaction?: OwnershipTransactionHistoryRow | null
  onClose: () => void
  onSubmit: (partner: Record<string, any>, payload: Record<string, any>) => Promise<void>
}

function PartnerOwnershipActionWizard(props: PartnerOwnershipActionWizardProps) {
  if (props.readOnly && isInitialPartnershipEntryType(String(props.initialTransactionType || ''))) {
    return <InitialPartnershipEntryWizard {...props} />
  }

  if (props.recordStatus !== 'active') {
    return <InitialPartnershipEntryWizard {...props} />
  }

  return <ActiveOwnershipTransactionWizard {...props} />
}

function ActiveOwnershipTransactionWizard({
  partner,
  companies,
  partners,
  initialTransactionType,
  saving,
  onClose,
  onSubmit,
}: PartnerOwnershipActionWizardProps) {
  const [form, setForm] = useState({
    company_id: partner.company_id || partner.company_id || '',
    start_date: new Date().toISOString().slice(0, 10),
    share_ratio: '',
    voting_ratio: '',
    profit_ratio: '',
    share_units: '',
    capital_amount: '',
    to_partner_id: '',
    document_reference_id: '',
    notes: '',
    transaction_type: initialTransactionType && !isInitialPartnershipEntryType(initialTransactionType)
      ? initialTransactionType
      : transactionTypes.find(type => !isInitialPartnershipEntryType(type)) || transactionTypes[1],
  })
  const [localError, setLocalError] = useState<string | null>(null)
  const companyPartners = partners.filter(item => (item.company_id || '') === form.company_id)
  const update = (name: string, value: string) => setForm(prev => ({ ...prev, [name]: value }))

  const completeActiveTransaction = async () => {
    setLocalError(null)
    if (!form.company_id) return setLocalError('Şirket seçimi zorunludur.')
    const transactionType = form.transaction_type as OwnershipTransactionType
    if (['Pay Devri', 'Kısmi Pay Devri'].includes(transactionType) && !form.to_partner_id) return setLocalError('Devralan ortak seçimi zorunludur.')

    await onSubmit(partner, {
      company_id: form.company_id,
      transaction_type: transactionType,
      transaction_date: form.start_date,
      effective_date: form.start_date,
      from_partner_id: ['Pay Devri', 'Kısmi Pay Devri', 'Ortaklıktan Çıkış'].includes(transactionType) ? partner.id : null,
      to_partner_id: ['Pay Devri', 'Kısmi Pay Devri'].includes(transactionType) ? form.to_partner_id : null,
      affected_partner_id: ['Oy Hakkı Değişikliği', 'Kar Payı Oranı Değişikliği', 'İmtiyazlı Pay Tanımı', 'İmtiyazlı Pay Kaldırma', 'Düzeltme Kaydı', 'Ters Kayıt'].includes(transactionType) ? partner.id : null,
      share_ratio: form.share_ratio === '' ? null : Number(form.share_ratio),
      voting_ratio: form.voting_ratio === '' ? null : Number(form.voting_ratio),
      profit_ratio: form.profit_ratio === '' ? null : Number(form.profit_ratio),
      status: 'draft',
      approval_status: 'draft',
      workflow_status: 'draft',
      document_status: form.document_reference_id ? 'Yüklendi' : 'Belge Yok',
      document_reference_id: form.document_reference_id || null,
      notes: form.notes || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ortaklık İşlemi</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{partner.display_name || partner.partner_name || 'Ortak'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">
            Kapat
          </button>
        </div>

        <div className="mt-5 space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              İşlem Türü
              <select value={form.transaction_type} onChange={event => update('transaction_type', event.target.value)} className={formControlClass({ className: 'mt-1' })}>
                {transactionTypes.filter(type => !isInitialPartnershipEntryType(type)).map(type => (
                  <option key={type} value={type}>{getOwnershipTransactionTypeLabel(type)}</option>
                ))}
              </select>
            </label>
            {['Pay Devri', 'Kısmi Pay Devri'].includes(form.transaction_type) && (
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Devralan Ortak
                <select value={form.to_partner_id} onChange={event => update('to_partner_id', event.target.value)} className={formControlClass({ className: 'mt-1' })}>
                  <option value="">Seçiniz</option>
                  {companyPartners.filter(item => item.id !== partner.id).map(item => (
                    <option key={item.id} value={item.id}>{item.display_name || item.partner_name || 'Ortak'}</option>
                  ))}
                </select>
              </label>
            )}
            {['Pay Devri', 'Kısmi Pay Devri', 'Ortaklıktan Çıkış'].includes(form.transaction_type) && (
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Hisse Oranı
                <input type="number" min="0" max="100" step="0.01" value={form.share_ratio} onChange={event => update('share_ratio', event.target.value)} className={formControlClass({ className: 'mt-1' })} />
              </label>
            )}
            {['Pay Devri', 'Kısmi Pay Devri', 'Oy Hakkı Değişikliği'].includes(form.transaction_type) && (
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Oy Hakkı Oranı
                <input type="number" min="0" max="100" step="0.01" value={form.voting_ratio} onChange={event => update('voting_ratio', event.target.value)} className={formControlClass({ className: 'mt-1' })} />
              </label>
            )}
            {['Pay Devri', 'Kısmi Pay Devri', 'Kar Payı Oranı Değişikliği'].includes(form.transaction_type) && (
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Kar Payı Oranı
                <input type="number" min="0" max="100" step="0.01" value={form.profit_ratio} onChange={event => update('profit_ratio', event.target.value)} className={formControlClass({ className: 'mt-1' })} />
              </label>
            )}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Belge Referansı
              <input value={form.document_reference_id} onChange={event => update('document_reference_id', event.target.value)} className={formControlClass({ className: 'mt-1' })} />
            </label>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Açıklama
              <textarea value={form.notes} onChange={event => update('notes', event.target.value)} rows={3} className={formControlClass({ className: 'mt-1' })} />
            </label>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
              Hissesi tamamen devredilen ortak, onaylı işlemlerden sonra pasif statüye düşecektir. Ayrı bir Ortaklıktan Ayrılma işlemi oluşturulmaz.
            </div>
        </div>

        {localError && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{localError}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">
            Vazgeç
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={completeActiveTransaction}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            İşlem Taslağı Oluştur
          </button>
        </div>
      </div>
    </div>
  )
}

const initialPartnershipStepLabels = ['Bilgiler', 'Belgeler', 'Önizleme ve Tamamla'] as const

type InitialPartnershipDocumentSlot = {
  id: string
  title: string
  required?: boolean
}

const initialPartnershipBaseDocumentSlots: InitialPartnershipDocumentSlot[] = [
  { id: 'company_articles_document', title: 'Şirket Sözleşmesi / Ana Sözleşme' },
  { id: 'foundation_registry_document', title: 'Kuruluş Tescil Belgesi / Ticaret Sicil Gazetesi' },
  { id: 'mersis_application_document', title: 'MERSİS Başvuru / Talep No Bilgisi' },
  { id: 'chamber_registration_document', title: 'Oda Kayıt Beyannamesi / Kuruluş Bildirim Formu' },
  { id: 'partner_identity_registry_document', title: 'Ortak Kimlik / Tüzel Kişi Sicil Belgeleri' },
]

const privilegeDocumentSlot: InitialPartnershipDocumentSlot = {
  id: 'privilege_basis_document',
  title: 'Farklı Hak / İmtiyaz Dayanak Belgesi',
}

function InitialPartnershipEntryWizard({
  partner,
  companies,
  partners,
  ownershipRows,
  saving,
  readOnly = false,
  sourceTransaction,
  onClose,
  onSubmit,
}: PartnerOwnershipActionWizardProps) {
  const activeCompanies = useMemo(() => companies.filter(isActiveCompanyForNewPartner), [companies])
  const selectableCompanies = readOnly ? companies : activeCompanies
  const initialForm = useMemo(
    () => buildInitialPartnershipInitialForm(partner, sourceTransaction),
    [partner, sourceTransaction]
  )
  const initialDocumentFields = useMemo(
    () => hydrateInitialPartnershipDocumentFields(sourceTransaction),
    [sourceTransaction]
  )
  const initialFormWithDocuments = useMemo(
    () => ({ ...initialForm, ...initialDocumentFields }),
    [initialDocumentFields, initialForm]
  )
  const [companyDetail, setCompanyDetail] = useState<Record<string, any> | null>(null)
  const [companyLoading, setCompanyLoading] = useState(false)
  const [form, setForm] = useState<InitialPartnershipFormState>(() => initialFormWithDocuments)

  const selectedCompany = selectableCompanies.find(company => company.value === form.company_id)
  const documentSlots = useMemo(
    () => form.has_non_proportional_rights
      ? [...initialPartnershipBaseDocumentSlots, privilegeDocumentSlot]
      : initialPartnershipBaseDocumentSlots,
    [form.has_non_proportional_rights]
  )

  useEffect(() => {
    let cancelled = false
    if (!form.company_id) {
      setCompanyDetail(null)
      return
    }

    setCompanyLoading(true)
    companyService.detail(form.company_id)
      .then(result => {
        if (!cancelled) setCompanyDetail(result.data || null)
      })
      .catch(() => {
        if (!cancelled) setCompanyDetail(null)
      })
      .finally(() => {
        if (!cancelled) setCompanyLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [form.company_id])

  useEffect(() => {
    if (!readOnly) return
    setForm(initialFormWithDocuments)
  }, [initialFormWithDocuments, readOnly])

  const capital = useMemo(() => readOnly && sourceTransaction
    ? buildInitialPartnershipCapitalInfoFromTransaction({
        transaction: sourceTransaction,
        company: selectedCompany,
        companyDetail,
      })
    : buildInitialPartnershipCapitalInfo({
        company: selectedCompany,
        companyDetail,
        ownershipRows,
        partners,
        partnerId: partner.id,
        companyId: form.company_id,
      }), [companyDetail, form.company_id, ownershipRows, partner.id, partners, readOnly, selectedCompany, sourceTransaction])

  const calculations = useMemo(() => {
    const amount = parseLocalizedNumber(form.partner_committed_capital_amount)
    const shareUnits = capital.share_nominal_value > 0 ? amount / capital.share_nominal_value : 0
    const shareRatio = capital.company_committed_capital_amount > 0
      ? (amount / capital.company_committed_capital_amount) * 100
      : 0
    const votingRatio = form.has_non_proportional_rights
      ? parseLocalizedNumber(form.partner_voting_ratio)
      : shareRatio
    const profitRatio = form.has_non_proportional_rights
      ? parseLocalizedNumber(form.partner_profit_ratio)
      : shareRatio
    const lowerAmount = capital.share_nominal_value > 0
      ? Math.max(0, Math.floor(amount / capital.share_nominal_value) * capital.share_nominal_value)
      : 0
    const upperAmount = capital.share_nominal_value > 0
      ? Math.ceil(amount / capital.share_nominal_value) * capital.share_nominal_value
      : 0
    const suggestedAmounts = [lowerAmount, upperAmount]
      .filter(value => value > 0 && value <= capital.available_capital_amount)
      .filter((value, index, values) => values.findIndex(item => Math.abs(item - value) < 0.0001) === index)

    return {
      partner_committed_capital_amount: roundMoney(amount),
      partner_share_units: shareUnits,
      partner_share_ratio: roundRatio(shareRatio),
      partner_voting_ratio: roundRatio(votingRatio),
      partner_profit_ratio: roundRatio(profitRatio),
      isShareUnitWhole: shareUnits > 0 && Math.abs(shareUnits - Math.round(shareUnits)) < 0.0001,
      suggestedAmounts,
      remaining_capital_after_entry: roundMoney(capital.available_capital_amount - amount),
      remaining_share_units_after_entry: capital.share_nominal_value > 0 ? (capital.available_capital_amount - amount) / capital.share_nominal_value : 0,
    }
  }, [capital, form.has_non_proportional_rights, form.partner_committed_capital_amount, form.partner_profit_ratio, form.partner_voting_ratio])

  const infoErrors = useMemo(() => getInitialPartnershipInfoErrors({
    form,
    selectedCompany,
    capital,
    calculations,
  }), [calculations, capital, form, selectedCompany])
  const documentErrors = useMemo(() => getInitialPartnershipDocumentErrors(documentSlots, form), [documentSlots, form])

  const update = (name: string, value: string | boolean) => {
    if (readOnly) return
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const validateStep = (targetStep: number) => {
    if (readOnly) return null
    if (targetStep >= 0 && infoErrors.length) return infoErrors[0]
    if (targetStep >= 1 && documentErrors.length) return documentErrors[0]
    return null
  }

  const complete = async () => {
    if (readOnly) return
    const validationError = validateStep(2)
    if (validationError) {
      return
    }
    await onSubmit(partner, {
      company_id: form.company_id,
      transaction_type: INITIAL_PARTNERSHIP_ENTRY_TYPE,
      transaction_date: form.transaction_date,
      effective_date: form.transaction_date,
      to_partner_id: partner.id,
      affected_partner_id: partner.id,
      share_ratio: calculations.partner_share_ratio,
      voting_ratio: calculations.partner_voting_ratio,
      profit_ratio: calculations.partner_profit_ratio,
      share_units: Math.round(calculations.partner_share_units),
      nominal_value: roundMoney(capital.share_nominal_value),
      capital_amount: calculations.partner_committed_capital_amount,
      committed_capital_amount: calculations.partner_committed_capital_amount,
      currency: capital.currency,
      commitment_date: form.transaction_date,
      status: 'active',
      document_status: documentSlots.some(slot => isInitialPartnershipDocumentReady(form[slot.id])) ? 'Yüklendi' : 'Belge Yok',
      document_files: serializeInitialPartnershipDocuments(form, documentSlots),
      has_privileged_share: form.has_non_proportional_rights,
      privilege_type: form.expected_privilege_document_type || null,
      privilege_description: form.privilege_description || null,
      new_values: {
        has_non_proportional_rights: form.has_non_proportional_rights,
        expected_privilege_document_type: form.expected_privilege_document_type || null,
        partner_committed_capital_amount: calculations.partner_committed_capital_amount,
        partner_share_units: Math.round(calculations.partner_share_units),
        partner_share_ratio: calculations.partner_share_ratio,
        partner_voting_ratio: calculations.partner_voting_ratio,
        partner_profit_ratio: calculations.partner_profit_ratio,
        available_capital_amount_before_entry: capital.available_capital_amount,
        available_share_units_before_entry: capital.available_share_units,
      },
      transaction_reason: INITIAL_PARTNERSHIP_ENTRY_TYPE,
      description: 'İlk Ortaklık Girişi',
      notes: form.notes || null,
      capital_distribution: [{
        partner_id: partner.id,
        company_id: form.company_id,
        committed_capital_amount: calculations.partner_committed_capital_amount,
        share_units: Math.round(calculations.partner_share_units),
        share_ratio: calculations.partner_share_ratio,
        voting_ratio: calculations.partner_voting_ratio,
        profit_ratio: calculations.partner_profit_ratio,
        currency: capital.currency,
      }],
    })
  }

  const wizardSteps = useMemo<RecordLifecycleWizardStep[]>(() => [
    {
      id: 'initial-partnership-info',
      title: initialPartnershipStepLabels[0],
      sections: [{
        id: 'initial-partnership-info-section',
        title: 'Ortaklık bilgileri',
        frameless: true,
        children: (
          <InitialPartnershipInfoStep
            partner={partner}
            activeCompanies={selectableCompanies}
            selectedCompany={selectedCompany}
            companyLoading={companyLoading}
            capital={capital}
            calculations={calculations}
            form={form}
            readOnly={readOnly}
            onUpdate={update}
          />
        ),
      }],
    },
    {
      id: 'initial-partnership-documents',
      title: initialPartnershipStepLabels[1],
      description: 'Belgeler şimdilik zorunlu değildir; hazır olanları ekleyebilirsiniz.',
      sections: [{
        id: 'initial-partnership-documents-section',
        title: 'İlk ortaklık belgeleri',
        fields: documentSlots.map(slot => ({
          name: slot.id,
          label: slot.title,
          type: 'document' as const,
          required: !!slot.required,
          colSpan: 3 as const,
          documentMode: 'newOnly' as const,
        })),
      }],
    },
    {
      id: 'initial-partnership-preview',
      title: initialPartnershipStepLabels[2],
      description: 'İşlem tamamlanmadan önce son kontrol.',
      sections: [{
        id: 'initial-partnership-preview-section',
        title: 'Önizleme ve Tamamla',
        frameless: true,
        children: (
          <InitialPartnershipPreviewStep
            partner={partner}
            company={selectedCompany}
            capital={capital}
            calculations={calculations}
            documentSlots={documentSlots}
            form={form}
          />
        ),
      }],
    },
  ], [
    calculations,
    capital,
    companyLoading,
    documentSlots,
    form,
    partner,
    readOnly,
    selectableCompanies,
    selectedCompany,
  ])

  return (
    <RecordLifecycleWizard
      title="İlk Ortaklık Girişi"
      subtitle={readOnly ? 'Tamamlanmış işlem görüntüleniyor' : partner.display_name || partner.partner_name || 'Taslak ortak'}
      steps={wizardSteps}
      form={form}
      setForm={setForm as Dispatch<SetStateAction<Record<string, any>>>}
      onClose={onClose}
      onSubmit={complete}
      submitLabel="Tamamla"
      saving={saving}
      readOnly={readOnly}
      validateStep={validateStep}
    />
  )
}

function InitialPartnershipInfoStep({
  partner,
  activeCompanies,
  selectedCompany,
  companyLoading,
  capital,
  calculations,
  form,
  readOnly,
  onUpdate,
}: {
  partner: Record<string, any>
  activeCompanies: CompanyOption[]
  selectedCompany?: CompanyOption
  companyLoading: boolean
  capital: InitialPartnershipCapitalInfo
  calculations: InitialPartnershipCalculations
  form: InitialPartnershipFormState
  readOnly: boolean
  onUpdate: (name: string, value: string | boolean) => void
}) {
  const partnerSummary = getInitialPartnershipPartnerSummary(partner)
  const noShareUnits = !!selectedCompany && !companyLoading && capital.company_total_share_units <= 0
  const noAvailableCapital = !!selectedCompany && !companyLoading && capital.company_total_share_units > 0 && capital.available_capital_amount <= 0
  const amountDisabled = readOnly || !selectedCompany || companyLoading || noShareUnits || noAvailableCapital || capital.share_nominal_value <= 0

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{partnerSummary.title}</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {partnerSummary.rows.map(row => (
              <div key={row.label}>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{row.label}</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">{row.value || '-'}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Ortağı Olunacak Şirket</h3>
          <label className="mt-3 block text-sm font-medium text-gray-700 dark:text-gray-200">
            Ortağı Olduğu Şirket
            <select value={form.company_id} disabled={readOnly} onChange={event => onUpdate('company_id', event.target.value)} className={formControlClass({ className: 'mt-1' })}>
              <option value="">Seçiniz</option>
              {activeCompanies.map(company => (
                <option key={company.value} value={company.value}>{company.label}</option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-sm font-medium text-gray-700 dark:text-gray-200">
            İşlem Tarihi
            <input type="date" value={form.transaction_date} disabled={readOnly} onChange={event => onUpdate('transaction_date', event.target.value)} className={formControlClass({ className: 'mt-1' })} />
          </label>
        </section>
      </div>

      {companyLoading && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
          Şirket sermaye bilgileri yükleniyor.
        </div>
      )}

      {noShareUnits && (
        <InitialPartnershipWarning>
          Şirketin toplam pay adedi tanımlı olmadığı için pay itibari değeri hesaplanamıyor. Bu bilgi şirket sermaye bilgilerinden tamamlanmalıdır.
        </InitialPartnershipWarning>
      )}

      {noAvailableCapital && (
        <InitialPartnershipWarning>
          Bu şirkette ortaklara tahsis edilmemiş taahhüt edilebilir sermaye bulunmuyor. Yeni ortak girişi için önce sermaye artırımı yapılmalıdır.
        </InitialPartnershipWarning>
      )}

      <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Şirket Sermaye ve Pay Bilgileri</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InitialPartnershipMetric label="Şirket Taahhüt Edilmiş Sermayesi" value={formatCurrency(capital.company_committed_capital_amount, capital.currency)} />
          <InitialPartnershipMetric label="Toplam Pay Adedi" value={formatNumber(capital.company_total_share_units)} />
          <InitialPartnershipMetric label="Pay İtibari Değeri" value={formatCurrency(capital.share_nominal_value, capital.currency)} />
          <InitialPartnershipMetric label="Ortaklara Tahsis Edilmiş Sermaye" value={formatCurrency(capital.allocated_capital_amount, capital.currency)} />
          <InitialPartnershipMetric label="Taahhüt Edilebilir Sermaye" value={formatCurrency(capital.available_capital_amount, capital.currency)} />
          <InitialPartnershipMetric label="Taahhüt Edilebilir Pay Adedi" value={formatNumber(capital.available_share_units)} />
          <InitialPartnershipMetric label="Para Birimi" value={capital.currency} />
          <InitialPartnershipMetric label="İşlem Sonrası Kalan Sermaye" value={formatCurrency(calculations.remaining_capital_after_entry, capital.currency)} />
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Taahhüt Edilecek Sermaye
              <InitialPartnershipCurrencyInput
                value={form.partner_committed_capital_amount}
                onChange={value => onUpdate('partner_committed_capital_amount', value)}
                readOnly={amountDisabled}
                currency={capital.currency}
              />
            </label>
            {form.partner_committed_capital_amount && !calculations.isShareUnitWhole && calculations.suggestedAmounts.length > 0 && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                Taahhüt edilecek sermaye, pay itibari değeri olan {formatCurrency(capital.share_nominal_value, capital.currency)} tutarının katı olmalıdır. En yakın uygun tutarlar: {calculations.suggestedAmounts.map(value => formatCurrency(value, capital.currency)).join(' veya ')}.
              </div>
            )}
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
            Hisse oranı ve pay adedi kullanıcı tarafından girilmez; taahhüt edilecek sermaye ve pay itibari değerinden otomatik hesaplanır.
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InitialPartnershipMetric label="Ortağın Pay Adedi" value={formatNumber(calculations.partner_share_units)} />
          <InitialPartnershipMetric label="Ortağın Hisse Oranı" value={formatPercent(calculations.partner_share_ratio)} />
          <InitialPartnershipMetric label="Oy Hakkı Oranı" value={formatPercent(calculations.partner_voting_ratio)} caption="Varsayılan olarak hisse oranıyla aynı hesaplanır." />
          <InitialPartnershipMetric label="Kâr Payı Oranı" value={formatPercent(calculations.partner_profit_ratio)} caption="Varsayılan olarak hisse oranıyla aynı hesaplanır." />
        </div>

      </section>

      <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <label className="flex items-start gap-3 text-sm font-medium text-gray-800 dark:text-gray-100">
          <input
            type="checkbox"
            checked={form.has_non_proportional_rights}
            disabled={readOnly}
            onChange={event => onUpdate('has_non_proportional_rights', event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Oy hakkı veya kâr payı hisse oranından farklı olacak</span>
        </label>

        {form.has_non_proportional_rights && (
          <div className="mt-4 space-y-4">
            <InitialPartnershipWarning>
              Oy hakkı veya kâr payı hisse oranından farklı tanımlanıyorsa bu durum şirket sözleşmesi, ortaklar kurulu/genel kurul kararı veya ilgili resmi belgeye dayanmalıdır.
            </InitialPartnershipWarning>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Oy Hakkı Oranı
                <input type="number" min="0" max="100" step="0.01" value={form.partner_voting_ratio} disabled={readOnly} onChange={event => onUpdate('partner_voting_ratio', event.target.value)} className={formControlClass({ className: 'mt-1' })} />
              </label>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Kâr Payı Oranı
                <input type="number" min="0" max="100" step="0.01" value={form.partner_profit_ratio} disabled={readOnly} onChange={event => onUpdate('partner_profit_ratio', event.target.value)} className={formControlClass({ className: 'mt-1' })} />
              </label>
              <label className="md:col-span-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                Farklı Hak / İmtiyaz Açıklaması
                <textarea value={form.privilege_description} disabled={readOnly} onChange={event => onUpdate('privilege_description', event.target.value)} rows={3} className={formControlClass({ className: 'mt-1' })} />
              </label>
              <label className="md:col-span-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                Beklenen Dayanak Belge Türü
                <input value={form.expected_privilege_document_type} disabled={readOnly} onChange={event => onUpdate('expected_privilege_document_type', event.target.value)} className={formControlClass({ className: 'mt-1' })} />
              </label>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function InitialPartnershipPreviewStep({
  partner,
  company,
  capital,
  calculations,
  documentSlots,
  form,
}: {
  partner: Record<string, any>
  company?: CompanyOption
  capital: InitialPartnershipCapitalInfo
  calculations: InitialPartnershipCalculations
  documentSlots: InitialPartnershipDocumentSlot[]
  form: InitialPartnershipFormState
}) {
  const rows = [
    ['Ortak olacak kişi/kurum', partner.display_name || partner.partner_name || '-'],
    ['Ortağı olduğu şirket', company?.label || '-'],
    ['Şirket taahhüt edilmiş sermayesi', formatCurrency(capital.company_committed_capital_amount, capital.currency)],
    ['Toplam pay adedi', formatNumber(capital.company_total_share_units)],
    ['Pay itibari değeri', formatCurrency(capital.share_nominal_value, capital.currency)],
    ['Taahhüt edilebilir sermaye', formatCurrency(capital.available_capital_amount, capital.currency)],
    ['Taahhüt edilebilir pay adedi', formatNumber(capital.available_share_units)],
    ['Ortağın taahhüt edeceği sermaye', formatCurrency(calculations.partner_committed_capital_amount, capital.currency)],
    ['Ortağın pay adedi', formatNumber(calculations.partner_share_units)],
    ['Ortağın hisse oranı', formatPercent(calculations.partner_share_ratio)],
    ['Oy hakkı oranı', formatPercent(calculations.partner_voting_ratio)],
    ['Kâr payı oranı', formatPercent(calculations.partner_profit_ratio)],
  ]
  const missingRequiredDocuments = documentSlots.filter(slot => slot.required && !isInitialPartnershipDocumentReady(form[slot.id]))

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">İşlem Özeti</h3>
        <dl className="mt-3 grid gap-3 md:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">{value}</dd>
            </div>
          ))}
        </dl>
        {form.has_non_proportional_rights && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="font-semibold">Farklı hak / imtiyaz</div>
            <div className="mt-1">{form.privilege_description || '-'}</div>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Belge Kontrolü</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
              {documentSlots.map(slot => {
                const ready = isInitialPartnershipDocumentReady(form[slot.id])
                return (
              <div key={slot.id} className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                ready
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
                  : slot.required
                    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200'
                    : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300'
              )}>
                {ready ? <CheckCircle2 size={15} /> : <FileText size={15} />}
                <span>{slot.title}</span>
              </div>
            )
          })}
        </div>
        {missingRequiredDocuments.length > 0 && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-300">
            Eksik zorunlu belgeler: {missingRequiredDocuments.map(slot => slot.title).join(', ')}
          </p>
        )}
      </section>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100">
        Bu işlem tamamlandığında taslak ortak kaydı aktif ortak haline getirilecek ve şirketin ortaklık dağılımına dahil edilecektir. Ödenen sermaye bilgisi bu işlemle değiştirilmeyecektir.
      </div>
    </div>
  )
}

function InitialPartnershipMetric({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{value}</div>
      {caption && <div className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{caption}</div>}
    </div>
  )
}

function InitialPartnershipWarning({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

function InitialPartnershipCurrencyInput({
  value,
  onChange,
  readOnly,
  currency,
}: {
  value: string
  onChange: (value: string) => void
  readOnly: boolean
  currency: string
}) {
  return (
    <div className="relative mt-1">
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={event => onChange(event.target.value)}
        readOnly={readOnly}
        className={cn(formControlClass(), 'pr-12')}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 dark:text-gray-400">
        {currencyInputSuffix(currency)}
      </span>
    </div>
  )
}

type InitialPartnershipFormState = {
  [key: string]: any
  company_id: string
  transaction_date: string
  partner_committed_capital_amount: string
  has_non_proportional_rights: boolean
  partner_voting_ratio: string
  partner_profit_ratio: string
  privilege_description: string
  expected_privilege_document_type: string
  notes: string
}

type InitialPartnershipCapitalInfo = {
  company_committed_capital_amount: number
  company_total_share_units: number
  share_nominal_value: number
  allocated_capital_amount: number
  available_capital_amount: number
  available_share_units: number
  currency: string
}

type InitialPartnershipCalculations = {
  partner_committed_capital_amount: number
  partner_share_units: number
  partner_share_ratio: number
  partner_voting_ratio: number
  partner_profit_ratio: number
  isShareUnitWhole: boolean
  suggestedAmounts: number[]
  remaining_capital_after_entry: number
  remaining_share_units_after_entry: number
}

function buildInitialPartnershipInitialForm(
  partner: Record<string, any>,
  transaction?: OwnershipTransactionHistoryRow | null
): InitialPartnershipFormState {
  const newValues = getTransactionNewValues(transaction)
  const partnerCommittedCapital = firstPositiveNumber(
    transaction?.committed_capital_amount,
    transaction?.capital_amount,
    newValues.partner_committed_capital_amount
  )
  const hasNonProportionalRights = Boolean(
    newValues.has_non_proportional_rights ??
    transaction?.has_privileged_share ??
    transaction?.privilege_description
  )

  return {
    company_id: String(transaction?.company_id || partner.company_id || ''),
    transaction_date: String(transaction?.effective_date || transaction?.transaction_date || new Date().toISOString().slice(0, 10)),
    partner_committed_capital_amount: partnerCommittedCapital > 0 ? String(partnerCommittedCapital) : '',
    has_non_proportional_rights: hasNonProportionalRights,
    partner_voting_ratio: valueToInputString(newValues.partner_voting_ratio ?? transaction?.voting_ratio),
    partner_profit_ratio: valueToInputString(newValues.partner_profit_ratio ?? transaction?.profit_ratio),
    privilege_description: String(transaction?.privilege_description || newValues.privilege_description || ''),
    expected_privilege_document_type: String(transaction?.privilege_type || newValues.expected_privilege_document_type || ''),
    notes: String(transaction?.notes || ''),
  }
}

function buildInitialPartnershipCapitalInfoFromTransaction({
  transaction,
  company,
  companyDetail,
}: {
  transaction: OwnershipTransactionHistoryRow
  company?: CompanyOption
  companyDetail: Record<string, any> | null
}): InitialPartnershipCapitalInfo {
  const newValues = getTransactionNewValues(transaction)
  const partnerCommittedCapital = firstPositiveNumber(
    transaction.committed_capital_amount,
    transaction.capital_amount,
    newValues.partner_committed_capital_amount
  )
  const partnerShareRatio = parseLocalizedNumber(newValues.partner_share_ratio ?? transaction.share_ratio)
  const committedFromRatio = partnerCommittedCapital > 0 && partnerShareRatio > 0
    ? partnerCommittedCapital / (partnerShareRatio / 100)
    : 0
  const shareUnits = firstPositiveNumber(transaction.share_units, newValues.partner_share_units)
  const nominalValue = firstPositiveNumber(
    transaction.nominal_value,
    newValues.share_nominal_value,
    shareUnits > 0 ? partnerCommittedCapital / shareUnits : 0
  )
  const committed = firstPositiveNumber(
    newValues.company_committed_capital_amount,
    (transaction as any).company_committed_capital_amount,
    committedFromRatio,
    companyDetail?.committed_capital_amount,
    company?.committed_capital_amount
  )
  const totalShareUnits = firstPositiveNumber(
    newValues.company_total_share_units,
    committed > 0 && nominalValue > 0 ? committed / nominalValue : 0,
    companyDetail?.total_share_units,
    companyDetail?.share_units
  )
  const availableBeforeEntry = firstPositiveNumber(
    newValues.available_capital_amount_before_entry,
    newValues.available_capital_amount,
    partnerCommittedCapital
  )
  const allocatedBeforeEntry = committed > 0 ? Math.max(0, committed - availableBeforeEntry) : 0

  return {
    company_committed_capital_amount: roundMoney(committed),
    company_total_share_units: totalShareUnits,
    share_nominal_value: nominalValue,
    allocated_capital_amount: roundMoney(allocatedBeforeEntry),
    available_capital_amount: roundMoney(availableBeforeEntry),
    available_share_units: nominalValue > 0 ? availableBeforeEntry / nominalValue : 0,
    currency: String(transaction.currency || companyDetail?.default_currency || company?.default_currency || 'TRY'),
  }
}

function hydrateInitialPartnershipDocumentFields(transaction?: OwnershipTransactionHistoryRow | null): Record<string, any> {
  const files = Array.isArray(transaction?.document_files) ? transaction.document_files : []
  return files.reduce((acc: Record<string, any>, file, index) => {
    const slotId = String(file.slotId || file.slot_id || file.document_type || 'other_supporting_documents')
    const documentDate = optionalString(file.document_date || file.documentDate)
    const description = optionalString(file.description || file.notes)

    acc[slotId] = {
      source: file.source || 'new',
      slotId,
      documentId: optionalString(file.documentId || file.document_id || file.id),
      documentLinkId: optionalString(file.documentLinkId || file.document_link_id),
      storagePath: optionalString(file.storagePath || file.storage_path || file.path),
      name: String(file.name || file.file_name || file.filename || file.title || `Belge ${index + 1}`),
      size: Number(file.size || file.file_size || 0),
      type: String(file.type || file.mime_type || file.content_type || 'application/octet-stream'),
      uploadedAt: file.uploadedAt || file.uploaded_at || transaction?.created_at,
      status: String(file.status || 'active'),
      url: optionalString(file.url || file.download_url),
      previewUrl: optionalString(file.previewUrl || file.preview_url || file.url),
      thumbnailUrl: optionalString(file.thumbnailUrl || file.thumbnail_url),
      document_date: documentDate,
      description,
    }

    return acc
  }, {})
}

function getTransactionNewValues(transaction?: OwnershipTransactionHistoryRow | null): Record<string, any> {
  return parseJsonRecord(transaction?.new_values)
}

function valueToInputString(value: unknown) {
  return value === null || value === undefined ? '' : String(value)
}

function optionalString(value: unknown) {
  if (value === null || value === undefined) return undefined
  const text = String(value)
  return text || undefined
}

function buildInitialPartnershipCapitalInfo({
  company,
  companyDetail,
  ownershipRows,
  partners,
  partnerId,
  companyId,
}: {
  company?: CompanyOption
  companyDetail: Record<string, any> | null
  ownershipRows: CurrentOwnershipRow[]
  partners: Record<string, any>[]
  partnerId: string
  companyId: string
}): InitialPartnershipCapitalInfo {
  const openingDetails = companyDetail?.opening_details || {}
  const openingPayload = parseJsonRecord(openingDetails?.payload_json)
  const committed = firstPositiveNumber(
    companyDetail?.committed_capital_amount,
    company?.committed_capital_amount,
    openingPayload.foundation_capital_amount,
    openingPayload.capital_amount,
    openingDetails.foundation_capital_amount,
    openingDetails.capital_amount
  )
  const totalShareUnits = firstPositiveNumber(
    companyDetail?.total_share_units,
    companyDetail?.share_units,
    openingPayload.foundation_share_units,
    openingPayload.share_units,
    openingPayload.company_total_share_units,
    openingDetails.foundation_share_units,
    openingDetails.share_units
  )
  const shareNominalValue = committed > 0 && totalShareUnits > 0 ? committed / totalShareUnits : 0
  const allocatedFromOwnership = ownershipRows
    .filter(row => row.company_id === companyId && row.partner_id !== partnerId)
    .reduce((sum, row) => {
      const explicitCapital = parseLocalizedNumber(row.current_capital_amount)
      if (explicitCapital > 0) return sum + explicitCapital
      return sum + committed * (parseLocalizedNumber(row.current_share_ratio) / 100)
    }, 0)
  const allocatedFromPartners = partners
    .filter(item => (item.company_id || '') === companyId && item.id !== partnerId && getPartnerRecordStatus(item) === 'active')
    .reduce((sum, item) => {
      const explicitCapital = parseLocalizedNumber(item.capital_amount || item.committed_capital_amount)
      if (explicitCapital > 0) return sum + explicitCapital
      return sum + committed * (parseLocalizedNumber(item.share_ratio || item.current_share_ratio) / 100)
    }, 0)
  const allocated = roundMoney(allocatedFromOwnership > 0 ? allocatedFromOwnership : allocatedFromPartners)
  const availableCapital = roundMoney(Math.max(0, committed - allocated))

  return {
    company_committed_capital_amount: roundMoney(committed),
    company_total_share_units: totalShareUnits,
    share_nominal_value: shareNominalValue,
    allocated_capital_amount: allocated,
    available_capital_amount: availableCapital,
    available_share_units: shareNominalValue > 0 ? availableCapital / shareNominalValue : 0,
    currency: String(companyDetail?.default_currency || company?.default_currency || 'TRY'),
  }
}

function getInitialPartnershipInfoErrors({
  form,
  selectedCompany,
  capital,
  calculations,
}: {
  form: InitialPartnershipFormState
  selectedCompany?: CompanyOption
  capital: InitialPartnershipCapitalInfo
  calculations: InitialPartnershipCalculations
}) {
  const errors: string[] = []
  if (!form.company_id) errors.push('Ortak kaydı oluşturmak için önce ortağı olduğu aktif şirketi seçmelisiniz.')
  if (form.company_id && !selectedCompany) errors.push('Seçilen şirket aktif durumda olmadığı için bu şirkete yeni ortak eklenemez.')
  if (capital.company_committed_capital_amount <= 0) errors.push('Şirketin taahhüt edilmiş sermayesi tanımlı olmadığı için işlem tamamlanamaz.')
  if (capital.company_total_share_units <= 0) errors.push('Şirketin toplam pay adedi tanımlı olmadığı için pay itibari değeri hesaplanamıyor. Bu bilgi şirket sermaye bilgilerinden tamamlanmalıdır.')
  if (capital.share_nominal_value <= 0) errors.push('Pay itibari değeri hesaplanamadığı için işlem tamamlanamaz.')
  if (capital.available_capital_amount <= 0) errors.push('Bu şirkette ortaklara tahsis edilmemiş taahhüt edilebilir sermaye bulunmuyor. Yeni ortak girişi için önce sermaye artırımı yapılmalıdır.')
  if (calculations.partner_committed_capital_amount <= 0) errors.push('Taahhüt edilecek sermaye 0’dan büyük olmalıdır.')
  if (calculations.partner_committed_capital_amount > capital.available_capital_amount) errors.push('Taahhüt edilecek sermaye, taahhüt edilebilir sermayeden büyük olamaz.')
  if (calculations.partner_committed_capital_amount > 0 && !calculations.isShareUnitWhole) {
    errors.push(`Taahhüt edilecek sermaye, pay itibari değeri olan ${formatCurrency(capital.share_nominal_value, capital.currency)} tutarının katı olmalıdır.`)
  }
  if (form.has_non_proportional_rights) {
    if (!Number.isFinite(calculations.partner_voting_ratio) || calculations.partner_voting_ratio < 0 || calculations.partner_voting_ratio > 100) errors.push('Oy Hakkı Oranı 0 ile 100 arasında olmalıdır.')
    if (!Number.isFinite(calculations.partner_profit_ratio) || calculations.partner_profit_ratio < 0 || calculations.partner_profit_ratio > 100) errors.push('Kâr Payı Oranı 0 ile 100 arasında olmalıdır.')
    if (!form.privilege_description.trim()) errors.push('Farklı hak / imtiyaz açıklaması zorunludur.')
  }
  return errors
}

function getInitialPartnershipDocumentErrors(slots: InitialPartnershipDocumentSlot[], form: Record<string, any>) {
  return slots
    .filter(slot => slot.required && !isInitialPartnershipDocumentReady(form[slot.id]))
    .map(slot => `${slot.title} yüklenmeden işlem tamamlanamaz.`)
}

function getInitialPartnershipPartnerSummary(partner: Record<string, any>) {
  const kind = normalizePartnerType(partner.owner_kind || partner.partner_type)
  if (kind === 'organization') {
    return {
      title: 'Ortak olacak kurum',
      rows: [
        { label: 'Ticari unvan', value: partner.display_name || partner.partner_name || partner.trade_name },
        { label: 'VKN', value: partner.identity_tax_number || partner.tax_number || partner.identity_number },
        { label: 'Ülke', value: partner.country || partner.nationality_country || 'Türkiye' },
        { label: 'Kişi tipi', value: 'Tüzel kişi' },
      ],
    }
  }

  return {
    title: 'Ortak olacak kişi',
    rows: [
      { label: 'Ad Soyad', value: partner.display_name || partner.partner_name || [partner.first_name, partner.last_name].filter(Boolean).join(' ') },
      { label: 'Uyruk', value: partner.nationality_country || partner.nationality || partner.country || 'Türkiye' },
      { label: 'TCKN / Pasaport No', value: partner.identity_number || partner.national_id || partner.passport_no || partner.identity_tax_number },
      { label: 'Kişi tipi', value: 'Gerçek kişi' },
    ],
  }
}

function isInitialPartnershipDocumentReady(value: unknown) {
  if (!value) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value !== 'object') return false
  const document = value as Record<string, any>
  if (document.isDeleted || document.status === 'deleted' || document.status === 'archived') return false
  return Boolean(document.storagePath || document.documentId || document.url || document.previewUrl || document.documentLinkId || document.name)
}

function serializeInitialPartnershipDocuments(form: Record<string, any>, slots: InitialPartnershipDocumentSlot[]) {
  return slots.filter(slot => isInitialPartnershipDocumentReady(form[slot.id])).map(slot => {
    const document = typeof form[slot.id] === 'object' && form[slot.id]
      ? form[slot.id] as Record<string, any>
      : { documentId: String(form[slot.id] || ''), name: String(form[slot.id] || '') }
    const safeDocument: Record<string, any> = { ...document }
    delete safeDocument.file
    return {
      ...safeDocument,
      slotId: slot.id,
      document_type: slot.id,
      slotTitle: slot.title,
      document_date: document.document_date || document.documentDate || null,
      description: document.description || document.notes || null,
    }
  })
}

function parseJsonRecord(value: unknown): Record<string, any> {
  if (!value) return {}
  if (typeof value === 'object') return value as Record<string, any>
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, any> : {}
  } catch {
    return {}
  }
}

function firstPositiveNumber(...values: unknown[]) {
  for (const value of values) {
    const number = parseLocalizedNumber(value)
    if (number > 0) return number
  }
  return 0
}

function parseLocalizedNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0
  const compact = value.trim().replace(/\s/g, '')
  if (!compact) return 0
  const normalized = compact.includes(',')
    ? compact.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(compact)
      ? compact.replace(/\./g, '')
      : compact
  const number = Number(normalized)
  return Number.isFinite(number) ? number : 0
}

function roundMoney(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100
}

function roundRatio(value: number) {
  return Math.round((Number.isFinite(value) ? value : 0) * 10000) / 10000
}

function formatCurrency(value: number, currency = 'TRY') {
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0)
  } catch {
    return `${formatNumber(value)} ${currency}`
  }
}

function currencyInputSuffix(currency = 'TRY') {
  const code = String(currency || 'TRY').toUpperCase()
  return code === 'TRY' ? 'TL' : code
}

function formatNumber(value: number) {
  return (Number.isFinite(value) ? value : 0).toLocaleString('tr-TR', { maximumFractionDigits: 4 })
}

function formatPercent(value: number) {
  return `%${formatNumber(value)}`
}

function getPartnerStatusLabel(status: RecordStatusFilterValue) {
  if (status === 'draft') return 'Taslak'
  if (status === 'active') return 'Aktif'
  return 'Pasif'
}

function getPartnerStatusDotClass(status: RecordStatusFilterValue) {
  if (status === 'draft') return 'border-amber-200 bg-amber-400 dark:border-amber-300'
  if (status === 'active') return 'border-emerald-200 bg-emerald-500 dark:border-emerald-300'
  return 'border-gray-300 bg-gray-500 dark:border-gray-500'
}

function PartnerStatusDot({ status }: { status: RecordStatusFilterValue }) {
  const label = getPartnerStatusLabel(status)

  return (
    <span className="inline-flex w-full justify-center" title={label} aria-label={label}>
      <span className={`h-3.5 w-3.5 rounded-full border ${getPartnerStatusDotClass(status)}`} aria-hidden="true" />
    </span>
  )
}

function PartnerNameCell({ value }: { value: any; row: any }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-medium">{value || '-'}</span>
    </div>
  )
}

function getPartnerAvatarUrl(partner: Record<string, any>) {
  const direct = optionalString(partner.avatar || partner.photo_url || partner.profile_image || partner.profileImage || partner.image)
  if (direct) return direct
  const image = Array.isArray(partner.photo_logo) ? partner.photo_logo.find(item => !!item) : null
  if (!image) return ''
  return optionalString(
    image.thumbnailUrl ||
    image.thumbnail_url ||
    image.previewUrl ||
    image.preview_url ||
    image.signedUrl ||
    image.signed_url ||
    image.url ||
    image.download_url
  )
}


function PartnerStatusSummary({ partner }: { partner?: Record<string, any> }) {
  const recordStatus = getPartnerRecordStatus(partner)
  const currentOwnership = partner?.current_ownership || null
  const transactions = Array.isArray(partner?.ownership_transaction_history)
    ? partner?.ownership_transaction_history
    : []
  const lastTransaction = transactions[0]
  const ownershipStatus = recordStatus === 'passive'
    ? 'Pasif'
    : Number(currentOwnership?.current_share_ratio || 0) > 0
      ? 'Aktif ortaklık'
      : transactions.length
        ? 'İşlem bekliyor'
        : 'Başlatılmadı'
  const warnings = normalizeSummaryWarnings(currentOwnership?.warnings)

  return (
    <div className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-900/40 md:grid-cols-2">
      <StatusSummaryItem label="Kayıt Durumu" value={getPartnerStatusLabel(recordStatus)} />
      <StatusSummaryItem label="Güncel Ortaklık Durumu" value={ownershipStatus} />
      <StatusSummaryItem label="Son Ortaklık İşlemi" value={lastTransaction?.transaction_type || '-'} />
      <StatusSummaryItem label="Yürürlük Başlangıcı" value={formatSummaryDate(lastTransaction?.effective_date || partner?.start_date)} />
      <StatusSummaryItem label="Yürürlük Bitişi" value={formatSummaryDate(lastTransaction?.end_date || partner?.end_date)} />
      <StatusSummaryItem label="Uyarılar" value={warnings.length ? warnings.join(', ') : '-'} />
    </div>
  )
}

function StatusSummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100" title={value}>{value}</div>
    </div>
  )
}

function normalizeSummaryWarnings(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean)
  const text = String(value || '').trim()
  return text ? [text] : []
}

function formatSummaryDate(value: unknown) {
  if (!value) return '-'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('tr-TR')
}

async function fetchApprovedOwnershipTransactionsForPartner(partner: Record<string, any>): Promise<OwnershipTransactionHistoryRow[]> {
  const companyId = partner.company_id || partner.company_id
  const partnerId = partner.id
  if (!companyId || !partnerId) return []

  const rows = await ownershipTransactionsService.approvedForCompany(companyId)

  return rows
    .filter((transaction: OwnershipTransactionHistoryRow) =>
      transaction.from_partner_id === partnerId ||
      transaction.to_partner_id === partnerId ||
      transaction.affected_partner_id === partnerId
    )
    .sort((a: OwnershipTransactionHistoryRow, b: OwnershipTransactionHistoryRow) =>
      String(b.effective_date || b.transaction_date || b.created_at || '').localeCompare(String(a.effective_date || a.transaction_date || a.created_at || ''))
    )
}

function CurrentOwnershipPanel({ value, section }: { value?: CurrentOwnershipRow | null; section: 'capital' | 'rights' }) {
  if (!value) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700">
        <p>Onaylı ortaklık işlemi kaynaklı hesaplanan değer yok.</p>
      </div>
    )
  }

  const items = section === 'capital'
    ? [
        ['Hisse Oranı', `%${Number(value.current_share_ratio || 0).toFixed(2)}`],
        ['Oy Hakkı', `%${Number(value.current_voting_ratio || 0).toFixed(2)}`],
        ['Kar Payı', `%${Number(value.current_profit_ratio || 0).toFixed(2)}`],
        ['Sermaye', Number(value.current_capital_amount || 0).toLocaleString('tr-TR')],
        ['Pay Adedi', Number(value.current_share_units || 0).toLocaleString('tr-TR')],
      ]
    : [
        ['Kontrol Hakkı', value.has_control_right ? 'Var' : 'Yok'],
        ['Kontrol Türü', value.control_type || '-'],
        ['Veto Hakkı', value.has_veto_right ? 'Var' : 'Yok'],
        ['YK Aday Hakkı', value.has_board_nomination_right ? 'Var' : 'Yok'],
        ['İmtiyazlı Pay', value.has_privileged_share ? 'Var' : 'Yok'],
        ['Nihai Faydalanıcı', value.is_beneficial_owner ? 'Evet' : 'Hayır'],
        ['Faydalanma Oranı', value.beneficial_ratio ? `%${Number(value.beneficial_ratio).toFixed(2)}` : '-'],
      ]

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
        Bu değerler yalnızca onaylı Ortaklık İşlemleri üzerinden hesaplanır. Pay, oy, kar payı, sermaye, imtiyaz, veto, yönetim kurulu aday gösterme veya kontrol hakkı değişiklikleri Lifecycle ve Resmi İşlemler aksiyonlarından yönetilir.
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([label, itemValue]) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
            <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
            <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{itemValue}</div>
          </div>
        ))}
      </div>
      {Array.isArray(value.warnings) && value.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {value.warnings.map(warning => <div key={warning}>{warning}</div>)}
        </div>
      )}
    </div>
  )
}

function PartnerReadinessMetric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}) {
  return (
    <div className={cn(
      'min-w-0 rounded-lg border p-3',
      tone === 'neutral' && 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50',
      tone === 'success' && 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30',
      tone === 'warning' && 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30',
      tone === 'danger' && 'border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30',
    )}>
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white" title={value}>{value}</div>
    </div>
  )
}

function OwnershipFlagsCell({ value }: { value: unknown }) {
  const flags = Array.isArray(value)
    ? value.map(item => String(item || '').trim()).filter(Boolean)
    : String(value || '').split(',').map(item => item.trim()).filter(Boolean)

  if (!flags.length) {
    return <span className="text-xs text-gray-400">Yok</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {flags.slice(0, 3).map(flag => (
        <span key={flag} className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-200">
          {flag}
        </span>
      ))}
      {flags.length > 3 && <span className="text-xs text-gray-500">+{flags.length - 3}</span>}
    </div>
  )
}

function OwnershipWarningsCell({ value }: { value: unknown }) {
  const warnings = Array.isArray(value)
    ? value.map(item => String(item || '').trim()).filter(Boolean)
    : String(value || '').split('|').map(item => item.trim()).filter(Boolean)

  if (!warnings.length) return <span className="text-xs text-gray-400">-</span>

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
      <AlertCircle size={12} />
      {warnings.length}
    </span>
  )
}

function RepresentativeAuthoritiesPanel({ value }: { value: RepresentativeAuthorityRow[] }) {
  if (!value.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700">
        Bu ortak için Temsilciler sayfasından gelen active yetki kaydı bulunamadı.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
      {value.map(authority => (
        <div key={authority.id} className="border-b border-gray-100 p-3 last:border-b-0 dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {authority.authority_types?.length ? (
                  <span className="flex flex-wrap gap-1.5">
                    {authority.authority_types.map(type => (
                      <span key={type} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        {toAuthorityLabel(type)}
                      </span>
                    ))}
                  </span>
                ) : (
                  toAuthorityLabel(authority.job_title) || 'Yetki Kaydı'
                )}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {authority.start_date || '-'} - {authority.end_date || 'Süresiz'} · {authority.status || 'Aktif'}
              </div>
            </div>
            <div className="text-right text-xs text-gray-600 dark:text-gray-300">
              {authority.signature_type || 'İmza tipi yok'}
              {authority.transaction_limit ? ` · ${Number(authority.transaction_limit).toLocaleString('tr-TR')} ${authority.currency || 'TRY'}` : ''}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {authority.requires_joint_signature && <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">Müşterek imza</span>}
            {authority.can_approve_alone && <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">Tek başına onay</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function PartnerHistorySections({ value }: { value?: PartnerHistorySectionsValue }) {
  const ownershipTransactions = Array.isArray(value?.ownershipTransactions) ? value.ownershipTransactions : []
  const technicalChanges = Array.isArray(value?.technicalChanges) ? value.technicalChanges : []

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Ortaklık İşlem Geçmişi</h4>
        {ownershipTransactions.length ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700">
            {ownershipTransactions.map(transaction => (
              <div key={transaction.id} className="border-b border-gray-100 px-3 py-2 text-sm last:border-b-0 dark:border-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {transaction.transaction_no || getOwnershipTransactionTypeLabel(transaction.transaction_type) || 'Ortaklık işlemi'}
                  </span>
                  <span className="text-xs text-emerald-700 dark:text-emerald-300">Onaylı</span>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {transaction.effective_date || transaction.transaction_date || '-'} · {getOwnershipTransactionTypeLabel(transaction.transaction_type) || 'İşlem'}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
                  {transaction.share_ratio != null && <span>Pay %{Number(transaction.share_ratio).toFixed(2)}</span>}
                  {transaction.voting_ratio != null && <span>Oy %{Number(transaction.voting_ratio).toFixed(2)}</span>}
                  {transaction.profit_ratio != null && <span>Kar %{Number(transaction.profit_ratio).toFixed(2)}</span>}
                  {transaction.capital_amount != null && <span>Sermaye {Number(transaction.capital_amount).toLocaleString('tr-TR')}</span>}
                  {transaction.has_control_right && <span>Kontrol hakkı</span>}
                  {transaction.has_veto_right && <span>Veto hakkı</span>}
                  {transaction.has_board_nomination_right && <span>YK aday hakkı</span>}
                  {transaction.has_privileged_share && <span>İmtiyazlı pay</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700">
            Onaylı ortaklık işlemi bulunamadı.
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Teknik Değişiklik Geçmişi</h4>
        {technicalChanges.length ? (
          <div className="space-y-2">
            {technicalChanges.map((item, index) => (
              <div key={index} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                {item.text || `${item.changed_at || item.date || ''} → ${item.field || item.action || 'Değişiklik'}: ${item.old_value ?? item.oldValue ?? '-'} → ${item.new_value ?? item.newValue ?? item.value ?? '-'}`}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700">
            Teknik değişiklik geçmişi bulunamadı.
          </div>
        )}
      </section>
    </div>
  )
}

function normalizePartnerForForm(partner: PartnerRow) {
  const profile = partner.partner_profile || {}
  const masterFields = partner as PartnerRow & {
    first_name?: string
    last_name?: string
    trade_name?: string
    legal_name?: string
    short_name?: string
    nationality?: string
    nationality_country?: string
    national_id?: string
    passport_no?: string
    phones?: Array<Record<string, any>>
    emails?: Array<Record<string, any>>
  }
  const partnerType = normalizePartnerType(profile.partner_type || partner.owner_kind || partner.partner_type)
  const identityNumber = partner.identity_number || partner.identity_tax_number || ''
  const phones = Array.isArray(masterFields.phones) ? masterFields.phones : []
  const emails = Array.isArray(masterFields.emails) ? masterFields.emails : []
  const recordStatus = getPartnerRecordStatus(partner)
  const status = recordStatus === 'passive' ? 'Pasif' : recordStatus === 'draft' ? 'Taslak' : partner.status || profile.status || 'Aktif'
  return {
    ...profile,
    ...partner,
    company_id: partner.company_id || partner.company_id || '',
    partner_type: partnerType,
    first_name: masterFields.first_name || masterFields.trade_name || masterFields.legal_name || '',
    last_name: masterFields.last_name || masterFields.short_name || '',
    identity_number: identityNumber,
    nationality: masterFields.nationality || masterFields.nationality || masterFields.nationality_country || 'TR',
    national_id: masterFields.national_id || masterFields.national_id || (partnerType === 'person' && String(identityNumber).length === 11 ? identityNumber : ''),
    passport_no: masterFields.passport_no || masterFields.passport_no || (partnerType === 'person' && String(identityNumber).length !== 11 ? identityNumber : ''),
    phones,
    emails,
    end_date: profile.end_date ?? partner.end_date ?? '',
    status,
    record_status: recordStatus,
    photo_logo: partner.photo_logo || [],
    partner_documents: partner.partner_documents || [],
    current_ownership: partner.current_ownership || { company_id: partner.company_id || partner.company_id, partner_id: partner.id },
    representative_authorities: (partner as any).representative_authorities || [],
    history_sections: {
      ownershipTransactions: partner.ownership_transaction_history || [],
      technicalChanges: partner.history || [],
    },
    field_history: buildEntityFieldHistory(partner.history || []),
  }
}

function normalizePartnerType(value: unknown): 'person' | 'organization' {
  const text = String(value || '').toLocaleLowerCase('tr-TR')
  if (['organization', 'company', 'tüzel_kisi', 'sirket', 'şirket'].includes(text)) return 'organization'
  return 'person'
}

function ownershipKey(companyId?: string | null, partnerId?: string | null) {
  return `${companyId || ''}::${partnerId || ''}`
}

function hasProjectionOwnership(partner: PartnerRow) {
  return partner.current_share_ratio !== undefined
    || partner.current_voting_ratio !== undefined
    || partner.current_profit_ratio !== undefined
    || partner.current_capital_amount !== undefined
    || partner.current_share_units !== undefined
}

function toCurrentOwnershipRow(partner?: Record<string, any> | null): CurrentOwnershipRow | null {
  if (!partner) return null
  if (partner.current_ownership && typeof partner.current_ownership === 'object') {
    return partner.current_ownership as CurrentOwnershipRow
  }

  const hasCurrentValues = partner.current_share_ratio !== undefined
    || partner.current_voting_ratio !== undefined
    || partner.current_profit_ratio !== undefined
    || partner.current_capital_amount !== undefined
    || partner.current_share_units !== undefined

  if (!hasCurrentValues) return null

  return {
    company_id: String(partner.company_id || ''),
    partner_id: String(partner.id || partner.partner_id || ''),
    current_share_ratio: Number(partner.current_share_ratio || 0),
    current_voting_ratio: Number(partner.current_voting_ratio || 0),
    current_profit_ratio: Number(partner.current_profit_ratio || 0),
    current_capital_amount: Number(partner.current_capital_amount || 0),
    current_share_units: Number(partner.current_share_units || 0),
    has_control_right: !!partner.has_control_right,
    control_type: partner.control_type,
    has_veto_right: !!partner.has_veto_right,
    has_board_nomination_right: !!partner.has_board_nomination_right,
    has_privileged_share: !!(partner.has_privileged_share || partner.has_privilege),
    is_beneficial_owner: !!(partner.is_beneficial_owner || partner.beneficial_owner),
    beneficial_ratio: Number(partner.beneficial_ratio || 0),
  }
}

function resolvePartnerCurrentOwnership(
  partner: Record<string, any>,
  ownershipRows: CurrentOwnershipRow[],
  companyPartners: Record<string, any>[],
) {
  return toCurrentOwnershipRow(partner)
    || ownershipRows.find(row => row.company_id === partner.company_id && row.partner_id === partner.id)
    || toCurrentOwnershipRow(companyPartners.find(row => row.id === partner.id))
}

function getCompanyCurrentOwnershipRows(
  companyId: unknown,
  companyPartners: Record<string, any>[],
  ownershipRows: CurrentOwnershipRow[],
) {
  const normalizedCompanyId = String(companyId || '')
  if (!normalizedCompanyId) return []
  const directRows = ownershipRows.filter(row => row.company_id === normalizedCompanyId)
  if (directRows.length) return directRows

  return companyPartners
    .filter(row => String(row.company_id || '') === normalizedCompanyId)
    .map(toCurrentOwnershipRow)
    .filter((row): row is CurrentOwnershipRow => !!row)
}

function calculateCompanyOwnershipTotals(rows: CurrentOwnershipRow[]) {
  return rows.reduce((acc, row) => ({
    share: roundRatio(acc.share + Number(row.current_share_ratio || 0)),
    voting: roundRatio(acc.voting + Number(row.current_voting_ratio || 0)),
    profit: roundRatio(acc.profit + Number(row.current_profit_ratio || 0)),
    capital: roundMoney(acc.capital + Number(row.current_capital_amount || 0)),
  }), { share: 0, voting: 0, profit: 0, capital: 0 })
}

function hasCurrentOwnershipRights(row?: CurrentOwnershipRow | null) {
  return !!row && (
    Number(row.current_share_ratio || 0) > 0
    || Number(row.current_voting_ratio || 0) > 0
    || Number(row.current_profit_ratio || 0) > 0
    || Number(row.current_capital_amount || 0) > 0
    || Number(row.current_share_units || 0) > 0
  )
}

function getPartnerOwnershipFlags(partner?: Record<string, any> | null) {
  const currentOwnership = toCurrentOwnershipRow(partner)
  const flags: string[] = []
  if (currentOwnership?.has_privileged_share || partner?.has_privileged_share || partner?.has_privilege) flags.push('İmtiyaz')
  if (currentOwnership?.has_control_right || partner?.has_control_right) flags.push('Kontrol')
  if (currentOwnership?.has_veto_right || partner?.has_veto_right) flags.push('Veto')
  if (currentOwnership?.has_board_nomination_right || partner?.has_board_nomination_right) flags.push('YK aday')
  if (currentOwnership?.is_beneficial_owner || partner?.is_beneficial_owner || partner?.beneficial_owner) flags.push('Faydalanıcı')
  return flags
}

function buildPartnerOwnershipWarnings(partner?: Record<string, any> | null, transactions: OwnershipTransactionHistoryRow[] = []) {
  const warnings = new Set<string>()
  const recordStatus = getPartnerRecordStatus(partner)
  const currentOwnership = toCurrentOwnershipRow(partner)
  normalizeSummaryWarnings(currentOwnership?.warnings).forEach(warning => warnings.add(warning))

  if (recordStatus === 'draft') {
    warnings.add('Taslak ortak kartı pay, oy, kar payı veya sermaye hakkı doğurmaz; İlk Ortaklık Girişi gerekir.')
  }
  if (recordStatus === 'active' && !hasCurrentOwnershipRights(currentOwnership)) {
    warnings.add('Aktif kayıt için current ownership read modeli boş görünüyor; ownership projection veya işlem geçmişi kontrol edilmeli.')
  }
  if (recordStatus === 'passive' && hasCurrentOwnershipRights(currentOwnership)) {
    warnings.add('Pasif ortak üzerinde hala current ownership hakkı görünüyor; çıkış işlemi etkisi kontrol edilmeli.')
  }
  if (hasCurrentOwnershipRights(currentOwnership) && transactions.length === 0) {
    warnings.add('Hak değerleri var ancak işlem geçmişi henüz yüklenmedi; Geçmiş sekmesinde transaction kaydı kontrol edin.')
  }

  return Array.from(warnings)
}

function buildCompanyOwnershipDistributionWarnings(
  totals: { share: number; voting: number; profit: number; capital: number },
  hasRows: boolean,
) {
  if (!hasRows) return ['Şirket current ownership toplamları okunamadı; pay devri/çıkış ve sermaye işlemleri precheck aşamasında blocking döndürebilir.']

  const warnings: string[] = []
  if (Math.abs(totals.share - 100) >= 0.01) warnings.push(`Şirket toplam payı ${formatPercent(totals.share)} görünüyor; %100 değilse bazı ownership işlemleri blocking olabilir.`)
  if (totals.voting > 0 && Math.abs(totals.voting - 100) >= 0.01) warnings.push(`Şirket toplam oy hakkı ${formatPercent(totals.voting)} görünüyor; oy hakkı dağılımı kontrol edilmeli.`)
  if (totals.profit > 0 && Math.abs(totals.profit - 100) >= 0.01) warnings.push(`Şirket toplam kar payı ${formatPercent(totals.profit)} görünüyor; kar payı dağılımı kontrol edilmeli.`)
  return warnings
}

function getPartnerRecordStatus(partner?: Record<string, any> | null): RecordStatusFilterValue {
  if (!partner) return 'draft'
  if (partner.record_status === 'passive' || isSoftDeletedRecord(partner) || partner.status === 'Pasif') return 'passive'
  if (partner.record_status === 'active' || partner.status === 'Aktif') return 'active'
  return 'draft'
}

function formatCompanyOptionLabel(company: Record<string, any>) {
  const title = company.short_name || company.trade_name || 'Şirket'
  return company.tax_number ? `${title} — ${company.tax_number}` : title
}

function getCompanyLifecycleStatusForPartnerOption(company: Partial<CompanyOption>) {
  const raw = company.record_status || company.company_status || (company.is_deleted ? 'deregistered' : 'active')
  return String(raw || '').toLocaleLowerCase('tr-TR')
}

function isActiveCompanyForNewPartner(company: CompanyOption) {
  if (!company.value || company.is_deleted) return false
  const recordStatus = String(company.record_status || '').toLocaleLowerCase('tr-TR')
  const companyStatus = String(company.company_status || '').toLocaleLowerCase('tr-TR')
  if (recordStatus && recordStatus !== 'active' && recordStatus !== 'opened') return false
  if (companyStatus && companyStatus !== 'active' && companyStatus !== 'opened') return false
  const lifecycleStatus = getCompanyLifecycleStatusForPartnerOption(company)
  return lifecycleStatus === 'active' || lifecycleStatus === 'opened'
}

function getPartnerLifecycleOperationProgress(status: RecordStatusFilterValue): FormOperationProgress {
  if (status === 'draft') {
    return { activeActionKeys: [PARTNER_OWNERSHIP_ENTRY_ACTION_KEY] }
  }
  return { completedActionKeys: [PARTNER_OWNERSHIP_ENTRY_ACTION_KEY] }
}

function withPartnerConcurrency(payload: Record<string, any>, partner?: Record<string, any> | null) {
  return {
    ...payload,
    base_version: partner?.version,
    base_updated_at: partner?.updated_at,
  }
}

function buildPartnerChangedPatch(partner: Record<string, any> | null | undefined, changes: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(changes).filter(([field, value]) =>
      value !== undefined && JSON.stringify(value ?? null) !== JSON.stringify(partner?.[field] ?? null)
    )
  )
}

function findInitialPartnershipTransaction(partner?: Record<string, any> | null): OwnershipTransactionHistoryRow | null {
  const transactions = Array.isArray(partner?.ownership_transaction_history)
    ? partner.ownership_transaction_history as OwnershipTransactionHistoryRow[]
    : []

  return transactions.find(transaction =>
    isInitialPartnershipEntryType(String(transaction.transaction_type || '')) &&
    (transaction.approval_status === 'approved' || transaction.status === 'active')
  ) || transactions.find(transaction =>
    isInitialPartnershipEntryType(String(transaction.transaction_type || ''))
  ) || null
}

function normalizePayload(raw: Record<string, any>, companies: Option[], mode: FormMode = 'create') {
  const payload = Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  )

  payload.company_id = payload.company_id
  if (payload.master_entity_kind === 'person') payload.partner_type = 'person'
  if (payload.master_entity_kind === 'organization') payload.partner_type = 'organization'
  payload.partner_type = normalizePartnerType(payload.partner_type || payload.owner_kind)
  const normalizedGender = normalizeGenderValue(payload.gender)
  if (normalizedGender) payload.gender = normalizedGender
  const hasNationalityLikeValue = hasOwnPayloadValue(payload, 'nationality_country') || hasOwnPayloadValue(payload, 'country') || hasOwnPayloadValue(payload, 'nationality')
  if (mode === 'create' || hasNationalityLikeValue) {
    payload.nationality_country = normalizeCountryId(payload.nationality_country || payload.country || payload.nationality || 'TR')
    payload.nationality = normalizeCountryId(payload.nationality || payload.nationality_country)
    payload.country = normalizeCountryId(payload.country || payload.nationality_country || payload.nationality || 'TR')
  }
  payload.identity_number = payload.identity_number || payload.national_id || payload.tax_number || payload.passport_no || payload.trade_registry_no || payload.mersis_number
  payload.owner_kind = payload.partner_type || payload.owner_kind
  if (payload.partner_type === 'organization') {
    payload.trade_name = payload.first_name
    payload.short_name = payload.last_name
  }
  delete payload.share_ratio
  delete payload.voting_ratio
  delete payload.profit_ratio
  delete payload.share_units
  delete payload.nominal_value
  delete payload.capital_amount
  delete payload.share_class
  delete payload.has_privileged_share
  delete payload.has_privilege
  delete payload.has_control_right
  delete payload.control_type
  delete payload.has_board_nomination_right
  delete payload.has_veto_right
  delete payload.beneficial_owner
  delete payload.beneficial_ratio
  delete payload.is_beneficial_owner
  delete payload.is_ultimate_controller
  delete payload.source_type
  delete payload.source_id
  delete payload.current_ownership
  delete payload.representative_authorities
  delete payload.history_sections
  delete payload.ownership_transaction_history
  delete payload.timeline
  delete payload.__authoritiesLoaded
  delete payload.__ownershipLoaded
  delete payload.status
  delete payload.record_status
  delete payload.start_date
  delete payload.end_date
  delete payload.approval_status
  delete payload.workflow_status
  delete payload.transaction_status
  payload.field_history = undefined
  return payload
}

function hasOwnPayloadValue(payload: Record<string, any>, field: string) {
  return Object.prototype.hasOwnProperty.call(payload, field) && payload[field] !== ''
}

function normalizeGenderValue(value: unknown) {
  const text = String(value || '').trim()
  if (!text) return ''
  const normalized = text
    .toLocaleLowerCase('tr-TR')
    .replace(/\u0131/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (['male', 'm', 'e', 'erkek', 'bay'].includes(normalized)) return 'male'
  if (['female', 'f', 'k', 'kadin', 'bayan'].includes(normalized)) return 'female'
  return text
}

function getPartnerCompanySelectionError(payload: Record<string, any>, activeCompanies: Option[]): SaveError | null {
  if (!payload.company_id) {
    const error = new Error('Ortak kaydı oluşturmak için önce ortağı olduğu aktif şirketi seçmelisiniz.') as SaveError
    error.fieldErrors = { company_id: 'Ortağı Olduğu Şirket zorunludur' }
    error.toast = { type: 'warning', title: 'Aktif Şirket Seçin', message: error.message }
    return error
  }

  if (activeCompanies.length > 0 && !activeCompanies.some(company => company.value === payload.company_id)) {
    const error = new Error('Seçilen şirket aktif durumda olmadığı için bu şirkete yeni ortak eklenemez.') as SaveError
    error.fieldErrors = { company_id: 'Yalnızca aktif şirket seçilebilir' }
    error.toast = { type: 'warning', title: 'Şirket Aktif Değil', message: error.message }
    return error
  }

  return null
}

function getMissingPartnerFields(payload: Record<string, any>) {
  const partnerType = normalizePartnerType(payload.partner_type || payload.owner_kind)
  if (partnerType === 'person') {
    return [
      ['first_name', payload.first_name],
      ['last_name', payload.last_name],
      ['gender', payload.gender],
    ]
      .filter(([, value]) => !String(value || '').trim())
      .map(([field]) => field)
  }

  const missing: string[] = []
  if (!String(payload.country || payload.nationality_country || '').trim()) missing.push('country')
  if (!String(payload.trade_name || payload.first_name || '').trim()) missing.push('trade_name')
  if (!String(payload.identity_number || payload.tax_number || payload.trade_registry_no || payload.mersis_number || '').trim()) missing.push('tax_number')
  const country = normalizeCountryId(payload.country || payload.nationality_country || 'TR')
  if (country === 'TR' && !String(payload.trade_registry_no || payload.mersis_number || '').trim()) missing.push('trade_registry_no')
  return missing
}

function buildEntityFieldHistory(history: any[]) {
  const trackedMap: Record<string, string> = {
    share_ratio: 'share_ratio',
    voting_ratio: 'voting_ratio',
    profit_ratio: 'profit_ratio',
    control_type: 'control_type',
    status: 'status',
    start_date: 'start_date',
    end_date: 'end_date',
    source_id: 'source_id',
  }
  return history.reduce((acc: Record<string, any[]>, entry: any) => {
    const field = trackedMap[entry.field]
    if (!field) return acc
    acc[field] = [
      ...(acc[field] || []),
      {
        value: `${entry.old_value ?? '-'} → ${entry.new_value ?? '-'}`,
        date: entry.changed_at || entry.date || new Date().toISOString(),
        user: entry.changed_by || entry.user || 'Sistem Kullanıcısı',
      },
    ]
    return acc
  }, {})
}

function normalizePartnerSaveError(err: any): SaveError {
  if (err?.code === 'OPERATION_CONTROLLED_FIELDS') {
    const controlledFields = Array.isArray(err.details?.fields)
      ? err.details.fields
          .map((field: any) => FIELD_LABELS[field.field] || field.label || field.field)
          .filter(Boolean)
      : []
    const fieldList = controlledFields.length ? ` (${controlledFields.join(', ')})` : ''
    const error = new Error(`Ortaklık hak alanları kart güncellemesiyle değiştirilemez${fieldList}. İlk Ortaklık Girişi, Pay Devri, Ortaklıktan Çıkış veya Düzeltme Kaydı işlemini kullanın.`) as SaveError
    error.toast = {
      type: 'warning',
      title: 'Ortaklık İşlemi Gerekli',
      message: error.message,
    }
    return error
  }

  return err
}

async function createSaveError(response: Response, fallback: string): Promise<SaveError> {
  const body = await response.json().catch(() => ({}))
  const code = body.code || `HTTP_${response.status}`
  const zodFieldErrors = body.details?.fieldErrors || {}
  const fields = Object.keys(zodFieldErrors)
  const rawMessage = String(body.error || '')
  const masterPersonFields = rawMessage.includes('Adı') || rawMessage.includes('Soyadı') || rawMessage.includes('Cinsiyeti')
    ? ['first_name', 'last_name', 'gender'].filter(field => rawMessage.includes(FIELD_LABELS[field]))
    : []
  const validationFields = fields.length > 0 ? fields : masterPersonFields

  if ((code === 'VALIDATION_FAILED' || masterPersonFields.length > 0) && validationFields.length > 0) {
    const message = validationFields.map(field => FIELD_LABELS[field] || field).join(', ')
    const error = new Error(`Eksik Zorunlu Alan [${message}]`) as SaveError
    error.fieldErrors = Object.fromEntries(validationFields.map(field => [field, `${FIELD_LABELS[field] || field} zorunludur`]))
    error.toast = { type: 'warning', title: 'Eksik Zorunlu Alan', message }
    return error
  }

  const message = `${body.error || fallback} [${code}]`
  const error = new Error(message) as SaveError
  error.toast = { type: 'error', title: 'Kayıt Başarısız', message }
  return error
}
