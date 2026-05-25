'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { BadgeCheck, ListChecks, PencilLine, Trash2 } from 'lucide-react'
import { EntityForm, FormField, FormMode, FormOperationActionGroup, FormTab } from '@/components/ui/EntityForm'
import { PageBanner } from '@/components/ui/PageBanner'
import { RecordLifecycleWizard, type RecordLifecycleWizardStep } from '@/components/ui/RecordLifecycleWizard'
import { SmartDataTable, ColumnDef, SortConfig, WidgetDef, type TableRowAction, type TableStatusFilterOption } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { normalizeCountryId } from '@/lib/reference/country-nationalities'
import { isSoftDeletedRecord } from '@/lib/forms/entityState'
import { createProgressiveFormLoadStages } from '@/lib/forms/progressiveFormLoading'
import { invalidateEntityDetailCache, readEntityDetailCache, writeEntityDetailCache } from '@/lib/forms/entityDetailCache'
import { companyService } from '@/lib/services/companyService'
import type { ListMeta } from '@/lib/api/listEndpoint'

type PageState = 'list' | 'create' | 'view' | 'edit'
type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }
type SaveError = Error & { toast?: ToastState; fieldErrors?: Record<string, string> }
type Option = { value: string; label: string }

interface RepresentativeRow {
  id: string
  company_id: string
  person_kind?: 'person' | 'organization'
  source_type?: string
  source_id?: string
  display_name?: string
  full_name?: string
  phone?: string
  email?: string
  phones?: Array<Record<string, any>>
  emails?: Array<Record<string, any>>
  address?: string
  city?: string
  district?: string
  authority_types?: string[]
  status?: string
  record_status?: 'draft' | 'active' | 'suspended' | 'expired' | 'terminated' | 'passive'
  start_date?: string
  end_date?: string
  signature_type?: string
  transaction_limit?: number
  currency?: string
  requires_joint_signature?: boolean
  can_approve_alone?: boolean
  is_deleted?: boolean
  history?: Array<Record<string, any>>
  photo_logo?: Array<Record<string, any>>
  authority_documents?: Array<Record<string, any>>
  representative_profile?: Record<string, any>
  current_authority?: Record<string, any>
  authority_transaction_history?: Array<Record<string, any>>
  version?: number
  updated_at?: string
}

const FIELD_LABELS: Record<string, string> = {
  company_id: 'Şirket',
  person_or_entity_type: 'Kişi / Kurum Tipi',
  first_name: 'Ad',
  last_name: 'Soyad',
  trade_name: 'Ticari Unvan',
  short_name: 'Kısa Unvan',
  primary_authority_type: 'Ana Yetki Tipi',
  start_date: 'Başlangıç Tarihi',
  status: 'Yetki Durumu',
  signature_type: 'İmza Türü',
  authority_limit: 'Yetki Limiti',
  currency: 'Para Birimi',
}

const AUTHORITY_OPTIONS: Option[] = [
  { value: 'signature_authority', label: 'İmza Yetkilisi' },
  { value: 'bank_authority', label: 'Banka Yetkilisi' },
  { value: 'gib_authority', label: 'GİB Yetkilisi' },
  { value: 'sgk_authority', label: 'SGK Yetkilisi' },
  { value: 'contract_authority', label: 'Sözleşme Yetkilisi' },
  { value: 'purchase_approval_authority', label: 'Satınalma Onay Yetkilisi' },
  { value: 'payment_approval_authority', label: 'Ödeme Onay Yetkilisi' },
  { value: 'responsible_manager', label: 'Mesul Müdür' },
  { value: 'legal_representative', label: 'Kanuni Temsilci' },
]

const AUTHORITY_LABEL_BY_VALUE = Object.fromEntries(AUTHORITY_OPTIONS.map(option => [option.value, option.label]))
const REPRESENTATIVE_AUTHORITY_TRANSACTION_TYPES = [
  'Temsilcilik Başlatma',
  'Yetki Yenileme',
  'Yetki Kapsamı Değişikliği',
  'Limit Değişikliği',
  'Askıya Alma',
  'Sonlandırma',
  'Düzeltme Kaydı',
  'Ters Kayıt',
] as const
type RepresentativeAuthorityTransactionType = typeof REPRESENTATIVE_AUTHORITY_TRANSACTION_TYPES[number]

const REPRESENTATIVE_LIFECYCLE_CONTROL = {
  category: 'lifecycle' as const,
  operations: ['Taslak Oluşturma', 'Yetkilendirme / Aktive Etme', 'Askıya Alma', 'Sonlandırma'],
}

const REPRESENTATIVE_AUTHORITY_CONTROL = {
  category: 'registration' as const,
  operations: ['Yetki Yenileme', 'Yetki Kapsamı Değişikliği', 'Limit Değişikliği', 'Düzeltme Kaydı', 'Ters Kayıt'],
}

const REPRESENTATIVE_OPERATION_CONTROLLED_FIELDS = new Set([
  'status',
  'record_status',
  'start_date',
  'end_date',
  'primary_authority_type',
  'authority_type',
  'authority_types',
  'job_title',
  'signature_type',
  'authority_limit',
  'transaction_limit',
  'payment_approval_limit',
  'purchase_approval_limit',
  'bank_transaction_limit',
  'contract_signature_limit',
  'currency',
  'bank_currency',
  'limit_currency',
  'limit_start_date',
  'limit_end_date',
  'requires_joint_signature',
  'can_approve_alone',
  'bank_authority_level',
  'department_scope',
  'gib_permissions',
  'can_submit_declaration',
  'can_process_e_invoice',
  'sgk_permissions',
  'can_submit_hiring_notice',
  'can_submit_termination_notice',
  'official_correspondence_authority',
  'current_authority',
  'authority_transaction_history',
])

const REPRESENTATIVE_CREATE_HIDDEN_HERO_FIELDS = new Set([
  'start_date',
  'end_date',
  'primary_authority_type',
  'signature_type',
  'authority_limit',
  'currency',
])

const REPRESENTATIVE_STATUS_FILTER_OPTIONS: TableStatusFilterOption[] = [
  { value: 'draft', label: 'Taslak', tone: 'draft' },
  { value: 'active', label: 'Aktif', tone: 'active' },
  { value: 'suspended', label: 'Askıda', tone: 'neutral' },
  { value: 'terminated', label: 'Sona Erdi', tone: 'passive' },
  { value: 'expired', label: 'Süresi Dolmuş', tone: 'passive' },
  { value: 'passive', label: 'Pasif', tone: 'passive' },
]

const DEFAULT_REPRESENTATIVE_STATUS_FILTERS = ['draft', 'active', 'suspended', 'terminated', 'expired']

function toAuthorityValue(value: string) {
  return value
}

function toAuthorityLabel(value: string) {
  return AUTHORITY_LABEL_BY_VALUE[value] || value
}

function getRepresentativePrimaryAuthority(representative: Record<string, any>) {
  const currentAuthority = representative.current_authority || {}
  const candidates = [
    currentAuthority.primary_authority_type,
    Array.isArray(currentAuthority.authority_types) ? currentAuthority.authority_types[0] : null,
    currentAuthority.authority_type,
    representative.job_title,
    representative.primary_authority_type,
    representative.representative_profile?.primary_authority_type,
    Array.isArray(representative.authority_types) ? representative.authority_types[0] : null,
    representative.authority_type,
  ]
  return candidates.map(value => String(value || '').trim()).find(Boolean)
}

const columns: ColumnDef[] = [
  { key: 'display_name', label: 'Temsilci Adı/Ünvanı', type: 'text', width: 260, minWidth: 180, sortable: true, category: 'Kimlik', required: true },
  { key: 'representative_type_label', label: 'Temsilci Tipi', type: 'enum', width: 160, category: 'Kimlik', required: true },
  { key: 'person_kind_label', label: 'Kişi/Kurum Tipi', type: 'enum', width: 150, category: 'Kimlik', required: true },
  { key: 'source_type_label', label: 'Kaynak Türü', type: 'enum', width: 150, category: 'Kimlik' },
  { key: 'primary_authority_type', label: 'Ana Yetki Tipi', type: 'enum', width: 180, category: 'Yetki', required: true },
  { key: 'signature_type_label', label: 'İmza Türü', type: 'enum', width: 130, category: 'Yetki' },
  { key: 'authority_status_label', label: 'Yetki Durumu', type: 'enum', width: 130, sortable: true, category: 'Durum', required: true },
  { key: 'company_name', label: 'Bağlı Şirket', type: 'text', width: 220, category: 'Şirket', required: true },
  { key: 'start_date', label: 'Yürürlük Başlangıç Tarihi', type: 'date', width: 150, category: 'Tarih' },
  { key: 'last_operation_label', label: 'Son İşlem', type: 'enum', width: 180, category: 'Durum' },
  { key: 'record_status_label', label: 'Durum', type: 'enum', width: 120, sortable: true, category: 'Durum', required: true },
]

const heroFields: FormField[] = [
  {
    name: 'company_id',
    label: 'Bağlı Şirket',
    type: 'select',
    required: true,
    searchable: true,
    controlledByOperation: { ...REPRESENTATIVE_LIFECYCLE_CONTROL, allowDraftEdit: true },
  },
  {
    name: 'person_or_entity_type',
    label: 'Kişi / Kurum Tipi',
    type: 'select',
    defaultValue: 'person',
    options: [
      { value: 'person', label: 'Gerçek Kişi' },
      { value: 'organization', label: 'Tüzel Kişi' },
    ],
  },
  {
    name: 'source_type',
    label: 'Kaynak Türü',
    type: 'select',
    defaultValue: 'new',
    options: [
      { value: 'new', label: 'Yeni Kayıt' },
      { value: 'master_person', label: 'Mevcut Kişi Master' },
      { value: 'master_organization', label: 'Mevcut Kurum Master' },
      { value: 'partner', label: 'Ortak Kaydı' },
      { value: 'employee', label: 'Çalışan Kaydı' },
      { value: 'external', label: 'Harici Kaynak' },
    ],
  },
  {
    name: 'source_id',
    label: 'Kayıt Seçimi',
    type: 'text',
    placeholder: 'Master/kaynak kayıt ID veya referans',
    visibleWhen: { field: 'source_type', operator: 'notEquals', value: 'new' },
  },
  {
    name: 'identity_number',
    label: 'TCKN / Pasaport / VKN',
    type: 'text',
    required: true,
  },
  {
    name: 'record_status',
    label: 'Durum',
    type: 'custom',
    defaultValue: 'draft',
    hideLabel: true,
    visibleWhen: { field: '__record_status_badge_only', operator: 'equals', value: true },
    render: () => null,
  },
  { name: 'start_date', label: 'Yürürlük Başlangıç Tarihi', type: 'date', required: true },
  { name: 'end_date', label: 'Bitiş Tarihi', type: 'date' },
  {
    name: 'primary_authority_type',
    label: 'Ana Yetki Tipi',
    type: 'select',
    required: true,
    options: AUTHORITY_OPTIONS,
  },
  {
    name: 'signature_type',
    label: 'İmza Türü',
    type: 'select',
    requiredWhen: { field: 'primary_authority_type', operator: 'equals', value: 'signature_authority' },
    options: [
      { value: 'Münferit', label: 'Münferit' },
      { value: 'Müşterek', label: 'Müşterek' },
      { value: 'Sınırlı', label: 'Sınırlı' },
      { value: 'Süresiz', label: 'Süresiz' },
      { value: 'Yok', label: 'Yok' },
    ],
  },
  {
    name: 'authority_limit',
    label: 'Yetki Limiti',
    type: 'number',
    requiredWhen: { field: 'primary_authority_type', includes: ['bank_authority', 'payment_approval_authority', 'purchase_approval_authority'] },
  },
  {
    name: 'currency',
    label: 'Para Birimi',
    type: 'select',
    defaultValue: 'TRY',
    requiredWhen: { field: 'primary_authority_type', includes: ['bank_authority', 'payment_approval_authority', 'purchase_approval_authority'] },
    options: [
      { value: 'TRY', label: 'TRY' },
      { value: 'USD', label: 'USD' },
      { value: 'EUR', label: 'EUR' },
      { value: 'GBP', label: 'GBP' },
    ],
  },
]

const tabs: FormTab[] = [
  {
    id: 'genel',
    label: 'Genel',
    fields: [
      { name: 'first_name', label: 'Ad', type: 'text', required: true, visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'person' } },
      { name: 'last_name', label: 'Soyad', type: 'text', required: true, visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'person' } },
      { name: 'trade_name', label: 'Ticari Unvan', type: 'text', required: true, visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'organization' } },
      { name: 'short_name', label: 'Kısa Unvan', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'organization' } },
      { name: 'birth_date', label: 'Doğum Tarihi', type: 'date', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'person' } },
      { name: 'birth_place', label: 'Doğum Yeri', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'person' } },
      {
        name: 'gender',
        label: 'Cinsiyet',
        type: 'select',
        visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'person' },
        options: [
          { value: 'male', label: 'Erkek' },
          { value: 'female', label: 'Kadın' },
        ],
      },
      { name: 'occupation', label: 'Meslek', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'person' } },
      { name: 'foundation_date', label: 'Kuruluş Tarihi', type: 'date', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'organization' } },
      { name: 'company_type', label: 'Şirket Türü', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'organization' } },
      { name: 'tax_office', label: 'Vergi Dairesi', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'organization' } },
      { name: 'mersis_number', label: 'MERSİS', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'organization' } },
      { name: 'trade_registry_no', label: 'Ticaret Sicil No', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'organization' } },
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
      { name: 'address', label: 'Adres', type: 'textarea', colSpan: 2 },
      { name: 'city', label: 'İl', type: 'text', compact: true },
      { name: 'district', label: 'İlçe', type: 'text', compact: true },
    ],
  },
  {
    id: 'yetkiler',
    label: 'Yetkiler',
    fields: [
      {
        name: 'authority_types',
        label: 'Yetki Tipleri',
        type: 'custom',
        colSpan: 3,
        render: ({ value, onChange, readOnly }) => <AuthoritySelector value={Array.isArray(value) ? value : []} onChange={onChange} readOnly={readOnly} />,
      },
      { name: 'authority_notes', label: 'Açıklama', type: 'textarea', colSpan: 3 },
      { name: 'document_reference_id', label: 'Belge Referansı', type: 'text' },
    ],
  },
  {
    id: 'banka',
    label: 'Banka',
    fields: [
      { name: 'bank_name', label: 'Banka', type: 'text' },
      { name: 'account_card', label: 'Hesap / Kart', type: 'text' },
      { name: 'bank_authority_level', label: 'Banka Yetki Seviyesi', type: 'text' },
      { name: 'transaction_limit', label: 'İşlem Limiti', type: 'number' },
      { name: 'bank_currency', label: 'Para Birimi', type: 'text', defaultValue: 'TRY' },
      { name: 'requires_joint_signature', label: 'Müşterek İmza Gerekli mi?', type: 'checkbox' },
      { name: 'can_approve_alone', label: 'Tek Başına Onaylayabilir mi?', type: 'checkbox' },
    ],
  },
  {
    id: 'kurumlar',
    label: 'Kamu Kurumları',
    fields: [
      { name: 'gib_permissions', label: 'GİB Yetkileri', type: 'textarea', colSpan: 2 },
      { name: 'can_submit_declaration', label: 'Beyanname Gönderme Yetkisi', type: 'checkbox' },
      { name: 'can_process_e_invoice', label: 'E-Fatura İşlem Yetkisi', type: 'checkbox' },
      { name: 'sgk_permissions', label: 'SGK Yetkileri', type: 'textarea', colSpan: 2 },
      { name: 'can_submit_hiring_notice', label: 'İşe Giriş Bildirgesi Yetkisi', type: 'checkbox' },
      { name: 'can_submit_termination_notice', label: 'İşten Çıkış Bildirgesi Yetkisi', type: 'checkbox' },
      { name: 'official_correspondence_authority', label: 'Resmi Yazışma Yetkisi', type: 'checkbox' },
    ],
  },
  {
    id: 'belgeler',
    label: 'Belgeler',
    fields: [
      {
        name: 'document_summary',
        label: 'Belgeler',
        type: 'custom',
        colSpan: 3,
        render: ({ value }) => <SummaryList items={Array.isArray(value) ? value : []} emptyText="Yüklü yetki belgesi bulunamadı." />,
      },
    ],
  },
  {
    id: 'limitler',
    label: 'Limitler',
    fields: [
      { name: 'purchase_approval_limit', label: 'Satınalma Onay Limiti', type: 'number' },
      { name: 'payment_approval_limit', label: 'Ödeme Onay Limiti', type: 'number' },
      { name: 'bank_transaction_limit', label: 'Banka İşlem Limiti', type: 'number' },
      { name: 'contract_signature_limit', label: 'Sözleşme İmza Limiti', type: 'number' },
      { name: 'limit_currency', label: 'Para Birimi', type: 'text', defaultValue: 'TRY' },
      { name: 'limit_start_date', label: 'Limit Başlangıç Tarihi', type: 'date' },
      { name: 'limit_end_date', label: 'Limit Bitiş Tarihi', type: 'date' },
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
        name: 'timeline',
        label: 'Geçmiş',
        type: 'custom',
        colSpan: 3,
        render: ({ value }) => <Timeline value={Array.isArray(value) ? value : []} />,
      },
    ],
  },
]

export default function TemsilcilerPage() {
  const [pageState, setPageState] = useState<PageState>('list')
  const [representatives, setRepresentatives] = useState<RepresentativeRow[]>([])
  const [companies, setCompanies] = useState<Option[]>([])
  const [companiesLoaded, setCompaniesLoaded] = useState(false)
  const [selectedRepresentative, setSelectedRepresentative] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [companyOptionsLoading, setCompanyOptionsLoading] = useState(false)
  const [companyOptionsError, setCompanyOptionsError] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [statusFilters, setStatusFilters] = useState<string[]>(DEFAULT_REPRESENTATIVE_STATUS_FILTERS)
  const [listQuery, setListQuery] = useState({ page: 1, pageSize: 50, search: '', sort: 'created_at', direction: 'desc' as 'asc' | 'desc' })
  const [listMeta, setListMeta] = useState<ListMeta>({ page: 1, pageSize: 50, total: 0, totalPages: 1 })
  const [toast, setToast] = useState<ToastState | null>(null)
  const [createWizardOpen, setCreateWizardOpen] = useState(false)
  const [authorityWizardOpen, setAuthorityWizardOpen] = useState(false)
  const [authorityWizardType, setAuthorityWizardType] = useState<RepresentativeAuthorityTransactionType>('Temsilcilik Başlatma')

  const isSelectedPassive = isSoftDeletedRecord(selectedRepresentative)
  const formMode: FormMode = pageState === 'create' ? 'create' : isSelectedPassive ? 'passive' : pageState === 'edit' ? 'edit' : 'view'
  const formLoadStages = createProgressiveFormLoadStages({
    mode: formMode,
    hasSnapshot: pageState !== 'create' && !!selectedRepresentative,
    detailLoading,
    detailError: !!formError,
    detailReady: pageState !== 'create' && !!selectedRepresentative && !detailLoading,
    hasMaster: !!(selectedRepresentative?.person_id || selectedRepresentative?.organization_id || selectedRepresentative?.master_record_id || selectedRepresentative?.master),
    referencesLoading: companyOptionsLoading,
    referencesReady: companiesLoaded,
    referencesError: companyOptionsError,
  })

  const loadData = async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      if (force) companyService.invalidateRelations()
      const representativePayload = await companyService.representativesList({
        statuses: statusFilters,
        includePassive: statusFilters.includes('passive'),
        useCache: !force,
        ...listQuery,
      })

      setRepresentatives(Array.isArray(representativePayload.data) ? representativePayload.data : [])
      setListMeta(representativePayload.meta ?? { page: listQuery.page, pageSize: listQuery.pageSize, total: representativePayload.data?.length ?? 0, totalPages: 1 })
      loadCompanyOptions(force).catch(() => setCompanies([]))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    loadData()
  }, [statusFilters, listQuery])

  const loadCompanyOptions = async (force = false) => {
    if (companiesLoaded && !force) return
    setCompanyOptionsLoading(true)
    setCompanyOptionsError(false)
    try {
    const companyPayload = await companyService.list({ useCache: !force })
    setCompanies(Array.isArray(companyPayload.data) ? companyPayload.data.map((company: any) => ({
      value: company.id,
      label: company.trade_name || company.short_name,
    })) : [])
    setCompaniesLoaded(true)
    } catch (error) {
      setCompanyOptionsError(true)
      throw error
    } finally {
      setCompanyOptionsLoading(false)
    }
  }

  useEffect(() => {
    if (pageState !== 'list') {
      loadCompanyOptions().catch(() => setCompanies([]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageState])

  const companyNameById = useMemo(() => Object.fromEntries(companies.map(company => [company.value, company.label])), [companies])
  const tableData = useMemo(() => representatives.map(representative => ({
    ...representative,
    display_name: representative.display_name || representative.full_name || '',
    person_kind_label: representative.person_kind === 'organization' ? 'Tüzel Kişi' : 'Gerçek Kişi',
    representative_type_label: getRepresentativeTypeLabel(representative),
    source_type_label: getRepresentativeSourceTypeLabel(representative.source_type),
    company_name: companyNameById[representative.company_id] || '-',
    primary_authority_type: toAuthorityLabel(getRepresentativePrimaryAuthority(representative) || '-'),
    signature_type_label: representative.current_authority?.signature_type || representative.signature_type || '-',
    status: representative.current_authority?.status || representative.status,
    record_status: representative.current_authority?.record_status || representative.record_status,
    authority_status_label: getRepresentativeStatusLabel(getRepresentativeRecordStatus(representative), representative.current_authority?.status || representative.status),
    record_status_label: getRepresentativeStatusLabel(getRepresentativeRecordStatus(representative), representative.current_authority?.status || representative.status),
    last_operation_label: getRepresentativeLastOperationLabel(representative),
    authority_limit: representative.current_authority?.transaction_limit ?? representative.transaction_limit,
  })), [companyNameById, representatives])

  const widgets: WidgetDef<any>[] = useMemo(() => [
    { key: 'total', label: 'Toplam Temsilci', render: () => tableData.length },
    { key: 'active', label: 'Aktif', render: () => tableData.filter(row => getRepresentativeRecordStatus(row) === 'active').length },
    { key: 'signature', label: 'İmza Yetkilisi', render: () => tableData.filter(row => row.authority_types?.some(type => toAuthorityValue(type) === 'signature_authority')).length },
    { key: 'bank', label: 'Banka Yetkilisi', render: () => tableData.filter(row => row.authority_types?.some(type => toAuthorityValue(type) === 'bank_authority')).length },
  ], [tableData])

  const handleListSortChange = (sorts: SortConfig[]) => {
    const sort = sorts[0]
    setListQuery(prev => ({ ...prev, page: 1, sort: sort?.key || 'created_at', direction: sort?.direction || 'desc' }))
  }

  const withRepresentativeOperationControl = (field: FormField): FormField => {
    if (!REPRESENTATIVE_OPERATION_CONTROLLED_FIELDS.has(field.name)) return field
    const control = ['status', 'record_status', 'start_date', 'end_date'].includes(field.name)
      ? REPRESENTATIVE_LIFECYCLE_CONTROL
      : REPRESENTATIVE_AUTHORITY_CONTROL
    return {
      ...field,
      required: false,
      requiredWhen: undefined,
      controlledByOperation: {
        ...(field.controlledByOperation || control),
        lockInModes: ['create', 'edit'],
        allowDraftEdit: !['status', 'record_status'].includes(field.name),
      },
    }
  }

  const configuredHeroFields = heroFields.filter(field => {
    if (pageState !== 'create') return true
    return !REPRESENTATIVE_CREATE_HIDDEN_HERO_FIELDS.has(field.name)
  }).map(field => {
    if (field.name === 'company_id') {
      return {
        ...field,
        options: companies,
        remoteOptions: {
          endpoint: '/api/companies?statuses=draft,active&pageSize=40',
          queryParam: 'ara',
          minQueryLength: 2,
          limit: 40,
        },
        placeholder: companies.length === 0 ? 'Şirket seçiniz' : field.placeholder,
      }
    }
    return withRepresentativeOperationControl(field)
  })

  const configuredTabs = tabs.map(tab => ({
    ...tab,
    fields: tab.fields.map(withRepresentativeOperationControl),
  }))

  const withFieldHistory = (field: FormField) => {
    const history = selectedRepresentative?.field_history?.[field.name]
    return history ? { ...field, history } : field
  }

  const handleRowClick = async (row: any) => {
    const cached = readEntityDetailCache<Record<string, any>>('company-representatives', row.id)
    setSelectedRepresentative(cached?.data || normalizeRepresentativeForForm(row))
    setPageState('view')
    setFormError(null)
    setFieldErrors({})
    if (cached) {
      setDetailLoading(false)
      return
    }
    setDetailLoading(true)

    try {
      const result = await companyService.representativeDetail(row.id)
      if (!result.data) throw new Error('Temsilci detayı yüklenemedi')
      const normalized = normalizeRepresentativeForForm(result.data)
      setSelectedRepresentative(normalized)
      writeEntityDetailCache('company-representatives', row.id, normalized)
    } catch (err: any) {
      setFormError(err.message || 'Temsilci detayı yüklenemedi')
      setToast(err.toast || { type: 'error', title: 'Detay Yüklenemedi', message: err.message || 'Temsilci detayı yüklenemedi' })
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCreateWizardSubmit = async (data: Record<string, any>) => {
    setSaving(true)
    setFormError(null)
    setFieldErrors({})
    try {
      const payload = normalizePayload(data, undefined, 'create')
      const companySelectionError = getRepresentativeCompanySelectionError(payload)
      if (companySelectionError) throw companySelectionError
      const response = await fetch('/api/companies/representatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw await createSaveError(response, 'Temsilci taslağı oluşturulamadı')
      const result = await response.json()
      const normalized = result.data ? normalizeRepresentativeForForm(result.data) : null
      if (normalized) {
        setSelectedRepresentative(normalized)
        writeEntityDetailCache('company-representatives', normalized.id, normalized)
      }
      setCreateWizardOpen(false)
      setToast({ type: 'success', title: 'Taslak Oluşturuldu', message: 'Temsilci taslağı oluşturuldu. Yetkilendirme için lifecycle wizardını kullanın.' })
      await loadData(true)
      invalidateEntityDetailCache('company-representatives')
      setPageState(normalized ? 'view' : 'list')
    } catch (err: any) {
      setFormError(err.message)
      setFieldErrors(err.fieldErrors || {})
      setToast(err.toast || { type: 'error', title: 'Taslak Oluşturulamadı', message: err.message })
      throw err
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async (data: Record<string, any>, mode: FormMode) => {
    setSaving(true)
    setFormError(null)
    setFieldErrors({})
    try {
      const payload = normalizePayload(data, selectedRepresentative || undefined, mode)
      const companySelectionError = getRepresentativeCompanySelectionError(payload)
      if (companySelectionError) throw companySelectionError
      const requestPayload = mode === 'create'
        ? payload
        : withRepresentativeConcurrency(payload, selectedRepresentative)
      const response = await fetch(mode === 'create' ? '/api/companies/representatives' : `/api/companies/representatives/${selectedRepresentative?.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      })
      if (!response.ok) throw await createSaveError(response, mode === 'create' ? 'Temsilci oluşturulamadı' : 'Güncelleme başarısız')
      const result = await response.json()
      if (result.data) setSelectedRepresentative(normalizeRepresentativeForForm(result.data))
      setToast({ type: 'success', title: 'Kayıt Başarılı', message: mode === 'create' ? 'Temsilci kaydı oluşturuldu' : 'Temsilci bilgileri güncellendi' })
      await loadData(true)
      if (mode === 'create') invalidateEntityDetailCache('company-representatives')
      else invalidateEntityDetailCache('company-representatives', selectedRepresentative?.id)
      setPageState('list')
    } catch (err: any) {
      setFormError(err.message)
      setFieldErrors(err.fieldErrors || {})
      setToast(err.toast || { type: 'error', title: 'Kayıt Başarısız', message: err.message })
      throw err
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (representativeId = selectedRepresentative?.id) => {
    if (!representativeId) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/companies/representatives/${representativeId}`, { method: 'DELETE' })
      if (!response.ok) throw await createSaveError(response, 'Silme işlemi başarısız')
      setToast({ type: 'success', title: 'Kayıt Silindi', message: 'Taslak temsilci kaydı kalıcı olarak silindi' })
      await loadData(true)
      setPageState('list')
    } catch (err: any) {
      setToast(err.toast || { type: 'error', title: 'Kayıt Başarısız', message: err.message })
      throw err
    } finally {
      setDeleting(false)
    }
  }

  const openAuthorityWizard = (transactionType: RepresentativeAuthorityTransactionType) => {
    if (!selectedRepresentative?.id) return
    setAuthorityWizardType(transactionType)
    setAuthorityWizardOpen(true)
  }

  const openAuthorityWizardForRow = async (row: any, transactionType: RepresentativeAuthorityTransactionType) => {
    await handleRowClick(row)
    setAuthorityWizardType(transactionType)
    setAuthorityWizardOpen(true)
  }

  const getRepresentativeRowActions = (row: any): TableRowAction<any>[] => {
    const recordStatus = getRepresentativeRecordStatus(row)
    return [
      {
        key: 'view',
        label: 'Detayı Aç',
        icon: <PencilLine size={15} />,
        onClick: () => void handleRowClick(row),
      },
      {
        key: 'activate',
        label: 'Yetkilendir / Aktive Et',
        icon: <ListChecks size={15} />,
        hidden: recordStatus !== 'draft',
        onClick: () => void openAuthorityWizardForRow(row, 'Temsilcilik Başlatma'),
      },
      {
        key: 'change-authority',
        label: 'Yetki Değişikliği',
        icon: <ListChecks size={15} />,
        hidden: recordStatus !== 'active',
        onClick: () => void openAuthorityWizardForRow(row, 'Yetki Kapsamı Değişikliği'),
      },
      {
        key: 'terminate',
        label: 'Sonlandır',
        icon: <ListChecks size={15} />,
        tone: 'danger',
        hidden: !['active', 'suspended'].includes(recordStatus),
        onClick: () => void openAuthorityWizardForRow(row, 'Sonlandırma'),
      },
      {
        key: 'delete-draft',
        label: 'Taslağı Sil',
        icon: <Trash2 size={15} />,
        tone: 'danger',
        hidden: !canHardDeleteRepresentative(row),
        onClick: () => void handleDelete(row.id),
      },
    ]
  }

  const handleAuthorityWizardSubmit = async (payload: Record<string, any>) => {
    if (!selectedRepresentative?.id) return
    setSaving(true)
    try {
      const response = await fetch(`/api/companies/representatives/${selectedRepresentative.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withRepresentativeConcurrency({
          ...payload,
          authority_action: true,
          approval_status: 'approved',
          workflow_status: 'approved',
        }, selectedRepresentative)),
      })
      if (!response.ok) throw await createSaveError(response, 'Temsilcilik işlemi tamamlanamadı')
      const result = await response.json()
      if (result.data) setSelectedRepresentative(normalizeRepresentativeForForm(result.data))
      setAuthorityWizardOpen(false)
      invalidateEntityDetailCache('company-representatives', selectedRepresentative.id)
      await loadData(true)
      setToast({ type: 'success', title: 'Temsilcilik İşlemi Tamamlandı', message: `${payload.transaction_type} kaydı onaylandı.` })
      setPageState('view')
    } catch (err: any) {
      setToast(err.toast || { type: 'error', title: 'Temsilcilik İşlemi Başarısız', message: err.message })
      throw err
    } finally {
      setSaving(false)
    }
  }

  const getRepresentativeOperationActions = (): FormOperationActionGroup[] => {
    if (!selectedRepresentative?.id || pageState === 'create') return []
    const recordStatus = getRepresentativeRecordStatus(selectedRepresentative)
    const lifecycleActions = recordStatus === 'draft'
      ? [{
          key: 'representative-start',
          label: 'Yetkilendir / Aktive Et',
          icon: <ListChecks size={15} />,
          onClick: () => openAuthorityWizard('Temsilcilik Başlatma'),
        }]
      : [
          {
            key: 'representative-suspend',
            label: 'Askıya Alma',
            icon: <ListChecks size={15} />,
            disabled: !['active'].includes(recordStatus),
            onClick: () => openAuthorityWizard('Askıya Alma'),
          },
          {
            key: 'representative-terminate',
            label: 'Sonlandır',
            icon: <ListChecks size={15} />,
            tone: 'danger' as const,
            disabled: !['active', 'suspended'].includes(recordStatus),
            onClick: () => openAuthorityWizard('Sonlandırma'),
          },
        ]

    const authorityActions = recordStatus === 'active'
      ? (['Yetki Yenileme', 'Yetki Kapsamı Değişikliği', 'Limit Değişikliği', 'Düzeltme Kaydı', 'Ters Kayıt'] as RepresentativeAuthorityTransactionType[]).map(transactionType => ({
          key: `representative-${transactionType}`,
          label: transactionType,
          icon: <ListChecks size={15} />,
          disabled: transactionType === 'Ters Kayıt',
          onClick: () => openAuthorityWizard(transactionType),
        }))
      : []

    return [
      {
        key: 'lifecycle',
        title: 'Temsilcilik Yaşam Döngüsü',
        operationKind: 'lifecycle',
        progress: getRepresentativeLifecycleOperationProgress(recordStatus),
        actions: lifecycleActions,
      },
      {
        key: 'registration',
        title: 'Resmi Yetki İşlemleri',
        operationKind: 'official_update',
        actions: authorityActions,
      },
    ]
  }

  const bannerConfig = pageState === 'list'
    ? {
        mode: 'list' as const,
        title: 'Temsilcilerimiz',
        subtitle: 'Şirket temsilci ve yetki kayıtlarını yönetin',
        onAddClick: () => {
          setSelectedRepresentative(null)
          setCreateWizardOpen(true)
          if (!companies.length) loadCompanyOptions().catch(() => setCompanies([]))
        },
        addButtonText: 'Yeni Temsilci',
      }
    : {
        mode: 'form' as const,
        formMode,
        title: pageState === 'create' ? 'Yeni Temsilci' : selectedRepresentative?.display_name || 'Temsilci Detayı',
        subtitle: pageState === 'create' ? 'Yeni temsilci kaydı oluştur' : pageState === 'edit' ? 'Temsilci bilgilerini güncelle' : 'Temsilci kayıt detayları',
        onBackClick: () => setPageState('list'),
      }

  return (
    <div className="relative">
      <PageBanner
        mode={bannerConfig.mode}
        {...(bannerConfig.mode === 'form' && { formMode: (bannerConfig as any).formMode })}
        title={bannerConfig.title}
        subtitle={bannerConfig.subtitle}
        icon={<BadgeCheck size={24} />}
        {...(bannerConfig.mode === 'list'
          ? { onAddClick: (bannerConfig as any).onAddClick, addButtonText: (bannerConfig as any).addButtonText }
          : { onBackClick: (bannerConfig as any).onBackClick }
        )}
      />

      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {pageState === 'list' && (
        <div className="mt-6">
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
            storageKey="companies-representatives-table"
            emptyText="Temsilci kaydı bulunamadı"
            onRowClick={handleRowClick}
            onRefresh={() => loadData(true)}
            rowActions={getRepresentativeRowActions}
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
            statusFilterOptions={REPRESENTATIVE_STATUS_FILTER_OPTIONS}
            activeStatusFilters={statusFilters}
            onStatusFiltersChange={(next) => {
              setStatusFilters(normalizeRepresentativeStatusFilters(next))
              setListQuery(prev => ({ ...prev, page: 1 }))
            }}
          />
        </div>
      )}

      {pageState !== 'list' && (
        <div className="mt-6">
          <EntityForm
            mode={formMode}
            entityName="Temsilcilerimiz"
            entityNameSingular="Temsilci"
            identityGate={{
              enabled: true,
              allowedEntityKinds: ['person', 'organization'],
              masterTable: 'both',
              uniqueFields: {
                person: ['nationality', 'national_id', 'passport_no'],
                organization: ['country', 'tax_number', 'registration_number'],
              },
              roleTable: 'company_representatives',
              roleDuplicateCheck: 'company_id + person_id/organization_id',
              roleScopeFields: ['company_id'],
            }}
            heroFields={configuredHeroFields.map(withFieldHistory)}
            tabs={configuredTabs.map(tab => ({ ...tab, fields: tab.fields.map(withFieldHistory) }))}
            roleHeroCardTitle="Rol Bilgileri"
            masterSummaryMode="entityIdentity"
            data={selectedRepresentative || undefined}
            saving={saving}
            deleting={deleting}
            error={formError}
            loadStages={formLoadStages}
            externalFieldErrors={fieldErrors}
            onSave={handleSave}
            onCancel={() => setPageState('list')}
            onDelete={canHardDeleteRepresentative(selectedRepresentative) ? () => handleDelete() : undefined}
            onModeChange={(mode) => setPageState(mode)}
            operationActions={getRepresentativeOperationActions()}
            onIdentityGateOpenExistingRole={async (roleRecord) => {
              await handleRowClick(roleRecord as any)
              setPageState('view')
            }}
            onIdentityGateCancelDuplicate={() => setPageState('list')}

            enableHistory
            imageSlot={{
              title: selectedRepresentative?.person_or_entity_type === 'organization' ? 'Logo' : 'Fotoğraf',
              dataField: 'photo_logo',
              slots: [
                { id: 'photo_logo', title: selectedRepresentative?.person_or_entity_type === 'organization' ? 'Logo' : 'Fotoğraf', required: false },
              ],
            }}
            documentSlot={{
              title: 'Yetki Belgeleri',
              dataField: 'authority_documents',
              slots: [
                { id: 'imza_sirkuleri', title: 'İmza Sirküleri', required: false },
                { id: 'vekaletname', title: 'Vekaletname', required: false },
                { id: 'yonetim_kurulu_karari', title: 'Yönetim Kurulu Kararı', required: false },
                { id: 'ticaret_sicil', title: 'Ticaret Sicil Gazetesi', required: false },
                { id: 'banka_yetki_formu', title: 'Banka Yetki Formu', required: false },
                { id: 'gib_yetki_belgesi', title: 'GİB Yetki Belgesi', required: false },
                { id: 'sgk_yetki_belgesi', title: 'SGK Yetki Belgesi', required: false },
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

      {createWizardOpen && (
        <NewRepresentativeWizard
          companies={companies}
          saving={saving}
          onClose={() => setCreateWizardOpen(false)}
          onSubmit={handleCreateWizardSubmit}
        />
      )}

      {authorityWizardOpen && selectedRepresentative && (
        <RepresentativeAuthorityWizard
          representative={selectedRepresentative}
          companies={companies}
          transactionType={authorityWizardType}
          saving={saving}
          onClose={() => setAuthorityWizardOpen(false)}
          onSubmit={handleAuthorityWizardSubmit}
        />
      )}
    </div>
  )
}

function NewRepresentativeWizard({
  companies,
  saving,
  onClose,
  onSubmit,
}: {
  companies: Option[]
  saving: boolean
  onClose: () => void
  onSubmit: (payload: Record<string, any>) => Promise<void>
}) {
  const [form, setForm] = useState<Record<string, any>>({
    company_id: '',
    person_or_entity_type: 'person',
    source_type: 'new',
    source_id: '',
    display_name: '',
    first_name: '',
    last_name: '',
    trade_name: '',
    short_name: '',
    identity_number: '',
    primary_authority_type: '',
    authority_types: [],
    signature_type: '',
    transaction_limit: '',
    payment_approval_limit: '',
    purchase_approval_limit: '',
    bank_transaction_limit: '',
    contract_signature_limit: '',
    currency: 'TRY',
    requires_joint_signature: false,
    can_approve_alone: false,
    bank_authority_level: '',
    department_scope: '',
    gib_permissions: '',
    sgk_permissions: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    notes: '',
  })
  const [localError, setLocalError] = useState<string | null>(null)
  const selectedCompany = companies.find(company => company.value === form.company_id)
  const steps = useMemo<RecordLifecycleWizardStep[]>(() => buildNewRepresentativeWizardSteps({
    form,
    companies,
    companyLabel: selectedCompany?.label || '',
  }), [companies, form, selectedCompany?.label])

  const complete = async () => {
    setLocalError(null)
    const validation = validateNewRepresentativeDraft(form)
    if (validation) {
      setLocalError(validation)
      return
    }
    const authorityTypes = normalizeWizardAuthorityTypes(form)
    await onSubmit({
      ...form,
      person_id: form.source_type === 'master_person' ? form.source_id || null : null,
      organization_id: form.source_type === 'master_organization' ? form.source_id || null : null,
      authority_types: authorityTypes,
      authority_type: authorityTypes[0] || 'other',
      job_title: authorityTypes[0] || null,
      transaction_limit: form.transaction_limit === '' ? null : Number(form.transaction_limit),
      payment_approval_limit: form.payment_approval_limit === '' ? null : Number(form.payment_approval_limit),
      purchase_approval_limit: form.purchase_approval_limit === '' ? null : Number(form.purchase_approval_limit),
      bank_transaction_limit: form.bank_transaction_limit === '' ? null : Number(form.bank_transaction_limit),
      contract_signature_limit: form.contract_signature_limit === '' ? null : Number(form.contract_signature_limit),
      authority_documents: collectNewRepresentativeWizardDocuments(form),
    })
  }

  const validateStep = () => {
    if (form.end_date && form.start_date && new Date(form.end_date) < new Date(form.start_date)) {
      return 'Bitiş tarihi yürürlük başlangıç tarihinden önce olamaz.'
    }
    return null
  }

  return (
    <RecordLifecycleWizard
      title="Yeni Temsilci Tanımlama"
      subtitle="Taslak temsilci oluşturma wizardı"
      steps={steps}
      form={form}
      setForm={setForm as Dispatch<SetStateAction<Record<string, any>>>}
      onClose={onClose}
      onSubmit={complete}
      submitLabel="Taslak Temsilci Oluştur"
      saving={saving}
      error={localError || undefined}
      validateStep={validateStep}
      sideInfo="Bu wizard yalnızca Taslak temsilci oluşturur. Yetki durumu aktivasyon wizardı tamamlanmadan Aktif yapılmaz."
    />
  )
}

function buildNewRepresentativeWizardSteps({
  form,
  companies,
  companyLabel,
}: {
  form: Record<string, any>
  companies: Option[]
  companyLabel: string
}): RecordLifecycleWizardStep[] {
  return [
    {
      id: 'new-representative-context',
      title: 'Bağlam',
      description: 'Bağlı şirket, kişi/kurum tipi ve kaynak türü.',
      sections: [{
        id: 'new-representative-context-fields',
        title: 'Temsilci bağlamı',
        fields: [
          {
            name: 'company_id',
            label: 'Bağlı Şirket',
            type: 'select',
            required: true,
            searchable: true,
            options: companies,
            remoteOptions: {
              endpoint: '/api/companies?statuses=draft,active&pageSize=40',
              queryParam: 'ara',
              minQueryLength: 2,
              limit: 40,
            },
          },
          {
            name: 'person_or_entity_type',
            label: 'Kişi/Kurum Tipi',
            type: 'optionCards',
            required: true,
            options: [
              { value: 'person', label: 'Gerçek Kişi', description: 'TCKN veya pasaport ile kişi master kaydına bağlanır.' },
              { value: 'organization', label: 'Tüzel Kişi', description: 'VKN veya ticaret sicil bilgisi ile kurum master kaydına bağlanır.' },
            ],
          },
          {
            name: 'source_type',
            label: 'Kaynak Türü',
            type: 'select',
            required: true,
            options: [
              { value: 'new', label: 'Yeni Kayıt' },
              { value: 'master_person', label: 'Mevcut Kişi Master' },
              { value: 'master_organization', label: 'Mevcut Kurum Master' },
              { value: 'partner', label: 'Ortak Kaydı' },
              { value: 'employee', label: 'Çalışan Kaydı' },
              { value: 'external', label: 'Harici Kaynak' },
            ],
          },
        ],
      }],
    },
    {
      id: 'new-representative-identity',
      title: 'Kayıt Seçimi',
      description: 'Mevcut master kaydı seçin veya yeni kişi/kurum bilgilerini girin.',
      sections: [{
        id: 'new-representative-identity-fields',
        title: 'Kimlik bilgileri',
        fields: [
          {
            name: 'source_id',
            label: 'Kayıt Seçimi',
            type: 'text',
            requiredWhen: { field: 'source_type', operator: 'notEquals', value: 'new' },
            placeholder: 'Mevcut master/kaynak kayıt ID',
            visibleWhen: { field: 'source_type', operator: 'notEquals', value: 'new' },
          },
          { name: 'display_name', label: 'Kayıt Görünür Adı/Ünvanı', type: 'text', visibleWhen: { field: 'source_type', operator: 'notEquals', value: 'new' } },
          { name: 'identity_number', label: 'TCKN / Pasaport / VKN', type: 'text', required: true },
          { name: 'first_name', label: 'Ad', type: 'text', required: true, visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'person' } },
          { name: 'last_name', label: 'Soyad', type: 'text', required: true, visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'person' } },
          { name: 'trade_name', label: 'Ticari Ünvan', type: 'text', required: true, visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'organization' } },
          { name: 'short_name', label: 'Kısa Ünvan', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'organization' } },
        ],
      }],
    },
    {
      id: 'new-representative-authority',
      title: 'Yetki Detayları',
      description: 'Ana yetki, imza türü, limit ve kapsam bilgileri.',
      sections: [
        {
          id: 'new-representative-authority-types',
          title: 'Yetki tipi ve imza',
          fields: [
            { name: 'primary_authority_type', label: 'Ana Yetki Tipi', type: 'select', required: true, options: AUTHORITY_OPTIONS },
            {
              name: 'authority_types',
              label: 'Ek Yetki Tipleri',
              type: 'custom',
              colSpan: 3,
              render: ({ value, onChange, readOnly }) => (
                <AuthoritySelector value={Array.isArray(value) ? value : []} onChange={onChange} readOnly={readOnly} />
              ),
            },
            { name: 'signature_type', label: 'İmza Türü', type: 'select', requiredWhen: { field: 'primary_authority_type', operator: 'equals', value: 'signature_authority' }, options: [
              { value: 'Münferit', label: 'Münferit' },
              { value: 'Müşterek', label: 'Müşterek' },
              { value: 'Sınırlı', label: 'Sınırlı' },
              { value: 'Süresiz', label: 'Süresiz' },
              { value: 'Yok', label: 'Yok' },
            ] },
            { name: 'currency', label: 'Para Birimi', type: 'select', options: [
              { value: 'TRY', label: 'TRY' },
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
              { value: 'GBP', label: 'GBP' },
            ] },
            { name: 'requires_joint_signature', label: 'Müşterek imza gerekir', type: 'checkbox' },
            { name: 'can_approve_alone', label: 'Tek başına onaylayabilir', type: 'checkbox' },
          ],
        },
        {
          id: 'new-representative-limits',
          title: 'Limitler',
          fields: [
            { name: 'transaction_limit', label: 'Genel Limit', type: 'number' },
            { name: 'payment_approval_limit', label: 'Ödeme Onay Limiti', type: 'number' },
            { name: 'purchase_approval_limit', label: 'Satınalma Onay Limiti', type: 'number' },
            { name: 'bank_transaction_limit', label: 'Banka İşlem Limiti', type: 'number' },
            { name: 'contract_signature_limit', label: 'Sözleşme İmza Limiti', type: 'number' },
          ],
        },
        {
          id: 'new-representative-scope',
          title: 'Kurum ve kapsam bilgileri',
          fields: [
            { name: 'bank_authority_level', label: 'Banka Yetki Seviyesi', type: 'text' },
            { name: 'department_scope', label: 'Departman Kapsamı', type: 'text' },
            { name: 'gib_permissions', label: 'GİB Yetkileri', type: 'textarea' },
            { name: 'sgk_permissions', label: 'SGK Yetkileri', type: 'textarea' },
          ],
        },
      ],
    },
    {
      id: 'new-representative-documents',
      title: 'Belgeler',
      description: 'Taslakla birlikte hazır belgeleri ekleyin.',
      sections: [{
        id: 'new-representative-document-fields',
        title: 'Temsilci belgeleri',
        fields: [
          { name: 'authority_document', label: 'Yetki Belgesi', type: 'document', colSpan: 3, documentMode: 'newOnly' },
          { name: 'signature_circular_document', label: 'İmza Sirküleri', type: 'document', colSpan: 3, documentMode: 'newOnly' },
        ],
      }],
    },
    {
      id: 'new-representative-effective',
      title: 'Yürürlük',
      description: 'Yürürlük başlangıç tarihi ve açıklama.',
      sections: [{
        id: 'new-representative-effective-fields',
        title: 'Yürürlük bilgileri',
        fields: [
          { name: 'start_date', label: 'Yürürlük Başlangıç Tarihi', type: 'date', required: true },
          { name: 'end_date', label: 'Süre Sonu', type: 'date' },
          { name: 'notes', label: 'Notlar', type: 'textarea', colSpan: 3 },
        ],
      }],
    },
    {
      id: 'new-representative-preview',
      title: 'Ön İzleme',
      description: 'Taslak oluşturulmadan önce son kontrol.',
      sections: [{
        id: 'new-representative-preview-section',
        title: 'Taslak özeti',
        frameless: true,
        children: <NewRepresentativePreviewStep form={form} companyLabel={companyLabel} />,
      }],
    },
  ]
}

function NewRepresentativePreviewStep({ form, companyLabel }: { form: Record<string, any>; companyLabel: string }) {
  const authorityTypes = normalizeWizardAuthorityTypes(form)
  const documents = collectNewRepresentativeWizardDocuments(form)
  const displayName = form.person_or_entity_type === 'organization'
    ? form.trade_name || form.short_name || form.display_name || '-'
    : [form.first_name, form.last_name].filter(Boolean).join(' ') || form.display_name || '-'

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <SummaryMetric label="Durum" value="Taslak" />
        <SummaryMetric label="Temsilci" value={displayName} />
        <SummaryMetric label="Bağlı Şirket" value={companyLabel || form.company_id || '-'} />
        <SummaryMetric label="Kişi/Kurum Tipi" value={form.person_or_entity_type === 'organization' ? 'Tüzel Kişi' : 'Gerçek Kişi'} />
        <SummaryMetric label="Kaynak Türü" value={getRepresentativeSourceTypeLabel(form.source_type)} />
        <SummaryMetric label="Kimlik" value={form.identity_number || '-'} />
        <SummaryMetric label="Ana Yetki" value={toAuthorityLabel(form.primary_authority_type || '-')} />
        <SummaryMetric label="İmza Türü" value={form.signature_type || '-'} />
        <SummaryMetric label="Yürürlük" value={form.start_date || '-'} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="text-sm font-semibold text-gray-950 dark:text-white">Yetki tipleri</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {authorityTypes.map(authority => (
            <span key={authority} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
              {toAuthorityLabel(authority)}
            </span>
          ))}
        </div>
      </div>

      <SummaryList items={documents} emptyText="Taslağa belge eklenmedi." />
    </div>
  )
}

function validateNewRepresentativeDraft(form: Record<string, any>) {
  if (!form.company_id) return 'Bağlı şirket seçimi zorunludur.'
  if (!form.person_or_entity_type) return 'Kişi/kurum tipi zorunludur.'
  if (form.source_type !== 'new' && !form.source_id) return 'Mevcut kayıt seçimi zorunludur.'
  if (!form.identity_number) return 'TCKN / Pasaport / VKN zorunludur.'
  if (form.person_or_entity_type === 'person' && form.source_type === 'new' && (!form.first_name || !form.last_name)) return 'Ad ve soyad zorunludur.'
  if (form.person_or_entity_type === 'organization' && form.source_type === 'new' && !form.trade_name) return 'Ticari ünvan zorunludur.'
  if (!form.primary_authority_type) return 'Ana yetki tipi zorunludur.'
  if (form.primary_authority_type === 'signature_authority' && !form.signature_type) return 'İmza türü zorunludur.'
  if (!form.start_date) return 'Yürürlük başlangıç tarihi zorunludur.'
  if (form.end_date && form.start_date && new Date(form.end_date) < new Date(form.start_date)) return 'Bitiş tarihi yürürlük başlangıç tarihinden önce olamaz.'
  return null
}

function normalizeWizardAuthorityTypes(form: Record<string, any>) {
  return Array.from(new Set([
    form.primary_authority_type,
    ...(Array.isArray(form.authority_types) ? form.authority_types : []),
  ].filter(Boolean).map(toAuthorityValue)))
}

function collectNewRepresentativeWizardDocuments(form: Record<string, any>) {
  return ['authority_document', 'signature_circular_document']
    .map(field => form[field])
    .filter((document): document is Record<string, any> => !!document && typeof document === 'object')
    .map(document => ({ ...document, slotId: document.slotId || document.documentId || document.name }))
}

function RepresentativeAuthorityWizard({
  representative,
  companies,
  transactionType,
  saving,
  onClose,
  onSubmit,
}: {
  representative: Record<string, any>
  companies: Option[]
  transactionType: RepresentativeAuthorityTransactionType
  saving: boolean
  onClose: () => void
  onSubmit: (payload: Record<string, any>) => Promise<void>
}) {
  const current = representative.current_authority || {}
  const isTermination = isRepresentativeTerminationTransaction(transactionType)
  const isActivation = transactionType === 'Temsilcilik Başlatma'
  const recordStatus = getRepresentativeRecordStatus(representative)
  const [form, setForm] = useState<Record<string, any>>({
    transaction_type: transactionType,
    company_id: representative.company_id || '',
    effective_date: new Date().toISOString().slice(0, 10),
    end_date: current.end_date || representative.end_date || '',
    authority_types: Array.isArray(current.authority_types) ? current.authority_types : Array.isArray(representative.authority_types) ? representative.authority_types : [],
    signature_type: current.signature_type || representative.signature_type || '',
    transaction_limit: String(current.transaction_limit ?? representative.transaction_limit ?? ''),
    payment_approval_limit: String(current.payment_approval_limit ?? representative.payment_approval_limit ?? ''),
    purchase_approval_limit: String(current.purchase_approval_limit ?? representative.purchase_approval_limit ?? ''),
    bank_transaction_limit: String(current.bank_transaction_limit ?? representative.bank_transaction_limit ?? ''),
    contract_signature_limit: String(current.contract_signature_limit ?? representative.contract_signature_limit ?? ''),
    currency: current.currency || representative.currency || 'TRY',
    requires_joint_signature: !!(current.requires_joint_signature ?? representative.requires_joint_signature),
    can_approve_alone: !!(current.can_approve_alone ?? representative.can_approve_alone),
    bank_authority_level: current.scope?.bank_authority_level || representative.bank_authority_level || '',
    department_scope: current.scope?.department_scope || representative.department_scope || '',
    gib_permissions: current.scope?.gib_permissions || representative.gib_permissions || '',
    can_submit_declaration: !!(current.scope?.can_submit_declaration ?? representative.can_submit_declaration),
    can_process_e_invoice: !!(current.scope?.can_process_e_invoice ?? representative.can_process_e_invoice),
    sgk_permissions: current.scope?.sgk_permissions || representative.sgk_permissions || '',
    can_submit_hiring_notice: !!(current.scope?.can_submit_hiring_notice ?? representative.can_submit_hiring_notice),
    can_submit_termination_notice: !!(current.scope?.can_submit_termination_notice ?? representative.can_submit_termination_notice),
    official_correspondence_authority: !!(current.scope?.official_correspondence_authority ?? representative.official_correspondence_authority),
    termination_reason: '',
    notes: '',
  })
  const [localError, setLocalError] = useState<string | null>(null)
  const selectedCompany = companies.find(company => company.value === form.company_id)
  const steps = useMemo<RecordLifecycleWizardStep[]>(() => buildRepresentativeAuthorityWizardSteps({
    representative,
    companyLabel: selectedCompany?.label || '',
    form,
    transactionType,
    isTermination,
  }), [form, isTermination, representative, selectedCompany?.label, transactionType])

  const complete = async () => {
    setLocalError(null)
    if (isActivation && recordStatus !== 'draft') return setLocalError('Yetkilendirme / aktive etme yalnızca Taslak temsilciler için çalışır.')
    if (!isActivation && !isTermination && recordStatus !== 'active') return setLocalError('Yetki değişikliği yalnızca Aktif temsilciler için yapılabilir.')
    if (isTermination && !['active', 'suspended'].includes(recordStatus)) return setLocalError('Sonlandırma yalnızca Aktif veya Askıda temsilciler için yapılabilir.')
    if (!form.company_id) return setLocalError('Şirket seçimi zorunludur.')
    if (!form.effective_date) return setLocalError('Yürürlük tarihi zorunludur.')
    if (!isTermination && form.authority_types.length === 0) return setLocalError('En az bir yetki tipi seçilmelidir.')
    if (!isTermination && form.authority_types.includes('signature_authority') && !form.signature_type) return setLocalError('İmza yetkisi için imza türü zorunludur.')
    if (isActivation && collectRepresentativeAuthorityWizardDocuments(form, representative).length === 0) return setLocalError('Aktivasyon için en az bir yetki belgesi eklenmelidir.')
    if (isTermination && !form.termination_reason) return setLocalError('Sonlandırma nedeni zorunludur.')
    if (isTermination && (!form.authority_document || typeof form.authority_document !== 'object')) return setLocalError('Sonlandırma için işlem belgesi eklenmelidir.')
    if (form.end_date && form.effective_date && new Date(form.end_date) < new Date(form.effective_date)) {
      return setLocalError('Bitiş tarihi yürürlük tarihinden önce olamaz.')
    }
    await onSubmit({
      ...form,
      notes: isTermination ? [form.termination_reason, form.notes].filter(Boolean).join(' - ') : form.notes,
      transaction_limit: form.transaction_limit === '' ? null : Number(form.transaction_limit),
      payment_approval_limit: form.payment_approval_limit === '' ? null : Number(form.payment_approval_limit),
      purchase_approval_limit: form.purchase_approval_limit === '' ? null : Number(form.purchase_approval_limit),
      bank_transaction_limit: form.bank_transaction_limit === '' ? null : Number(form.bank_transaction_limit),
      contract_signature_limit: form.contract_signature_limit === '' ? null : Number(form.contract_signature_limit),
      document_files: collectRepresentativeAuthorityWizardDocuments(form, representative),
    })
  }

  const validateStep = () => {
    if (form.end_date && form.effective_date && new Date(form.end_date) < new Date(form.effective_date)) {
      return 'Bitiş tarihi yürürlük tarihinden önce olamaz.'
    }
    return null
  }

  return (
    <RecordLifecycleWizard
      title={getRepresentativeAuthorityWizardTitle(transactionType)}
      subtitle={representative.display_name || representative.full_name || 'Temsilci'}
      steps={steps}
      form={form}
      setForm={setForm as Dispatch<SetStateAction<Record<string, any>>>}
      onClose={onClose}
      onSubmit={complete}
      submitLabel={getRepresentativeAuthoritySubmitLabel(transactionType)}
      saving={saving}
      error={localError || undefined}
      validateStep={validateStep}
      sideInfo="Veriler son adıma kadar yalnızca wizard içinde tutulur. Tamamla aksiyonu tek bir resmi temsilcilik işlemi oluşturur."
    />
  )

}

function buildRepresentativeAuthorityWizardSteps({
  representative,
  companyLabel,
  form,
  transactionType,
  isTermination,
}: {
  representative: Record<string, any>
  companyLabel: string
  form: Record<string, any>
  transactionType: RepresentativeAuthorityTransactionType
  isTermination: boolean
}): RecordLifecycleWizardStep[] {
  const steps: RecordLifecycleWizardStep[] = [
    {
      id: 'representative-authority-context',
      title: 'İşlem Bilgileri',
      description: 'Temsilcilik işleminin tarih ve bağlam bilgileri.',
      sections: [
        {
          id: 'representative-authority-context-summary',
          title: 'İşlem bağlamı',
          frameless: true,
          children: (
            <RepresentativeWizardContextSummary
              representative={representative}
              companyLabel={companyLabel}
              transactionType={transactionType}
            />
          ),
        },
        {
          id: 'representative-authority-context-fields',
          title: 'Tarih ve not',
          fields: [
            { name: 'effective_date', label: 'Yürürlük Tarihi', type: 'date', required: true },
            { name: 'end_date', label: isTermination ? 'Bitiş Tarihi' : 'Süre Sonu', type: 'date' },
            { name: 'termination_reason', label: 'Sonlandırma Nedeni', type: 'textarea', colSpan: 3, required: true, visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Sonlandırma' } },
            { name: 'notes', label: 'İşlem Notu', type: 'textarea', colSpan: 3 },
          ],
        },
      ],
    },
  ]

  if (!isTermination) {
    steps.push({
      id: 'representative-authority-scope',
      title: 'Yetki Kapsamı',
      description: 'Temsilcinin sahip olacağı yetki tipleri, imza ve limit bilgileri.',
      sections: [
        {
          id: 'representative-authority-types',
          title: 'Yetki tipleri ve imza',
          fields: [
            {
              name: 'authority_types',
              label: 'Yetki Tipleri',
              type: 'custom',
              required: true,
              colSpan: 3,
              render: ({ value, onChange, readOnly }) => (
                <AuthoritySelector value={Array.isArray(value) ? value : []} onChange={onChange} readOnly={readOnly} />
              ),
            },
            { name: 'signature_type', label: 'İmza Türü', type: 'select', options: [
              { value: 'Münferit', label: 'Münferit' },
              { value: 'Müşterek', label: 'Müşterek' },
              { value: 'Sınırlı', label: 'Sınırlı' },
              { value: 'Süresiz', label: 'Süresiz' },
              { value: 'Yok', label: 'Yok' },
            ] },
            { name: 'currency', label: 'Para Birimi', type: 'select', options: [
              { value: 'TRY', label: 'TRY' },
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
              { value: 'GBP', label: 'GBP' },
            ] },
            { name: 'requires_joint_signature', label: 'Müşterek imza gerekir', type: 'checkbox' },
            { name: 'can_approve_alone', label: 'Tek başına onaylayabilir', type: 'checkbox' },
          ],
        },
        {
          id: 'representative-authority-limits',
          title: 'Limitler',
          fields: [
            { name: 'transaction_limit', label: 'Genel Limit', type: 'number' },
            { name: 'payment_approval_limit', label: 'Ödeme Onay Limiti', type: 'number' },
            { name: 'purchase_approval_limit', label: 'Satınalma Onay Limiti', type: 'number' },
            { name: 'bank_transaction_limit', label: 'Banka İşlem Limiti', type: 'number' },
            { name: 'contract_signature_limit', label: 'Sözleşme İmza Limiti', type: 'number' },
          ],
        },
        {
          id: 'representative-authority-institutions',
          title: 'Kurum ve kapsam bilgileri',
          fields: [
            { name: 'bank_authority_level', label: 'Banka Yetki Seviyesi', type: 'text' },
            { name: 'department_scope', label: 'Departman Kapsamı', type: 'text' },
            { name: 'gib_permissions', label: 'GİB Yetkileri', type: 'textarea' },
            { name: 'sgk_permissions', label: 'SGK Yetkileri', type: 'textarea' },
            { name: 'can_submit_declaration', label: 'Beyanname gönderebilir', type: 'checkbox' },
            { name: 'can_process_e_invoice', label: 'E-Fatura işleyebilir', type: 'checkbox' },
            { name: 'can_submit_hiring_notice', label: 'İşe giriş bildirgesi gönderebilir', type: 'checkbox' },
            { name: 'can_submit_termination_notice', label: 'İşten çıkış bildirgesi gönderebilir', type: 'checkbox' },
            { name: 'official_correspondence_authority', label: 'Resmi yazışma yetkisi', type: 'checkbox' },
          ],
        },
      ],
    })
  }

  steps.push(
    {
      id: 'representative-authority-documents',
      title: 'Belgeler',
      description: 'Hazır belgeleri işleme ekleyin. Bu adım zorunlu değildir.',
      sections: [{
        id: 'representative-authority-document-fields',
        title: 'Temsilcilik belgeleri',
        fields: [
          {
            name: 'authority_document',
            label: isTermination ? 'İşlem Kararı / Belgesi' : 'Yetki Belgesi',
            type: 'document',
            colSpan: 3,
            documentMode: 'newOnly',
          },
          ...(!isTermination ? [{
            name: 'signature_circular_document',
            label: 'İmza Sirküleri',
            type: 'document' as const,
            colSpan: 3 as const,
            documentMode: 'newOnly' as const,
          }] : []),
        ],
      }],
    },
    {
      id: 'representative-authority-preview',
      title: 'Önizleme',
      description: 'Tamamlamadan önce işlem özetini kontrol edin.',
      sections: [{
        id: 'representative-authority-preview-section',
        title: 'İşlem özeti',
        frameless: true,
        children: (
          <RepresentativeAuthorityPreviewStep
            representative={representative}
            companyLabel={companyLabel}
            form={form}
            isTermination={isTermination}
          />
        ),
      }],
    }
  )

  return steps
}

function RepresentativeWizardContextSummary({
  representative,
  companyLabel,
  transactionType,
}: {
  representative: Record<string, any>
  companyLabel: string
  transactionType: RepresentativeAuthorityTransactionType
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <SummaryMetric label="İşlem" value={transactionType} />
      <SummaryMetric label="Temsilci" value={representative.display_name || representative.full_name || '-'} />
      <SummaryMetric label="Şirket" value={companyLabel || representative.company_name || representative.company_id || '-'} />
    </div>
  )
}

function RepresentativeAuthorityPreviewStep({
  representative,
  companyLabel,
  form,
  isTermination,
}: {
  representative: Record<string, any>
  companyLabel: string
  form: Record<string, any>
  isTermination: boolean
}) {
  const documents = collectRepresentativeAuthorityWizardDocuments(form, representative)
  const authorityTypes = Array.isArray(form.authority_types) ? form.authority_types : []

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <SummaryMetric label="İşlem" value={form.transaction_type || '-'} />
        <SummaryMetric label="Temsilci" value={representative.display_name || representative.full_name || '-'} />
        <SummaryMetric label="Şirket" value={companyLabel || representative.company_name || representative.company_id || '-'} />
        <SummaryMetric label="Yürürlük" value={form.effective_date || '-'} />
        <SummaryMetric label="Bitiş" value={form.end_date || 'Süresiz'} />
        <SummaryMetric label="Not" value={form.notes || '-'} />
      </div>

      {!isTermination && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="text-sm font-semibold text-gray-950 dark:text-white">Yetki kapsamı</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {authorityTypes.length ? authorityTypes.map(authority => (
              <span key={authority} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                {toAuthorityLabel(authority)}
              </span>
            )) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">Yetki tipi seçilmedi.</span>
            )}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <SummaryMetric label="İmza Türü" value={form.signature_type || '-'} />
            <SummaryMetric label="Para Birimi" value={form.currency || 'TRY'} />
            <SummaryMetric label="Genel Limit" value={form.transaction_limit || '-'} />
            <SummaryMetric label="Ödeme Onay Limiti" value={form.payment_approval_limit || '-'} />
            <SummaryMetric label="Satınalma Onay Limiti" value={form.purchase_approval_limit || '-'} />
            <SummaryMetric label="Banka İşlem Limiti" value={form.bank_transaction_limit || '-'} />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="text-sm font-semibold text-gray-950 dark:text-white">Belgeler</div>
        <div className="mt-3 space-y-2">
          {documents.length ? documents.map((document, index) => (
            <div key={`${document.documentId || document.storagePath || document.name || index}`} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
              {document.name || document.fileName || document.documentId || document.storagePath || 'Belge'}
            </div>
          )) : (
            <div className="rounded-lg border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Bu işleme belge eklenmedi.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryMetric({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
      <div className="text-[11px] font-medium uppercase text-gray-400">{label}</div>
      <div className="mt-1 min-h-5 text-sm font-semibold text-gray-900 dark:text-white">{String(value || '-')}</div>
    </div>
  )
}

function isRepresentativeTerminationTransaction(transactionType: RepresentativeAuthorityTransactionType) {
  return ['Askıya Alma', 'Sonlandırma', 'Ters Kayıt'].includes(transactionType)
}

function getRepresentativeAuthoritySubmitLabel(transactionType: RepresentativeAuthorityTransactionType) {
  if (transactionType === 'Temsilcilik Başlatma') return 'Yetkilendir / Aktive Et'
  if (transactionType === 'Askıya Alma') return 'Askıya Al'
  if (transactionType === 'Sonlandırma') return 'Sonlandır'
  return 'İşlemi Tamamla'
}

function getRepresentativeAuthorityWizardTitle(transactionType: RepresentativeAuthorityTransactionType) {
  if (transactionType === 'Temsilcilik Başlatma') return 'Temsilci Yetkilendirme / Aktive Etme'
  if (transactionType === 'Yetki Kapsamı Değişikliği' || transactionType === 'Limit Değişikliği') return 'Yetki Değişikliği'
  if (transactionType === 'Sonlandırma') return 'Temsilcilik Sonlandırma'
  return transactionType
}

function collectRepresentativeAuthorityWizardDocuments(form: Record<string, any>, representative: Record<string, any>) {
  const existingDocuments = Array.isArray(representative.authority_documents) ? representative.authority_documents : []
  const wizardDocuments = ['authority_document', 'signature_circular_document']
    .map(field => form[field])
    .filter((document): document is Record<string, any> => !!document && typeof document === 'object')
    .map(document => ({ ...document, slotId: document.slotId || document.documentId || document.name }))
  return [...existingDocuments, ...wizardDocuments]
}

function AuthoritySelector({ value, onChange, readOnly }: { value: string[]; onChange: (value: string[]) => void; readOnly: boolean }) {
  const toggle = (authority: Option) => {
    if (readOnly) return
    const normalizedValue = value.map(toAuthorityValue)
    const authorityValue = authority.value
    onChange(normalizedValue.includes(authorityValue)
      ? normalizedValue.filter(item => item !== authorityValue)
      : [...normalizedValue, authorityValue])
  }
  const normalizedValue = value.map(toAuthorityValue)

  return (
    <div className="flex flex-wrap gap-2">
      {AUTHORITY_OPTIONS.map(authority => (
        <button
          key={authority.value}
          type="button"
          onClick={() => toggle(authority)}
          disabled={readOnly}
          className={[
            'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            normalizedValue.includes(authority.value)
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
              : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
            readOnly ? 'cursor-not-allowed opacity-70' : '',
          ].join(' ')}
        >
          {authority.label}
        </button>
      ))}
    </div>
  )
}

function SummaryList({ items, emptyText }: { items: any[]; emptyText: string }) {
  if (!items.length) return <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700">{emptyText}</div>
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
      {items.map((item, index) => (
        <div key={`${item.slotId || item.name || index}`} className="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-sm last:border-b-0 dark:border-gray-800">
          <span className="font-medium text-gray-800 dark:text-gray-100">{item.slotTitle || item.title || item.name || 'Belge'}</span>
          <span className="text-xs text-gray-500">{item.name || item.fileName || '-'}</span>
        </div>
      ))}
    </div>
  )
}

function Timeline({ value }: { value: any[] }) {
  const items = value.filter(Boolean)
  if (!items.length) {
    return <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700">Henüz temsilcilik/yetki işlemi yok.</div>
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          {item.text || (item.transaction_type
            ? `${item.effective_date || item.created_at || ''} → ${item.transaction_type}${item.workflow_status ? ` (${item.workflow_status})` : ''}`
            : `${item.changed_at || ''} → ${item.field || 'Değişiklik'}: ${item.old_value ?? '-'} → ${item.new_value ?? '-'}`)}
        </div>
      ))}
    </div>
  )
}

function normalizeRepresentativeForForm(representative: RepresentativeRow) {
  const profile = representative.representative_profile || {}
  const currentAuthority = representative.current_authority || {}
  const authorityTypes = (
    currentAuthority.authority_types ||
    profile.authority_types ||
    representative.authority_types ||
    []
  ).map(toAuthorityValue)
  const primaryAuthority = getRepresentativePrimaryAuthority(representative)
  const masterFields = representative as RepresentativeRow & {
    first_name?: string
    last_name?: string
    trade_name?: string
    legal_name?: string
    short_name?: string
    phones?: Array<Record<string, any>>
    emails?: Array<Record<string, any>>
  }
  const displayName = representative.display_name || representative.full_name || ''
  const status = isSoftDeletedRecord(representative) ? 'Pasif' : currentAuthority.status || representative.status || profile.status || 'Taslak'
  const recordStatus = currentAuthority.record_status || representative.record_status || (status === 'Pasif' ? 'passive' : 'draft')
  return {
    ...profile,
    ...representative,
    company_id: (representative as any).company_id || representative.company_id,
    person_or_entity_type: normalizeRepresentativeEntityType(profile.person_or_entity_type || representative.person_kind),
    first_name: masterFields.first_name || '',
    last_name: masterFields.last_name || '',
    trade_name: masterFields.trade_name || masterFields.legal_name || '',
    short_name: masterFields.short_name || '',
    display_name: displayName,
    primary_authority_type: toAuthorityValue(primaryAuthority || authorityTypes[0] || ''),
    authority_types: authorityTypes,
    status,
    record_status: recordStatus,
    start_date: currentAuthority.effective_date || representative.start_date || '',
    end_date: currentAuthority.end_date || representative.end_date || '',
    signature_type: currentAuthority.signature_type || representative.signature_type || '',
    transaction_limit: currentAuthority.transaction_limit ?? representative.transaction_limit ?? null,
    payment_approval_limit: currentAuthority.payment_approval_limit ?? (representative as any).payment_approval_limit ?? '',
    purchase_approval_limit: currentAuthority.purchase_approval_limit ?? (representative as any).purchase_approval_limit ?? '',
    bank_transaction_limit: currentAuthority.bank_transaction_limit ?? (representative as any).bank_transaction_limit ?? '',
    contract_signature_limit: currentAuthority.contract_signature_limit ?? (representative as any).contract_signature_limit ?? '',
    requires_joint_signature: currentAuthority.requires_joint_signature ?? representative.requires_joint_signature ?? false,
    can_approve_alone: currentAuthority.can_approve_alone ?? representative.can_approve_alone ?? false,
    bank_authority_level: currentAuthority.scope?.bank_authority_level ?? (representative as any).bank_authority_level ?? '',
    department_scope: currentAuthority.scope?.department_scope ?? (representative as any).department_scope ?? '',
    gib_permissions: currentAuthority.scope?.gib_permissions ?? (representative as any).gib_permissions ?? '',
    can_submit_declaration: currentAuthority.scope?.can_submit_declaration ?? (representative as any).can_submit_declaration ?? false,
    can_process_e_invoice: currentAuthority.scope?.can_process_e_invoice ?? (representative as any).can_process_e_invoice ?? false,
    sgk_permissions: currentAuthority.scope?.sgk_permissions ?? (representative as any).sgk_permissions ?? '',
    can_submit_hiring_notice: currentAuthority.scope?.can_submit_hiring_notice ?? (representative as any).can_submit_hiring_notice ?? false,
    can_submit_termination_notice: currentAuthority.scope?.can_submit_termination_notice ?? (representative as any).can_submit_termination_notice ?? false,
    official_correspondence_authority: currentAuthority.scope?.official_correspondence_authority ?? (representative as any).official_correspondence_authority ?? false,
    authority_limit: profile.authority_limit ?? currentAuthority.transaction_limit ?? representative.transaction_limit ?? '',
    currency: currentAuthority.currency || profile.currency || representative.currency || 'TRY',
    photo_logo: representative.photo_logo || [],
    authority_documents: representative.authority_documents || [],
    phones: Array.isArray(masterFields.phones) ? masterFields.phones : [],
    emails: Array.isArray(masterFields.emails) ? masterFields.emails : [],
    document_summary: representative.authority_documents || [],
    timeline: representative.authority_transaction_history || representative.history || [],
    field_history: buildEntityFieldHistory(representative.history || []),
  }
}

function normalizeRepresentativeEntityType(value: unknown): 'person' | 'organization' {
  const text = String(value || '').toLocaleLowerCase('tr-TR')
  if (['organization', 'company', 'tüzel_kisi', 'sirket', 'şirket'].includes(text)) return 'organization'
  return 'person'
}

function normalizePayload(raw: Record<string, any>, current?: Record<string, any>, mode: FormMode = 'create') {
  const payload = Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  )
  const effective = { ...(current || {}), ...payload }

  payload.company_id = payload.company_id || current?.company_id
  if (payload.master_entity_kind === 'person') payload.person_or_entity_type = 'person'
  if (payload.master_entity_kind === 'organization') payload.person_or_entity_type = 'organization'
  payload.person_or_entity_type = payload.person_or_entity_type || effective.person_or_entity_type || 'person'
  payload.display_name = payload.person_or_entity_type === 'organization'
    ? effective.trade_name || effective.short_name || effective.display_name
    : [effective.first_name, effective.last_name].filter(Boolean).join(' ').trim() || effective.display_name
  payload.nationality = normalizeCountryId(payload.nationality || payload.nationality_country || payload.country || 'TR')
  payload.country = normalizeCountryId(payload.country || payload.nationality_country || payload.nationality || 'TR')
  payload.nationality_country = normalizeCountryId(payload.nationality_country || payload.country || payload.nationality || 'TR')
  payload.identity_number = payload.identity_number || payload.national_id || payload.national_id || payload.tax_number || payload.tax_number || payload.passport_no || payload.passport_no
  if (mode === 'create') {
    delete payload.status
    delete payload.record_status
  }
  payload.person_kind = payload.person_or_entity_type
  const isDraftEdit = mode === 'edit' && getRepresentativeRecordStatus(current) === 'draft'
  if (mode !== 'create') {
    for (const field of REPRESENTATIVE_OPERATION_CONTROLLED_FIELDS) {
      if (isDraftEdit && !['status', 'record_status', 'current_authority', 'authority_transaction_history'].includes(field)) continue
      delete payload[field]
    }
  }
  delete payload.source_link
  payload.document_summary = undefined
  payload.field_history = undefined
  return payload
}

function withRepresentativeConcurrency(payload: Record<string, any>, current?: Record<string, any> | null) {
  if (!current) return payload
  return {
    ...payload,
    ...(current.version !== undefined && current.version !== null ? { base_version: current.version } : {}),
    ...(current.updated_at ? { base_updated_at: current.updated_at } : {}),
  }
}

function getRepresentativeCompanySelectionError(payload: Record<string, any>): SaveError | null {
  if (payload.company_id) return null
  const error = new Error('Şirket seçimi zorunludur') as SaveError
  error.fieldErrors = { company_id: 'Şirket seçimi zorunludur' }
  error.toast = { type: 'warning', title: 'Eksik Zorunlu Alan', message: 'Şirket' }
  return error
}

function getRepresentativeStatusLabel(recordStatus: string, fallback?: string) {
  const labels: Record<string, string> = {
    draft: 'Taslak',
    active: 'Aktif',
    suspended: 'Askıda',
    expired: 'Süresi Dolmuş',
    terminated: 'Sona Erdi',
    passive: 'Pasif',
  }
  return labels[recordStatus] || fallback || 'Taslak'
}

function getRepresentativeRecordStatus(representative?: Record<string, any> | null) {
  const currentStatus = representative?.current_authority?.record_status
  const recordStatus = currentStatus || representative?.record_status
  if (recordStatus) return String(recordStatus).toLocaleLowerCase('tr-TR')
  if (isSoftDeletedRecord(representative)) return 'passive'
  const status = String(representative?.current_authority?.status || representative?.status || '').toLocaleLowerCase('tr-TR')
  if (status.includes('ask')) return 'suspended'
  if (status.includes('son') || status.includes('sona')) return 'terminated'
  if (status.includes('aktif')) return 'active'
  return 'draft'
}

function normalizeRepresentativeStatusFilters(values: string[]) {
  const allowed = new Set(REPRESENTATIVE_STATUS_FILTER_OPTIONS.map(option => option.value))
  const next = values.filter(value => allowed.has(value))
  return next.length ? next : DEFAULT_REPRESENTATIVE_STATUS_FILTERS
}

function getRepresentativeTypeLabel(representative: Record<string, any>) {
  const profile = representative.representative_profile || {}
  const value = profile.representative_type || profile.role_type || representative.representative_type || getRepresentativePrimaryAuthority(representative)
  if (!value) return 'Şirket Temsilcisi'
  return toAuthorityLabel(String(value))
}

function getRepresentativeSourceTypeLabel(value: unknown) {
  const labels: Record<string, string> = {
    new: 'Yeni Kayıt',
    master_person: 'Kişi Master',
    master_organization: 'Kurum Master',
    partner: 'Ortak',
    employee: 'Çalışan',
    external: 'Harici',
  }
  const key = String(value || 'new')
  return labels[key] || key
}

function getRepresentativeLastOperationLabel(representative: Record<string, any>) {
  const history = Array.isArray(representative.authority_transaction_history) ? representative.authority_transaction_history : []
  const lastTransaction = representative.last_authority_transaction || history[0]
  return lastTransaction?.transaction_type || representative.last_operation || '-'
}

function getRepresentativeLifecycleOperationProgress(recordStatus: string) {
  if (recordStatus === 'draft') {
    return { activeActionKey: 'representative-start' }
  }
  if (recordStatus === 'active') {
    return { completedActionKeys: ['representative-start'], activeActionKeys: ['representative-suspend', 'representative-terminate'] }
  }
  if (recordStatus === 'suspended') {
    return { completedActionKeys: ['representative-start', 'representative-suspend'], activeActionKey: 'representative-terminate' }
  }
  if (['terminated', 'expired'].includes(recordStatus)) {
    return { completedActionKeys: ['representative-start', 'representative-terminate'] }
  }
  return {}
}

function canHardDeleteRepresentative(representative?: Record<string, any> | null) {
  if (!representative) return false
  if (getRepresentativeRecordStatus(representative) !== 'draft') return false
  const hasAuthorityHistory = Array.isArray(representative.authority_transaction_history) && representative.authority_transaction_history.length > 0
  const hasHistory = Array.isArray(representative.history) && representative.history.length > 0
  return !hasAuthorityHistory && !representative.last_authority_transaction && !hasHistory && !isSoftDeletedRecord(representative)
}

function buildEntityFieldHistory(history: any[]) {
  const trackedMap: Record<string, string> = {
    status: 'status',
    authority_types: 'primary_authority_type',
    signature_type: 'signature_type',
    transaction_limit: 'authority_limit',
    start_date: 'start_date',
    end_date: 'end_date',
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

async function createSaveError(response: Response, fallback: string): Promise<SaveError> {
  const body = await response.json().catch(() => ({}))
  const code = body.code || `HTTP_${response.status}`
  const zodFieldErrors = body.details?.fieldErrors || {}
  const fields = Object.keys(zodFieldErrors)

  if (code === 'VALIDATION_FAILED' && fields.length > 0) {
    const message = fields.map(field => FIELD_LABELS[field] || field).join(', ')
    const error = new Error(`Eksik Zorunlu Alan [${message}]`) as SaveError
    error.fieldErrors = Object.fromEntries(fields.map(field => [field, `${FIELD_LABELS[field] || field} zorunludur`]))
    error.toast = { type: 'warning', title: 'Eksik Zorunlu Alan', message }
    return error
  }

  const message = `${body.error || fallback} [${code}]`
  const error = new Error(message) as SaveError
  error.toast = { type: 'error', title: 'Kayıt Başarısız', message }
  return error
}
