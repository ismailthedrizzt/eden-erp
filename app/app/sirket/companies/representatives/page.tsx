'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, BadgeCheck, CheckCircle2, ListChecks, ShieldCheck } from 'lucide-react'
import { EntityForm, FormField, FormMode, FormOperationActionGroup, FormTab } from '@/components/ui/EntityForm'
import { PageBanner } from '@/components/ui/PageBanner'
import { RecordLifecycleWizard, type RecordLifecycleWizardSection, type RecordLifecycleWizardStep } from '@/components/ui/RecordLifecycleWizard'
import {
  DEFAULT_RECORD_STATUS_FILTERS,
  SmartDataTable,
  ColumnDef,
  SortConfig,
  WidgetDef,
  normalizeRecordStatusFilters,
  type RecordStatusFilterValue,
  type TableStatusFilterOption,
} from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { DraftCreateNotice } from '@/components/ui/DraftCreateNotice'
import { SmartEmptyState } from '@/components/ui/SmartEmptyState'
import { useRegisterActionGuideContext } from '@/components/ai/ActionGuideContext'
import { normalizeCountryId } from '@/lib/reference/country-nationalities'
import { createRealPersonMasterTabs } from '@/lib/identity/realPersonFormSections'
import { createLegalEntityMasterTabs } from '@/lib/identity/legalEntityFormSections'
import { isSoftDeletedRecord } from '@/lib/forms/entityState'
import { createProgressiveFormLoadStages } from '@/lib/forms/progressiveFormLoading'
import { invalidateEntityDetailCache, readEntityDetailCache, writeEntityDetailCache } from '@/lib/forms/entityDetailCache'
import { companyService } from '@/lib/services/companyService'
import { getControlledFieldNames } from '@/lib/field-controls/fieldControlRegistry'
import { useModules } from '@/lib/security/moduleStore'
import { usePermissions } from '@/lib/security/permissionStore'
import { applyVisibilityToOperationGroups } from '@/lib/visibility/actionVisibility'
import type { ListMeta } from '@/lib/api/listEndpoint'

type PageState = 'list' | 'create' | 'view' | 'edit'
type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }
type SaveError = Error & { toast?: ToastState; fieldErrors?: Record<string, string>; code?: string }
type Option = { value: string; label: string }
type RepresentativeAuthorityStatusFilterValue = 'draft' | 'active' | 'suspended' | 'expired' | 'terminated'
type RepresentativeAuthorityScopeFilterValue = '' | 'company_wide' | 'branch' | 'organization_unit' | 'facility'

const REPRESENTATIVE_RECORD_STATUS_FILTER_OPTIONS: TableStatusFilterOption[] = [
  { value: 'draft', label: 'Taslak Kart', tone: 'draft' },
  { value: 'active', label: 'Aktif Kart', tone: 'active' },
  { value: 'passive', label: 'Pasif Kart', tone: 'passive' },
]

const REPRESENTATIVE_AUTHORITY_STATUS_FILTER_OPTIONS: TableStatusFilterOption[] = [
  { value: 'draft', label: 'Taslak Yetki', tone: 'draft' },
  { value: 'active', label: 'Aktif Yetki', tone: 'active' },
  { value: 'suspended', label: 'Askıda', tone: 'neutral' },
  { value: 'expired', label: 'Süresi Dolmuş', tone: 'passive' },
  { value: 'terminated', label: 'Sonlandırılmış', tone: 'passive' },
]

const DEFAULT_REPRESENTATIVE_AUTHORITY_STATUS_FILTERS: RepresentativeAuthorityStatusFilterValue[] =
  REPRESENTATIVE_AUTHORITY_STATUS_FILTER_OPTIONS.map(option => option.value as RepresentativeAuthorityStatusFilterValue)

function normalizeRepresentativeAuthorityStatusFilters(values: string[]): RepresentativeAuthorityStatusFilterValue[] {
  const allowed = new Set(DEFAULT_REPRESENTATIVE_AUTHORITY_STATUS_FILTERS)
  const next = values.filter((value): value is RepresentativeAuthorityStatusFilterValue =>
    allowed.has(value as RepresentativeAuthorityStatusFilterValue)
  )
  return next.length ? next : DEFAULT_REPRESENTATIVE_AUTHORITY_STATUS_FILTERS
}

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
  record_status?: 'draft' | 'active' | 'passive'
  authority_status?: string
  authority_record_status?: 'draft' | 'active' | 'suspended' | 'expired' | 'terminated'
  authority_start_date?: string
  authority_end_date?: string
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
  scope_type?: string
  branch_id?: string | null
  organization_unit_id?: string | null
  facility_id?: string | null
  scope_label?: string
  scope_notes?: string
  authority_types_summary?: string
  signature_rule_summary?: string
  authority_warnings?: string[]
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

const REPRESENTATIVE_OPERATION_CONTROLLED_FIELDS = new Set(getControlledFieldNames('company_representative'))

const REPRESENTATIVE_CREATE_HIDDEN_HERO_FIELDS = new Set([
  'start_date',
  'end_date',
  'primary_authority_type',
  'signature_type',
  'authority_limit',
  'currency',
])

function toAuthorityValue(value: string) {
  return value
}

function toAuthorityLabel(value: string) {
  return AUTHORITY_LABEL_BY_VALUE[value] || value
}

function uniqueOptions(options: Array<{ value: string; label: string }>) {
  const seen = new Set<string>()
  return options.filter(option => {
    if (!option.value || seen.has(option.value)) return false
    seen.add(option.value)
    return true
  })
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

function getRepresentativeScope(representative: Record<string, any>) {
  const scope = representative.current_authority?.scope || {}
  return {
    scope_type: representative.scope_type || scope.scope_type || 'company_wide',
    branch_id: representative.branch_id || scope.branch_id || null,
    organization_unit_id: representative.organization_unit_id || scope.organization_unit_id || null,
    facility_id: representative.facility_id || scope.facility_id || null,
    scope_label: representative.scope_label || scope.scope_label || '',
    scope_notes: representative.scope_notes || scope.scope_notes || '',
  }
}

function getRepresentativeScopeLabel(representative: Record<string, any>) {
  const scope = getRepresentativeScope(representative)
  if (scope.scope_label) return scope.scope_label
  if (scope.scope_type === 'branch') return 'Belirli şube'
  if (scope.scope_type === 'organization_unit') return 'Belirli organizasyon birimi'
  if (scope.scope_type === 'facility') return 'Belirli tesis/lokasyon'
  return 'Şirket geneli'
}

const columns: ColumnDef[] = [
  { key: 'record_status', label: 'Durum', type: 'enum', width: 44, minWidth: 44, maxWidth: 44, fixedWidth: true, sortable: false, hideHeaderLabel: true, category: 'Durum', order: -100, fixed: true, hideable: false, render: (_value, row) => <RepresentativeStatusDot status={getRepresentativeRecordLifecycleStatus(row)} /> },
  { key: 'avatar', label: 'Avatar', type: 'avatar', width: 72, minWidth: 72, maxWidth: 72, fixedWidth: true, sortable: false, hideHeaderLabel: true, category: 'Kimlik', order: -90, fixed: true, hideable: false, imageFit: 'cover', imageShape: 'circle' },
  { key: 'display_name', label: 'Ad Soyad / Ünvan', type: 'text', width: 260, minWidth: 180, sortable: true, category: 'Kimlik', required: true, render: (value, row) => <RepresentativeNameCell value={value} row={row} /> },
  { key: 'company_name', label: 'Temsil Ettiği Şirket', type: 'text', width: 220, category: 'Şirket', required: true },
  { key: 'representative_type_label', label: 'Temsilci Tipi', type: 'enum', width: 160, category: 'Kimlik', visible: false },
  { key: 'person_kind_label', label: 'Kişi / Kurum Tipi', type: 'enum', width: 150, category: 'Kimlik', visible: false },
  { key: 'source_type_label', label: 'Kaynak Türü', type: 'enum', width: 150, category: 'Kimlik', visible: false },
  { key: 'primary_authority_type', label: 'Ana Yetki Tipi', type: 'enum', width: 180, category: 'Yetki', visible: false },
  { key: 'authority_types_summary', label: 'Yetki Türleri', type: 'text', width: 220, category: 'Yetki' },
  { key: 'signature_type_label', label: 'İmza Türü', type: 'enum', width: 130, category: 'Yetki' },
  { key: 'signature_rule_summary', label: 'İmza Kuralı', type: 'enum', width: 150, category: 'Yetki', visible: false },
  { key: 'authority_status_label', label: 'Yetki Durumu', type: 'enum', width: 130, sortable: true, category: 'Yetki', required: true },
  { key: 'scope_label', label: 'Yetki Kapsamı', type: 'enum', width: 170, category: 'Yetki' },
  { key: 'branch_name', label: 'Şube', type: 'text', width: 180, category: 'Kapsam', visible: false },
  { key: 'organization_unit_name', label: 'Organizasyon Birimi', type: 'text', width: 190, category: 'Kapsam', visible: false },
  { key: 'facility_name', label: 'Tesis/Lokasyon', type: 'text', width: 180, category: 'Kapsam', visible: false },
  { key: 'authority_start_date', label: 'Yürürlük Başlangıcı', type: 'date', width: 140, category: 'Tarih' },
  { key: 'authority_end_date', label: 'Yürürlük Bitişi', type: 'date', width: 130, category: 'Tarih' },
  { key: 'limit_summary', label: 'Limit Özeti', type: 'text', width: 170, category: 'Yetki' },
  { key: 'currency', label: 'Para Birimi', type: 'enum', width: 110, category: 'Yetki', visible: false },
  { key: 'last_operation_label', label: 'Son İşlem', type: 'enum', width: 180, category: 'Durum', visible: false },
  { key: 'warnings_summary', label: 'Uyarılar', type: 'text', width: 220, category: 'Durum', visible: false },
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
    name: 'representative_status_summary',
    label: 'Durum Özeti',
    type: 'custom',
    hideLabel: true,
    colSpan: 3,
    render: ({ data }) => <RepresentativeStatusSummary data={data} />,
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
  const searchParams = useSearchParams()
  const [pageState, setPageState] = useState<PageState>('list')
  const [representatives, setRepresentatives] = useState<RepresentativeRow[]>([])
  const [companies, setCompanies] = useState<Option[]>([])
  const [branches, setBranches] = useState<Record<string, any>[]>([])
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
  const [statusFilters, setStatusFilters] = useState<RecordStatusFilterValue[]>(DEFAULT_RECORD_STATUS_FILTERS)
  const [authorityStatusFilters, setAuthorityStatusFilters] = useState<RepresentativeAuthorityStatusFilterValue[]>(DEFAULT_REPRESENTATIVE_AUTHORITY_STATUS_FILTERS)
  const [companyFilterId, setCompanyFilterId] = useState('')
  const [branchFilterId, setBranchFilterId] = useState('')
  const [scopeTypeFilter, setScopeTypeFilter] = useState<RepresentativeAuthorityScopeFilterValue>('')
  const [includeCompanyWide, setIncludeCompanyWide] = useState(true)
  const [listQuery, setListQuery] = useState({ page: 1, pageSize: 50, search: '', sort: 'created_at', direction: 'desc' as 'asc' | 'desc' })
  const [listMeta, setListMeta] = useState<ListMeta>({ page: 1, pageSize: 50, total: 0, totalPages: 1 })
  const [toast, setToast] = useState<ToastState | null>(null)
  const [authorityWizardOpen, setAuthorityWizardOpen] = useState(false)
  const [authorityWizardType, setAuthorityWizardType] = useState<RepresentativeAuthorityTransactionType>('Temsilcilik Başlatma')

  useEffect(() => {
    const companyId = searchParams.get('company_id') || ''
    const branchId = searchParams.get('branch_id') || ''
    const scopeType = searchParams.get('scope_type') || ''
    if (companyId) setCompanyFilterId(companyId)
    if (branchId) {
      setBranchFilterId(branchId)
      setIncludeCompanyWide(searchParams.get('include_company_wide_for_branch') !== 'false')
    }
    if (['company_wide', 'branch', 'organization_unit', 'facility'].includes(scopeType)) {
      setScopeTypeFilter(scopeType as RepresentativeAuthorityScopeFilterValue)
    }
  }, [searchParams])

  const isSelectedPassive = isSoftDeletedRecord(selectedRepresentative)
  const selectedRecordStatus = selectedRepresentative ? getRepresentativeRecordStatus(selectedRepresentative) : null
  const modules = useModules()
  const permissions = usePermissions()
  const operationVisibilityContext = useMemo(() => ({
    currentPage: 'representatives',
    moduleKey: 'representatives',
    recordType: 'representative',
    recordId: selectedRepresentative?.id,
    recordStatus: selectedRecordStatus || undefined,
    companyId: selectedRepresentative?.company_id || companyFilterId || undefined,
    branchId: selectedRepresentative?.branch_id || branchFilterId || undefined,
    permissions: Array.from(permissions.permissions),
    modules: modules.runtimeModules,
  }), [branchFilterId, companyFilterId, modules.runtimeModules, permissions.permissions, selectedRecordStatus, selectedRepresentative])
  useRegisterActionGuideContext({
    currentPage: 'representatives',
    selectedRecordId: selectedRepresentative?.id || null,
    selectedRecordType: selectedRepresentative?.id ? 'representative' : null,
    selectedRecordStatus,
    activeCompanyId: selectedRepresentative?.company_id || companyFilterId || null,
    activeBranchId: branchFilterId || selectedRepresentative?.branch_id || null,
    context: {
      hasActiveAuthority: selectedRepresentative ? getRepresentativeAuthorityStatus(selectedRepresentative) === 'active' : false,
      authorityStatus: selectedRepresentative ? getRepresentativeAuthorityStatus(selectedRepresentative) : null,
    },
  })
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
      const shouldFilterAuthorityStatuses =
        authorityStatusFilters.length < REPRESENTATIVE_AUTHORITY_STATUS_FILTER_OPTIONS.length
      const representativePayload = await companyService.representativesList({
        companyId: companyFilterId || undefined,
        branchId: branchFilterId || undefined,
        scopeType: scopeTypeFilter || undefined,
        includeCompanyWide: !!branchFilterId && includeCompanyWide,
        statuses: statusFilters,
        authorityStatuses: shouldFilterAuthorityStatuses ? authorityStatusFilters : undefined,
        includePassive: statusFilters.includes('passive'),
        useCache: !force,
        ...listQuery,
      })

      setRepresentatives(Array.isArray(representativePayload.data) ? representativePayload.data as RepresentativeRow[] : [])
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
  }, [statusFilters, authorityStatusFilters, companyFilterId, branchFilterId, scopeTypeFilter, includeCompanyWide, listQuery])

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
    const branchPayload = await companyService.branchesList({ useCache: !force, statuses: ['active', 'passive', 'closed'], pageSize: 200 })
    setBranches(Array.isArray(branchPayload.data) ? branchPayload.data : [])
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
  const visibleBranchOptions = useMemo(() => branches.filter(branch => !companyFilterId || branch.company_id === companyFilterId), [branches, companyFilterId])
  const branchById = useMemo(() => Object.fromEntries(branches.map(branch => [branch.id, branch])), [branches])
  const organizationUnitById = useMemo(() => Object.fromEntries(branches.filter(branch => branch.organization_unit_id).map(branch => [branch.organization_unit_id, { id: branch.organization_unit_id, name: branch.organization_unit_name }])), [branches])
  const facilityById = useMemo(() => Object.fromEntries(branches.filter(branch => branch.facility_id).map(branch => [branch.facility_id, { id: branch.facility_id, name: branch.facility_name }])), [branches])
  const tableData = useMemo(() => representatives.map(representative => ({
    ...representative,
    display_name: representative.display_name || representative.full_name || '',
    avatar: getRepresentativeAvatarUrl(representative),
    person_kind_label: representative.person_kind === 'organization' ? 'Tüzel Kişi' : 'Gerçek Kişi',
    representative_type_label: getRepresentativeTypeLabel(representative),
    source_type_label: getRepresentativeSourceTypeLabel(representative.source_type),
    company_name: companyNameById[representative.company_id] || '-',
    primary_authority_type: toAuthorityLabel(getRepresentativePrimaryAuthority(representative) || '-'),
    authority_types_summary: getRepresentativeAuthorityTypes(representative).map(toAuthorityLabel).join(', ') || '-',
    signature_type_label: representative.current_authority?.signature_type || representative.signature_type || '-',
    signature_rule_summary: getRepresentativeSignatureRuleSummary(representative),
    record_status: getRepresentativeRecordStatus(representative),
    authority_status: getRepresentativeAuthorityStatus(representative),
    authority_record_status: representative.current_authority?.authority_record_status || representative.authority_record_status || '',
    authority_status_label: getRepresentativeAuthorityStatusLabel(getRepresentativeAuthorityStatus(representative), representative.current_authority?.authority_status || representative.authority_status),
    scope_label: getRepresentativeScopeLabel(representative),
    branch_name: branchById[getRepresentativeScope(representative).branch_id || '']?.branch_name || '',
    organization_unit_name: organizationUnitById[getRepresentativeScope(representative).organization_unit_id || '']?.name || '',
    facility_name: facilityById[getRepresentativeScope(representative).facility_id || '']?.name || '',
    authority_start_date: representative.current_authority?.effective_date || representative.authority_start_date || representative.start_date || '',
    authority_end_date: representative.current_authority?.end_date || representative.authority_end_date || representative.end_date || '',
    last_operation_label: getRepresentativeLastOperationLabel(representative),
    authority_limit: representative.current_authority?.transaction_limit ?? representative.transaction_limit,
    limit_summary: getRepresentativeLimitSummary(representative),
    currency: getRepresentativeAuthorityCurrency(representative),
    authority_warnings: getRepresentativeAuthorityWarnings(representative),
    warnings_summary: getRepresentativeWarningsSummary(representative),
  })), [branchById, companyNameById, facilityById, organizationUnitById, representatives])

  const activeAuthorityCount = useMemo(() => tableData.filter(row => getRepresentativeAuthorityStatus(row) === 'active').length, [tableData])
  const draftCardCount = useMemo(() => tableData.filter(row => getRepresentativeRecordStatus(row) === 'draft').length, [tableData])
  const suspendedAuthorityCount = useMemo(() => tableData.filter(row => getRepresentativeAuthorityStatus(row) === 'suspended').length, [tableData])
  const expiringSoonCount = useMemo(() => tableData.filter(isRepresentativeAuthorityExpiringSoon).length, [tableData])
  const companyWideAuthorityCount = useMemo(() => tableData.filter(row => getRepresentativeScope(row).scope_type === 'company_wide').length, [tableData])
  const branchScopedAuthorityCount = useMemo(() => tableData.filter(row => getRepresentativeScope(row).scope_type === 'branch').length, [tableData])
  const widgets: WidgetDef<any>[] = useMemo(() => [
    { key: 'total', label: 'Toplam Kart', render: () => tableData.length },
    { key: 'active_authority', label: 'Aktif Yetkili', render: () => activeAuthorityCount },
    { key: 'draft_cards', label: 'Taslak Kart', render: () => draftCardCount },
    { key: 'suspended', label: 'Askıda Yetki', render: () => suspendedAuthorityCount },
    { key: 'expiring', label: 'Süresi Yaklaşan', render: () => expiringSoonCount },
    { key: 'company_wide', label: 'Şirket Geneli', render: () => companyWideAuthorityCount },
    { key: 'branch_scope', label: 'Şube Bazlı', render: () => branchScopedAuthorityCount },
  ], [activeAuthorityCount, branchScopedAuthorityCount, companyWideAuthorityCount, draftCardCount, expiringSoonCount, suspendedAuthorityCount, tableData])

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
        allowDraftEdit: false,
      },
    }
  }

  const configuredHeroFields = heroFields.filter(field => field.name === 'company_id').map(field => {
    if (field.name === 'company_id') {
      return {
        ...field,
        options: companies,
        remoteOptions: {
          endpoint: '/api/companies?statuses=active&pageSize=40',
          queryParam: 'ara',
          minQueryLength: 2,
          limit: 40,
        },
        placeholder: companies.length === 0 ? 'Şirket seçiniz' : field.placeholder,
      }
    }
    return withRepresentativeOperationControl(field)
  })

  const configuredTabs = [
    ...createRealPersonMasterTabs({
      visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'person' },
      includeEmergencyContact: true,
    }),
    ...createLegalEntityMasterTabs({
      visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'organization' },
      websiteField: 'website',
    }),
    ...tabs
      .filter(tab => ['belgeler', 'notes', 'gecmis'].includes(tab.id))
      .filter(tab => pageState !== 'create' || ['belgeler', 'notes'].includes(tab.id))
      .map(tab => ({
        ...tab,
        fields: tab.fields.map(withRepresentativeOperationControl),
      })),
  ]

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
      const normalized = normalizeRepresentativeForForm(result.data as unknown as RepresentativeRow)
      setSelectedRepresentative(normalized)
      writeEntityDetailCache('company-representatives', row.id, normalized)
    } catch (err: any) {
      setFormError(err.message || 'Temsilci detayı yüklenemedi')
      setToast(err.toast || { type: 'error', title: 'Detay Yüklenemedi', message: err.message || 'Temsilci detayı yüklenemedi' })
    } finally {
      setDetailLoading(false)
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
      const result = mode === 'create'
        ? await companyService.createRepresentative(requestPayload)
        : await companyService.updateRepresentative(selectedRepresentative?.id || '', requestPayload)
      if (result.data) setSelectedRepresentative(normalizeRepresentativeForForm(result.data))
      setToast({ type: 'success', title: 'Kayıt Başarılı', message: mode === 'create' ? 'Temsilci kaydı oluşturuldu' : 'Temsilci bilgileri güncellendi' })
      await loadData(true)
      if (mode === 'create') invalidateEntityDetailCache('company-representatives')
      else invalidateEntityDetailCache('company-representatives', selectedRepresentative?.id)
      setPageState('list')
    } catch (err: any) {
      const saveError = createSaveErrorFromService(err, mode === 'create' ? 'Temsilci oluşturulamadı' : 'Güncelleme başarısız')
      setFormError(saveError.message)
      setFieldErrors(saveError.fieldErrors || {})
      setToast(saveError.toast || { type: 'error', title: 'Kayıt Başarısız', message: saveError.message })
      throw saveError
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (representativeId = selectedRepresentative?.id) => {
    if (!representativeId) return
    setDeleting(true)
    try {
      const result = await companyService.deleteRepresentativeDraft(representativeId)
      setToast({
        type: 'success',
        title: result.hardDeleted ? 'Taslak Silindi' : 'Silme İşlemi Tamamlandı',
        message: result.hardDeleted
          ? 'Temsilci kartı taslağı kalıcı olarak silindi.'
          : 'Temsilci kaydı backend sonucuna göre güncellendi.',
      })
      await loadData(true)
      setPageState('list')
    } catch (err: any) {
      const saveError = createSaveErrorFromService(err, 'Silme işlemi başarısız')
      if (['REPRESENTATIVE_DELETE_REQUIRES_TERMINATION', 'REPRESENTATIVE_DELETE_HAS_AUTHORITY_HISTORY'].includes(saveError.code || '')) {
        setToast({ type: 'warning', title: 'Yetki Sonlandırma Gerekli', message: 'Yetki veya işlem geçmişi olan temsilci kaydı doğrudan silinemez. Yetki Sonlandırma işlemini kullanın.' })
        if (selectedRepresentative?.id === representativeId) openAuthorityWizard('Sonlandırma')
      } else {
        setToast(saveError.toast || { type: 'error', title: 'Kayıt Başarısız', message: saveError.message })
      }
      throw saveError
    } finally {
      setDeleting(false)
    }
  }

  const openAuthorityWizard = (transactionType: RepresentativeAuthorityTransactionType) => {
    if (!selectedRepresentative?.id) return
    setAuthorityWizardType(transactionType)
    setAuthorityWizardOpen(true)
  }

  useEffect(() => {
    const onGuideCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ action_type?: string; wizard_key?: string }>).detail
      if (!detail) return
      if (detail.action_type === 'start_create') {
        setSelectedRepresentative(null)
        setPageState('create')
        if (!companies.length) loadCompanyOptions().catch(() => setCompanies([]))
        return
      }
      if (detail.action_type !== 'open_wizard' || !selectedRepresentative?.id) return
      if (detail.wizard_key === 'representative_start') openAuthorityWizard('Temsilcilik Başlatma')
      if (detail.wizard_key === 'representative_authority_renewal') openAuthorityWizard('Yetki Yenileme')
      if (detail.wizard_key === 'representative_authority_scope_change') openAuthorityWizard('Yetki Kapsamı Değişikliği')
      if (detail.wizard_key === 'representative_limit_change') openAuthorityWizard('Limit Değişikliği')
      if (detail.wizard_key === 'representative_suspend') openAuthorityWizard('Askıya Alma')
      if (detail.wizard_key === 'representative_terminate') openAuthorityWizard('Sonlandırma')
    }

    window.addEventListener('eden:action-guide-command', onGuideCommand)
    return () => window.removeEventListener('eden:action-guide-command', onGuideCommand)
  })

  const handleAuthorityWizardSubmit = async (payload: Record<string, any>) => {
    if (!selectedRepresentative?.id) return
    setSaving(true)
    try {
      const requestPayload = withRepresentativeConcurrency(payload, selectedRepresentative)
      const result = await runRepresentativeAuthorityService(selectedRepresentative.id, payload.transaction_type, requestPayload)
      if (result.data) setSelectedRepresentative(normalizeRepresentativeForForm(result.data))
      setAuthorityWizardOpen(false)
      invalidateEntityDetailCache('company-representatives', selectedRepresentative.id)
      await loadData(true)
      setToast({ type: 'success', title: 'Temsilcilik İşlemi Oluşturuldu', message: `${payload.transaction_type} operation kaydı oluşturuldu.` })
      setPageState('view')
    } catch (err: any) {
      const saveError = createSaveErrorFromService(err, 'Temsilcilik işlemi tamamlanamadı')
      setToast(saveError.toast || { type: 'error', title: 'Temsilcilik İşlemi Başarısız', message: saveError.message })
      throw saveError
    } finally {
      setSaving(false)
    }
  }

  const getRepresentativeOperationActions = (): FormOperationActionGroup[] => {
    if (!selectedRepresentative?.id || pageState === 'create') return []
    const recordStatus = getRepresentativeRecordStatus(selectedRepresentative)
    const authorityStatus = getRepresentativeAuthorityStatus(selectedRepresentative)
    if (recordStatus === 'passive') return []

    const lifecycleActions = (() => {
      if (recordStatus === 'draft') return [{
          key: 'representative-start',
          label: 'Temsilcilik Başlat',
          icon: <ListChecks size={15} />,
          onClick: () => openAuthorityWizard('Temsilcilik Başlatma'),
        }]
      if (recordStatus === 'active' && authorityStatus === 'suspended') return [
        {
          key: 'representative-resume',
          label: 'Askıdan Kaldır / Yetki Yenile',
          icon: <ListChecks size={15} />,
          onClick: () => openAuthorityWizard('Yetki Yenileme'),
        },
        {
          key: 'representative-terminate',
          label: 'Sonlandır',
          icon: <ListChecks size={15} />,
          tone: 'danger' as const,
          onClick: () => openAuthorityWizard('Sonlandırma'),
        },
      ]
      if (recordStatus === 'active' && authorityStatus === 'active') return [
          {
            key: 'representative-suspend',
            label: 'Askıya Al',
            icon: <ListChecks size={15} />,
            onClick: () => openAuthorityWizard('Askıya Alma'),
          },
          {
            key: 'representative-terminate',
            label: 'Sonlandır',
            icon: <ListChecks size={15} />,
            tone: 'danger' as const,
            onClick: () => openAuthorityWizard('Sonlandırma'),
          },
        ]
      return []
    })()

    const authorityActions = recordStatus === 'active' && authorityStatus === 'active'
      ? (['Yetki Yenileme', 'Yetki Kapsamı Değişikliği', 'Limit Değişikliği', 'Düzeltme Kaydı', 'Ters Kayıt'] as RepresentativeAuthorityTransactionType[]).map(transactionType => ({
          key: `representative-${transactionType}`,
          label: transactionType === 'Yetki Kapsamı Değişikliği'
            ? 'Yetki Kapsamı Değiştir'
            : transactionType === 'Limit Değişikliği'
              ? 'Limit Değiştir'
              : transactionType,
          icon: <ListChecks size={15} />,
          onClick: () => openAuthorityWizard(transactionType),
        }))
      : []

    const cardActions = pageState === 'view'
      ? [{
          key: 'representative-card-edit',
          label: 'Güncelle',
          onClick: () => setPageState('edit'),
        }]
      : []

    const groups: FormOperationActionGroup[] = [
      ...(lifecycleActions.length ? [{
        key: 'lifecycle',
        title: 'Yaşam Döngüsü',
        operationKind: 'lifecycle' as const,
        progress: getRepresentativeLifecycleOperationProgress(recordStatus),
        actions: lifecycleActions,
      }] : []),
      ...(authorityActions.length ? [{
        key: 'registration',
        title: 'Resmî Yetki İşlemleri',
        operationKind: 'official_update' as const,
        actions: authorityActions,
      }] : []),
      ...(cardActions.length ? [{
        key: 'basic_update',
        title: 'Güncelle',
        operationKind: 'basic_update' as const,
        actions: cardActions,
      }] : []),
    ]
    return applyVisibilityToOperationGroups(groups, operationVisibilityContext)
  }

  const bannerConfig = pageState === 'list'
    ? {
        mode: 'list' as const,
        title: 'Temsilcilerimiz',
        subtitle: 'Şirket temsilci ve yetki kayıtlarını yönetin',
        onAddClick: () => {
          setSelectedRepresentative(null)
          setPageState('create')
          if (!companies.length) loadCompanyOptions().catch(() => setCompanies([]))
        },
        addButtonText: 'Ekle',
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
          ? { onAddClick: (bannerConfig as any).onAddClick, addButtonText: (bannerConfig as any).addButtonText, addButtonTourId: 'quick-actions' }
          : { onBackClick: (bannerConfig as any).onBackClick }
        )}
      />

      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {pageState === 'list' && (
        <div className="mt-6 space-y-4">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
          <SmartDataTable
            columns={columns}
            data={tableData}
            loading={loading}
            defaultView="list"
            storageKey="companies-representatives-table-v2"
            emptyText={
              <SmartEmptyState
                title="Henüz temsilci kaydı yok"
                message="+ Ekle ile temsilci kartı taslağı oluşturabilir, ardından Temsilcilik Başlatma işlemiyle yetki verebilirsiniz."
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
            statusFilterOptions={REPRESENTATIVE_RECORD_STATUS_FILTER_OPTIONS}
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
            <DraftCreateNotice message="Bu işlem temsilci kartı taslağı oluşturur. Yetki, limit, imza türü ve kapsam bilgileri Temsilcilik Başlatma veya ilgili yetki işlemleriyle oluşturulur." />
          )}
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
            roleHeroCardTitle="Temsilci Kartı"
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

      {authorityWizardOpen && selectedRepresentative && (
        <RepresentativeAuthorityWizard
          representative={selectedRepresentative}
          companies={companies}
          branches={branches}
          transactionType={authorityWizardType}
          saving={saving}
          onClose={() => setAuthorityWizardOpen(false)}
          onSubmit={handleAuthorityWizardSubmit}
        />
      )}
    </div>
  )
}

function RepresentativeReadinessMetric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}) {
  return (
    <div className={[
      'min-w-0 rounded-lg border p-3',
      tone === 'neutral' ? 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50' : '',
      tone === 'success' ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30' : '',
      tone === 'warning' ? 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30' : '',
      tone === 'danger' ? 'border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30' : '',
    ].filter(Boolean).join(' ')}>
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white" title={value}>{value}</div>
    </div>
  )
}

function RepresentativeAuthorityWizard({
  representative,
  companies,
  branches,
  transactionType,
  saving,
  onClose,
  onSubmit,
}: {
  representative: Record<string, any>
  companies: Option[]
  branches: Record<string, any>[]
  transactionType: RepresentativeAuthorityTransactionType
  saving: boolean
  onClose: () => void
  onSubmit: (payload: Record<string, any>) => Promise<void>
}) {
  const current = representative.current_authority || {}
  const currentScope = getRepresentativeScope(representative)
  const isTermination = isRepresentativeTerminationTransaction(transactionType)
  const isEndOperation = transactionType === 'Sonlandırma'
  const isSuspension = transactionType === 'Askıya Alma'
  const isActivation = transactionType === 'Temsilcilik Başlatma'
  const recordStatus = getRepresentativeRecordStatus(representative)
  const authorityStatus = getRepresentativeAuthorityStatus(representative)
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
    scope_type: currentScope.scope_type,
    branch_id: currentScope.branch_id || '',
    organization_unit_id: currentScope.organization_unit_id || '',
    facility_id: currentScope.facility_id || '',
    scope_label: currentScope.scope_label || '',
    scope_notes: currentScope.scope_notes || '',
    termination_reason: '',
    notes: '',
  })
  const [localError, setLocalError] = useState<string | null>(null)
  const selectedCompany = companies.find(company => company.value === form.company_id)
  const steps = useMemo<RecordLifecycleWizardStep[]>(() => buildRepresentativeAuthorityWizardSteps({
    representative,
    companyLabel: selectedCompany?.label || '',
    branches,
    form,
    transactionType,
    isTermination,
    isEndOperation,
  }), [branches, form, isEndOperation, isTermination, representative, selectedCompany?.label, transactionType])

  const complete = async () => {
    setLocalError(null)
    if (isActivation && recordStatus !== 'draft') return setLocalError('Temsilcilik Başlatma yalnızca Taslak temsilci kartları için çalışır.')
    if (!isActivation && recordStatus !== 'active') return setLocalError('Temsilcilik işlemleri yalnızca Aktif temsilci kartları için yapılabilir.')
    if (isSuspension && authorityStatus !== 'active') return setLocalError('Askıya alma yalnızca Aktif yetki için yapılabilir.')
    if (isEndOperation && !['active', 'suspended'].includes(authorityStatus)) return setLocalError('Sonlandırma yalnızca Aktif veya Askıda yetki için yapılabilir.')
    if (!isActivation && !isTermination && authorityStatus === 'suspended' && transactionType !== 'Yetki Yenileme') return setLocalError('Askıdaki yetki için yalnızca Askıdan Kaldır / Yetki Yenile işlemi yapılabilir.')
    if (!form.company_id) return setLocalError('Şirket seçimi zorunludur.')
    if (!form.effective_date) return setLocalError('Yürürlük tarihi zorunludur.')
    if (!isTermination && form.authority_types.length === 0) return setLocalError('En az bir yetki tipi seçilmelidir.')
    if (!isTermination && form.authority_types.includes('signature_authority') && !form.signature_type) return setLocalError('İmza yetkisi için imza türü zorunludur.')
    if (!isTermination && form.scope_type === 'branch' && !form.branch_id) return setLocalError('Şube kapsamı için şube seçilmelidir.')
    if (!isTermination && form.scope_type === 'organization_unit' && !form.organization_unit_id) return setLocalError('Organizasyon birimi kapsamı için birim seçilmelidir.')
    if (!isTermination && form.scope_type === 'facility' && !form.facility_id) return setLocalError('Tesis/lokasyon kapsamı için tesis seçilmelidir.')
    if (isActivation && collectRepresentativeAuthorityWizardDocuments(form, representative).length === 0) return setLocalError('Aktivasyon için en az bir yetki belgesi eklenmelidir.')
    if (isEndOperation && !form.termination_reason) return setLocalError('Sonlandırma nedeni zorunludur.')
    if (isEndOperation && (!form.authority_document || typeof form.authority_document !== 'object')) return setLocalError('Sonlandırma için işlem belgesi eklenmelidir.')
    if (!isTermination && form.scope_type === 'company_wide' && (form.branch_id || form.organization_unit_id || form.facility_id)) {
      return setLocalError('Sirket geneli yetkide sube, organizasyon birimi veya tesis/lokasyon secilemez.')
    }
    if (!isTermination && form.scope_type === 'branch') {
      const selectedBranch = branches.find(branch => branch.id === form.branch_id)
      const branchStatus = String(selectedBranch?.record_status || selectedBranch?.status || '').toLocaleLowerCase('tr-TR')
      if (!selectedBranch || (!branchStatus.includes('active') && !branchStatus.includes('aktif'))) return setLocalError('Kapali veya pasif sube icin yeni aktif yetki verilemez.')
    }
    const limitFieldNames = ['transaction_limit', 'payment_approval_limit', 'purchase_approval_limit', 'bank_transaction_limit', 'contract_signature_limit']
    const limitValues = limitFieldNames
      .map(field => ({ field, raw: form[field] }))
      .filter(item => item.raw !== undefined && item.raw !== null && item.raw !== '')
      .map(item => ({ ...item, value: Number(item.raw) }))
    if (!isTermination && limitValues.some(item => !Number.isFinite(item.value))) return setLocalError('Yetki limitleri sayisal olmalidir.')
    if (!isTermination && limitValues.some(item => item.value < 0)) return setLocalError('Yetki limitleri negatif olamaz.')
    if (!isTermination && limitValues.length > 0 && !form.currency) return setLocalError('Limit girildiginde para birimi zorunludur.')
    if (!isTermination && form.signature_type === 'Müşterek' && form.can_approve_alone) {
      setForm(previous => ({ ...previous, can_approve_alone: false }))
      return setLocalError('Müşterek imza ve tek başına onay aynı anda seçilemez.')
    }
    if (form.end_date && form.effective_date && new Date(form.end_date) < new Date(form.effective_date)) {
      return setLocalError('Bitiş tarihi yürürlük tarihinden önce olamaz.')
    }
    await onSubmit({
      ...form,
      ...normalizeRepresentativeAuthorityScopePayload(form),
      requires_joint_signature: form.signature_type === 'Müşterek',
      can_approve_alone: form.signature_type === 'Müşterek' ? false : form.can_approve_alone,
      notes: isEndOperation ? [form.termination_reason, form.notes].filter(Boolean).join(' - ') : form.notes,
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
    />
  )

}

function normalizeRepresentativeAuthorityScopePayload(form: Record<string, any>) {
  const scopeType = form.scope_type || 'company_wide'
  return {
    scope_type: scopeType,
    branch_id: scopeType === 'branch' ? form.branch_id || null : null,
    organization_unit_id: scopeType === 'organization_unit' ? form.organization_unit_id || null : null,
    facility_id: scopeType === 'facility' ? form.facility_id || null : null,
    scope_label: form.scope_label || '',
    scope_notes: form.scope_notes || '',
  }
}

function buildRepresentativeAuthorityWizardSteps({
  representative,
  companyLabel,
  branches,
  form,
  transactionType,
  isTermination,
  isEndOperation,
}: {
  representative: Record<string, any>
  companyLabel: string
  branches: Record<string, any>[]
  form: Record<string, any>
  transactionType: RepresentativeAuthorityTransactionType
  isTermination: boolean
  isEndOperation: boolean
}): RecordLifecycleWizardStep[] {
  const companyBranches = branches.filter(branch => !form.company_id || branch.company_id === form.company_id)
  const branchOptions = companyBranches
    .filter(branch => String(branch.record_status || branch.status || 'active').toLocaleLowerCase('tr-TR') === 'active')
    .map(branch => ({ value: branch.id, label: branch.branch_name || branch.branch_short_name || branch.id }))
  const organizationUnitOptions = uniqueOptions(companyBranches
    .filter(branch => branch.organization_unit_id)
    .map(branch => ({ value: branch.organization_unit_id, label: branch.organization_unit_name || branch.organization_unit_id })))
  const facilityOptions = uniqueOptions(companyBranches
    .filter(branch => branch.facility_id)
    .map(branch => ({ value: branch.facility_id, label: branch.facility_name || branch.facility_id })))
  const steps: RecordLifecycleWizardStep[] = [
    {
      id: 'representative-authority-context',
      title: 'Bilgiler',
      description: undefined,
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
        ...(isTermination ? [{
          id: 'representative-authority-context-fields',
          title: 'Tarih ve not',
          fields: [
            { name: 'effective_date', label: 'Yürürlük Tarihi', type: 'date', required: true },
            { name: 'end_date', label: 'Bitiş Tarihi', type: 'date', placeholder: 'Boş bırakılırsa süresiz' },
            { name: 'termination_reason', label: 'Sonlandırma Nedeni', type: 'textarea', colSpan: 3, required: true, visibleWhen: { field: 'transaction_type', operator: 'equals', value: 'Sonlandırma' } },
            { name: 'notes', label: 'İşlem Notu', type: 'textarea', colSpan: 3 },
          ],
        } as RecordLifecycleWizardSection] : []),
      ],
    },
  ]

  if (!isTermination) {
    steps[0].sections.push(
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
            { name: 'effective_date', label: 'Yürürlük Tarihi', type: 'date', required: true },
            { name: 'end_date', label: 'Bitiş Tarihi', type: 'date', placeholder: 'Boş bırakılırsa süresiz' },
            { name: 'notes', label: 'İşlem Notu', type: 'textarea', colSpan: 3 },
            { name: 'currency', label: 'Para Birimi', type: 'select', options: [
              { value: 'TRY', label: 'TRY' },
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
              { value: 'GBP', label: 'GBP' },
            ] },
            ...(form.signature_type === 'Müşterek' ? [] : [{ name: 'can_approve_alone', label: 'Tek başına onaylayabilir', type: 'checkbox' as const }]),
          ],
        },
        {
          id: 'representative-authority-location-scope',
          title: 'Yetki kapsamı hedefi',
          fields: [
            { name: 'scope_type', label: 'Kapsam Türü', type: 'select', options: [
              { value: 'company_wide', label: 'Şirket geneli' },
              { value: 'branch', label: 'Belirli şube' },
              { value: 'organization_unit', label: 'Belirli organizasyon birimi' },
              { value: 'facility', label: 'Belirli tesis/lokasyon' },
            ] },
            { name: 'branch_id', label: 'Şube', type: 'select', options: branchOptions, visibleWhen: { field: 'scope_type', operator: 'equals', value: 'branch' }, required: form.scope_type === 'branch' },
            { name: 'organization_unit_id', label: 'Organizasyon Birimi', type: 'select', options: organizationUnitOptions, visibleWhen: { field: 'scope_type', operator: 'equals', value: 'organization_unit' }, required: form.scope_type === 'organization_unit' },
            { name: 'facility_id', label: 'Tesis/Lokasyon', type: 'select', options: facilityOptions, visibleWhen: { field: 'scope_type', operator: 'equals', value: 'facility' }, required: form.scope_type === 'facility' },
            { name: 'scope_label', label: 'Kapsam Etiketi', type: 'text' },
            { name: 'scope_notes', label: 'Kapsam Açıklaması', type: 'textarea', colSpan: 3 },
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
    )
  }

  steps.push(
    {
      id: 'representative-authority-documents',
      title: 'Belgeler',
      description: undefined,
      sections: [{
        id: 'representative-authority-document-fields',
        title: 'Belgeler',
        fields: [
          {
            name: 'authority_document',
            label: isEndOperation ? 'İşlem Kararı / Belgesi' : 'Yetki Belgesi',
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
      title: 'Ön İzleme/Onay',
      description: undefined,
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
            <SummaryMetric label="Kapsam" value={scopeTypeLabel(form.scope_type)} />
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

function scopeTypeLabel(value: unknown) {
  if (value === 'branch') return 'Belirli şube'
  if (value === 'organization_unit') return 'Belirli organizasyon birimi'
  if (value === 'facility') return 'Belirli tesis/lokasyon'
  return 'Şirket geneli'
}

function RepresentativeAuthorityStatusFilterBar({
  activeValues,
  onChange,
}: {
  activeValues: RepresentativeAuthorityStatusFilterValue[]
  onChange: (values: string[]) => void
}) {
  const activeSet = new Set(activeValues)
  const allSelected = activeValues.length === REPRESENTATIVE_AUTHORITY_STATUS_FILTER_OPTIONS.length

  const toggle = (value: string) => {
    const statusValue = value as RepresentativeAuthorityStatusFilterValue
    const next = activeSet.has(statusValue)
      ? activeValues.filter(item => item !== statusValue)
      : [...activeValues, statusValue]
    onChange(next.length ? next : DEFAULT_REPRESENTATIVE_AUTHORITY_STATUS_FILTERS)
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">Yetki Durumu</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Güncel temsil yetkisi
          </div>
        </div>
        <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-900 dark:text-gray-300">
          {allSelected ? 'Tüm yetki durumları' : `${activeValues.length}/${REPRESENTATIVE_AUTHORITY_STATUS_FILTER_OPTIONS.length} seçili`}
        </span>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Yetki durumu filtreleri">
        {REPRESENTATIVE_AUTHORITY_STATUS_FILTER_OPTIONS.map(option => {
          const active = activeSet.has(option.value as RepresentativeAuthorityStatusFilterValue)
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(option.value)}
              className={[
                'inline-flex h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-semibold transition-colors',
                active
                  ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm dark:border-blue-400 dark:bg-blue-500/15 dark:text-blue-100'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-900',
              ].join(' ')}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${getAuthorityFilterDotClass(option.tone)}`} aria-hidden="true" />
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function getAuthorityFilterDotClass(tone?: TableStatusFilterOption['tone']) {
  if (tone === 'draft') return 'bg-amber-400'
  if (tone === 'active') return 'bg-emerald-500'
  if (tone === 'passive') return 'bg-slate-400'
  return 'bg-blue-500'
}

function runRepresentativeAuthorityService(
  representativeId: string,
  transactionType: RepresentativeAuthorityTransactionType,
  payload: Record<string, any>
) {
  if (transactionType === 'Temsilcilik Başlatma') return companyService.startRepresentativeAuthority(representativeId, payload)
  if (transactionType === 'Yetki Yenileme') return companyService.renewRepresentativeAuthority(representativeId, payload)
  if (transactionType === 'Yetki Kapsamı Değişikliği') return companyService.changeRepresentativeAuthorityScope(representativeId, payload)
  if (transactionType === 'Limit Değişikliği') return companyService.changeRepresentativeLimit(representativeId, payload)
  if (transactionType === 'Askıya Alma') return companyService.suspendRepresentativeAuthority(representativeId, payload)
  if (transactionType === 'Sonlandırma') return companyService.terminateRepresentativeAuthority(representativeId, payload)
  if (transactionType === 'Düzeltme Kaydı') return companyService.correctRepresentativeAuthority(representativeId, payload)
  if (transactionType === 'Ters Kayıt') return companyService.reverseRepresentativeAuthority(representativeId, payload)
  return companyService.updateRepresentative(representativeId, { ...payload, authority_action: true, transaction_type: transactionType })
}

function RepresentativeStatusSummary({ data }: { data: Record<string, any> }) {
  const recordStatus = getRepresentativeRecordStatus(data)
  const authorityStatus = getRepresentativeAuthorityStatus(data)
  const startDate = data.current_authority?.effective_date || data.authority_start_date || data.start_date || '-'
  const endDate = data.current_authority?.end_date || data.authority_end_date || data.end_date || 'Süresiz'
  const warnings = getRepresentativeWarningsSummary(data)

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <SummaryMetric label="Kayıt Durumu" value={getRepresentativeRecordStatusLabel(recordStatus)} />
      <SummaryMetric label="Güncel Yetki Durumu" value={getRepresentativeAuthorityStatusLabel(authorityStatus, data.authority_status)} />
      <SummaryMetric label="Son İşlem" value={getRepresentativeLastOperationLabel(data)} />
      <SummaryMetric label="Yürürlük Başlangıcı" value={startDate} />
      <SummaryMetric label="Yürürlük Bitişi" value={endDate} />
      <SummaryMetric label="Uyarılar" value={warnings} />
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
    return <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700">Henüz temsilcilik işlem geçmişi bulunmuyor.</div>
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
  const rawProfile = isPlainRecord(representative.representative_profile) ? representative.representative_profile : {}
  const roleProfile = isPlainRecord(rawProfile.role) ? rawProfile.role : {}
  const nestedRoleProfile = isPlainRecord(roleProfile.representative_profile) ? roleProfile.representative_profile : {}
  const embeddedMasterProfile = isPlainRecord(rawProfile.master) ? rawProfile.master : {}
  const profile = { ...nestedRoleProfile, ...embeddedMasterProfile, ...roleProfile, ...rawProfile }
  const masterRecord = getRepresentativeMasterRecord(representative)
  const profileWithMaster = { ...profile, ...masterRecord }
  const currentAuthority = representative.current_authority || {}
  const authorityTypes = (
    currentAuthority.authority_types ||
    profile.authority_types ||
    representative.authority_types ||
    []
  ).map(toAuthorityValue)
  const primaryAuthority = getRepresentativePrimaryAuthority(representative)
  const read = (...keys: string[]) => firstPresent(...keys.map(key => (representative as any)[key]), ...keys.map(key => profile[key]), ...keys.map(key => masterRecord[key]))
  const readList = (...keys: string[]) => {
    for (const key of keys) {
      const value = (representative as any)[key]
      if (Array.isArray(value) && value.length > 0) return value
    }
    for (const key of keys) {
      const value = profile[key]
      if (Array.isArray(value) && value.length > 0) return value
    }
    for (const key of keys) {
      const value = masterRecord[key]
      if (Array.isArray(value) && value.length > 0) return value
    }
    return []
  }
  const displayName = read('display_name', 'full_name') || ''
  const recordStatus = getRepresentativeRecordStatus(representative)
  const status = getRepresentativeRecordStatusLabel(recordStatus)
  const authorityStatus = getRepresentativeAuthorityStatus(representative)
  return {
    ...masterRecord,
    ...profile,
    ...representative,
    master: isPlainRecord((representative as any).master) ? (representative as any).master : masterRecord,
    masterRecord,
    company_id: (representative as any).company_id || representative.company_id,
    person_or_entity_type: normalizeRepresentativeEntityType(profile.person_or_entity_type || (representative as any).person_or_entity_type || representative.person_kind),
    first_name: read('first_name') || '',
    last_name: read('last_name') || '',
    trade_name: read('trade_name', 'legal_name') || '',
    short_name: read('short_name') || '',
    full_name: read('full_name', 'display_name') || [read('first_name'), read('last_name')].filter(Boolean).join(' '),
    display_name: displayName,
    primary_authority_type: toAuthorityValue(primaryAuthority || authorityTypes[0] || ''),
    authority_types: authorityTypes,
    status,
    record_status: recordStatus,
    authority_status: currentAuthority.authority_status || representative.authority_status || getRepresentativeAuthorityStatusLabel(authorityStatus),
    authority_record_status: currentAuthority.authority_record_status || representative.authority_record_status || '',
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
    scope_type: currentAuthority.scope?.scope_type ?? representative.scope_type ?? 'company_wide',
    branch_id: currentAuthority.scope?.branch_id ?? representative.branch_id ?? '',
    organization_unit_id: currentAuthority.scope?.organization_unit_id ?? representative.organization_unit_id ?? '',
    facility_id: currentAuthority.scope?.facility_id ?? representative.facility_id ?? '',
    scope_label: currentAuthority.scope?.scope_label ?? representative.scope_label ?? '',
    scope_notes: currentAuthority.scope?.scope_notes ?? representative.scope_notes ?? '',
    authority_limit: profile.authority_limit ?? currentAuthority.transaction_limit ?? representative.transaction_limit ?? '',
    currency: currentAuthority.currency || profile.currency || representative.currency || 'TRY',
    photo_logo: representative.photo_logo || [],
    authority_documents: representative.authority_documents || [],
    phone: read('phone', 'mobile_phone') || '',
    email: read('email', 'email_1') || '',
    phones: readList('phones').length ? readList('phones') : buildLegacyContactRows(profileWithMaster, 'phone', 'phone', 'mobile_phone', 'work_phone', 'phone_1', 'phone_2'),
    emails: readList('emails').length ? readList('emails') : buildLegacyContactRows(profileWithMaster, 'address', 'email', 'email_1', 'email_2'),
    address: read('address') || '',
    city: read('city') || '',
    district: read('district') || '',
    country: read('country', 'nationality_country', 'nationality') || '',
    is_illiterate: !!read('is_illiterate'),
    education_schools: readList('education_schools'),
    foreign_languages: readList('foreign_languages'),
    certificates: readList('certificates'),
    marital_status: read('marital_status') || '',
    relatives: readList('relatives'),
    emergency_contact_first_name: read('emergency_contact_first_name') || '',
    emergency_contact_last_name: read('emergency_contact_last_name') || '',
    emergency_contact_relationship: read('emergency_contact_relationship') || '',
    emergency_contact_phone: read('emergency_contact_phone') || '',
    contact_points: readList('contact_points'),
    entity_bank_accounts: readList('entity_bank_accounts').length ? readList('entity_bank_accounts') : buildLegacyBankAccounts(profileWithMaster),
    document_summary: representative.authority_documents || [],
    timeline: Array.isArray(representative.authority_transaction_history) ? representative.authority_transaction_history : Array.isArray(representative.history) ? representative.history : [],
    field_history: buildEntityFieldHistory(representative.history || []),
  }
}

function getRepresentativeMasterRecord(representative: Record<string, any>) {
  const master = isPlainRecord(representative.master) ? representative.master : isPlainRecord(representative.masterRecord) ? representative.masterRecord : {}
  return master
}

function isPlainRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function firstPresent(...values: any[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    if (Array.isArray(value) && value.length === 0) continue
    if (isPlainRecord(value) && Object.keys(value).length === 0) continue
    return value
  }
  return undefined
}

function buildLegacyContactRows(source: Record<string, any>, valueKey: 'phone' | 'address', ...keys: string[]) {
  const rows: Array<Record<string, string>> = []
  const seen = new Set<string>()
  keys.forEach((key, index) => {
    const value = String(source[key] || '').trim()
    if (!value || seen.has(value)) return
    seen.add(value)
    rows.push({ label: index === 0 ? 'Birincil' : 'Alternatif', [valueKey]: value })
  })
  return rows
}

function buildLegacyBankAccounts(source: Record<string, any>) {
  const iban = source.beneficiary_iban || source.beneficiary_iban_or_account_no
  const accountNumber = source.beneficiary_account_no
  if (!iban && !accountNumber) return []
  return [{
    id: 'legacy-beneficiary-account',
    beneficiary_name: source.beneficiary_full_name || '',
    is_same_as_master_name: !source.beneficiary_full_name,
    iban: iban || '',
    account_number: accountNumber || '',
    bank_code: source.beneficiary_bank_code || '',
    swift_bic: source.beneficiary_swift_bic || '',
    bank_name: source.beneficiary_bank_name || '',
    bank_address: source.beneficiary_bank_address || source.beneficiary_address || '',
    account_currency: source.beneficiary_currency || 'TRY',
    preferred_currency: source.beneficiary_currency || 'TRY',
    verification_status: 'unverified',
    is_default: true,
    status: 'active',
  }]
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
  delete payload.status
  delete payload.record_status
  payload.person_kind = payload.person_or_entity_type
  for (const field of REPRESENTATIVE_OPERATION_CONTROLLED_FIELDS) {
    delete payload[field]
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

function getRepresentativeRecordStatusLabel(status: RecordStatusFilterValue) {
  if (status === 'draft') return 'Taslak'
  if (status === 'active') return 'Aktif'
  return 'Pasif'
}

function getRepresentativeStatusDotClass(status: RecordStatusFilterValue) {
  if (status === 'draft') return 'border-amber-200 bg-amber-400 dark:border-amber-300'
  if (status === 'active') return 'border-emerald-200 bg-emerald-500 dark:border-emerald-300'
  return 'border-gray-300 bg-gray-500 dark:border-gray-500'
}

function RepresentativeStatusDot({ status }: { status: RecordStatusFilterValue }) {
  const label = getRepresentativeRecordStatusLabel(status)

  return (
    <span className="inline-flex w-full justify-center" title={label} aria-label={label}>
      <span className={`h-3.5 w-3.5 rounded-full border ${getRepresentativeStatusDotClass(status)}`} aria-hidden="true" />
    </span>
  )
}

function RepresentativeNameCell({ value }: { value: any; row: any }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-medium">{value || '-'}</span>
    </div>
  )
}

function getRepresentativeAvatarUrl(representative: Record<string, any>) {
  const direct = optionalString(representative.avatar || representative.photo_url || representative.profile_image || representative.profileImage || representative.image)
  if (direct) return direct
  const image = Array.isArray(representative.photo_logo) ? representative.photo_logo.find(item => !!item) : null
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

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function getRepresentativeAuthorityStatusLabel(recordStatus: string, fallback?: string) {
  const labels: Record<string, string> = {
    draft: 'Başlatılmadı',
    active: 'Yetkili',
    suspended: 'Askıda',
    expired: 'Süresi Dolmuş',
    terminated: 'Sona Erdi',
    passive: 'Pasif',
  }
  return labels[recordStatus] || fallback || 'Taslak'
}

function getRepresentativeRecordStatus(representative?: Record<string, any> | null): RecordStatusFilterValue {
  if (!representative) return 'draft'
  if (isSoftDeletedRecord(representative)) return 'passive'
  const recordStatus = String(representative.record_status || '').toLocaleLowerCase('tr-TR')
  if (recordStatus === 'passive') return 'passive'
  if (recordStatus === 'active') return 'active'
  if (['suspended', 'expired', 'terminated'].includes(recordStatus)) return 'active'
  const status = String(representative.status || '').toLocaleLowerCase('tr-TR')
  if (status.includes('pasif')) return 'passive'
  if (status.includes('aktif') || status.includes('ask') || status.includes('son')) return 'active'
  return 'draft'
}

function getRepresentativeRecordLifecycleStatus(representative?: Record<string, any> | null): RecordStatusFilterValue {
  return getRepresentativeRecordStatus(representative)
}

function getRepresentativeAuthorityStatus(representative?: Record<string, any> | null) {
  const currentAuthority = representative?.current_authority || {}
  const raw = currentAuthority.authority_record_status || representative?.authority_record_status || currentAuthority.authority_status || representative?.authority_status
  const text = String(raw || '').toLocaleLowerCase('tr-TR')
  if (text.includes('ask') || text === 'suspended') return 'suspended'
  if (text.includes('süre') || text.includes('sure') || text === 'expired') return 'expired'
  if (text.includes('sona') || text.includes('son') || text === 'terminated') return 'terminated'
  if (text.includes('aktif') || text === 'active') return 'active'
  if (text.includes('taslak') || text === 'draft') return 'draft'
  const hasAuthoritySignal = Boolean(
    currentAuthority.id ||
    currentAuthority.transaction_id ||
    currentAuthority.scope_type ||
    representative?.scope_type ||
    getRepresentativePrimaryAuthority(representative || {}) ||
    (Array.isArray(currentAuthority.authority_types) && currentAuthority.authority_types.length > 0) ||
    (Array.isArray(representative?.authority_types) && representative?.authority_types.length > 0)
  )
  if (!hasAuthoritySignal) return 'draft'
  return getRepresentativeRecordStatus(representative) === 'draft' ? 'draft' : 'active'
}

function getRepresentativeLimitSummary(representative: Record<string, any>) {
  const current = representative.current_authority || {}
  const currency = current.currency || representative.currency || 'TRY'
  const limits = [
    current.transaction_limit ?? representative.transaction_limit,
    current.payment_approval_limit ?? representative.payment_approval_limit,
    current.purchase_approval_limit ?? representative.purchase_approval_limit,
    current.bank_transaction_limit ?? representative.bank_transaction_limit,
    current.contract_signature_limit ?? representative.contract_signature_limit,
  ]
    .map(value => Number(value))
    .filter(value => Number.isFinite(value) && value > 0)
  if (!limits.length) return '-'
  return `${Math.max(...limits).toLocaleString('tr-TR')} ${currency}`
}

function getRepresentativeWarningsSummary(representative: Record<string, any>) {
  const productWarnings = getRepresentativeAuthorityWarnings(representative)
  if (productWarnings.length) return productWarnings.join(', ')
  const warnings = representative.current_authority?.warnings || representative.warnings || representative.representative_profile?.warnings
  if (Array.isArray(warnings) && warnings.length) return warnings.filter(Boolean).join(', ')
  if (typeof warnings === 'string' && warnings.trim()) return warnings
  const authorityStatus = getRepresentativeAuthorityStatus(representative)
  if (authorityStatus === 'expired') return 'Süresi dolmuş yetki'
  if (authorityStatus === 'terminated') return 'Yetki sonlandırılmış'
  return '-'
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
    return { activeActionKeys: ['representative-start'] }
  }
  if (recordStatus === 'active') {
    return { completedActionKeys: ['representative-start'] }
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

function getRepresentativeAuthorityTypes(representative: Record<string, any>) {
  const current = representative.current_authority || {}
  const values = [
    ...(Array.isArray(current.authority_types) ? current.authority_types : []),
    ...(Array.isArray(representative.authority_types) ? representative.authority_types : []),
    current.primary_authority_type,
    representative.primary_authority_type,
    current.authority_type,
    representative.authority_type,
  ]
  return Array.from(new Set(values.map(value => String(value || '').trim()).filter(Boolean)))
}

function getRepresentativeAuthorityCurrency(representative: Record<string, any>) {
  const current = representative.current_authority || {}
  return String(current.currency || current.scope?.currency || representative.currency || representative.limit_currency || representative.bank_currency || 'TRY')
}

function getRepresentativeSignatureRuleSummary(representative: Record<string, any>) {
  const current = representative.current_authority || {}
  const signatureType = current.signature_type || representative.signature_type
  const requiresJoint = Boolean(current.requires_joint_signature ?? representative.requires_joint_signature)
  const canApproveAlone = Boolean(current.can_approve_alone ?? representative.can_approve_alone)
  if (requiresJoint && canApproveAlone) return 'Cakisan kural: musterek + tek basina'
  if (requiresJoint) return 'Musterek imza'
  if (canApproveAlone) return 'Tek basina onay'
  return signatureType ? String(signatureType) : 'Kural yok'
}

function getRepresentativeLimitRows(representative: Record<string, any>) {
  const current = representative.current_authority || {}
  const currency = getRepresentativeAuthorityCurrency(representative)
  const rows = [
    ['Genel limit', current.transaction_limit ?? representative.transaction_limit],
    ['Odeme onay limiti', current.payment_approval_limit ?? representative.payment_approval_limit],
    ['Satinalma onay limiti', current.purchase_approval_limit ?? representative.purchase_approval_limit],
    ['Banka islem limiti', current.bank_transaction_limit ?? representative.bank_transaction_limit],
    ['Sozlesme imza limiti', current.contract_signature_limit ?? representative.contract_signature_limit],
  ]
  return rows
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value]) => ({ label: String(label), value: formatRepresentativeMoney(value, currency) }))
}

function formatRepresentativeMoney(value: unknown, currency = 'TRY') {
  if (value === undefined || value === null || value === '') return 'Limitsiz'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  return `${numeric.toLocaleString('tr-TR')} ${currency}`
}

function getRepresentativeScopeTargetName(scope: ReturnType<typeof getRepresentativeScope>, branches: Record<string, any>[]) {
  if (scope.scope_type === 'company_wide') return ''
  if (scope.scope_type === 'branch') {
    const branch = branches.find(item => item.id === scope.branch_id)
    return branch?.branch_name || branch?.branch_short_name || scope.scope_label || scope.branch_id || ''
  }
  if (scope.scope_type === 'organization_unit') {
    const branch = branches.find(item => item.organization_unit_id === scope.organization_unit_id)
    return branch?.organization_unit_name || scope.scope_label || scope.organization_unit_id || ''
  }
  if (scope.scope_type === 'facility') {
    const branch = branches.find(item => item.facility_id === scope.facility_id)
    return branch?.facility_name || scope.scope_label || scope.facility_id || ''
  }
  return scope.scope_label || ''
}

function getRepresentativeScopeTypeLabel(value: unknown) {
  if (value === 'branch') return 'Belirli sube'
  if (value === 'organization_unit') return 'Belirli organizasyon birimi'
  if (value === 'facility') return 'Belirli tesis/lokasyon'
  return 'Sirket geneli'
}

function representativeStatusBadgeClass(status: RecordStatusFilterValue) {
  if (status === 'active') return 'inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-900'
  if (status === 'passive') return 'inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700'
  return 'inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-900'
}

function authorityStatusBadgeClass(status: string) {
  if (status === 'active') return 'inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-200 dark:ring-blue-900'
  if (status === 'suspended') return 'inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-900'
  if (status === 'expired' || status === 'terminated') return 'inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-200 dark:ring-red-900'
  return 'inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700'
}

function isRepresentativeAuthorityExpiringSoon(representative: Record<string, any>) {
  const current = representative.current_authority || {}
  const value = current.end_date || representative.authority_end_date || representative.end_date
  if (!value) return false
  const endDate = new Date(value)
  if (Number.isNaN(endDate.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / 86_400_000)
  return diffDays >= 0 && diffDays <= 30
}

function getRepresentativeAuthorityWarnings(representative: Record<string, any>) {
  const current = representative.current_authority || {}
  const warnings = normalizeRepresentativeWarningValues(current.warnings || representative.authority_warnings || representative.warnings || representative.representative_profile?.warnings)
  const recordStatus = getRepresentativeRecordStatus(representative)
  const authorityStatus = getRepresentativeAuthorityStatus(representative)
  const authorityTypes = getRepresentativeAuthorityTypes(representative)
  const scope = getRepresentativeScope(representative)
  const limitValues = [
    current.transaction_limit ?? representative.transaction_limit,
    current.payment_approval_limit ?? representative.payment_approval_limit,
    current.purchase_approval_limit ?? representative.purchase_approval_limit,
    current.bank_transaction_limit ?? representative.bank_transaction_limit,
    current.contract_signature_limit ?? representative.contract_signature_limit,
  ]

  if (recordStatus === 'draft') warnings.push('Taslak temsilci karti yetki dogurmaz; Temsilcilik Baslatma islemi gerekir.')
  if (recordStatus === 'active' && authorityStatus === 'draft') warnings.push('Aktif kartta current authority bulunmuyor; temsilci yetkisiz gorunur.')
  if (authorityStatus === 'suspended') warnings.push('Yetki askida; yeniden aktiflestirme icin Yetki Yenileme / Askidan Kaldirma kullanin.')
  if (authorityStatus === 'expired') warnings.push('Yetki suresi dolmus; Yetki Yenileme islemi gerekir.')
  if (authorityStatus === 'terminated') warnings.push('Yetki sonlandirilmis; yeni yetki icin Temsilcilik Baslatma veya yetki islemi gerekir.')
  if (isRepresentativeAuthorityExpiringSoon(representative)) warnings.push('Yetki bitis tarihi 30 gun icinde.')
  if (scope.scope_type === 'branch' && !scope.branch_id) warnings.push('Sube kapsamli yetkide aktif sube secimi eksik.')
  if (scope.scope_type === 'organization_unit' && !scope.organization_unit_id) warnings.push('Organizasyon birimi kapsamli yetkide birim secimi eksik.')
  if (scope.scope_type === 'facility' && !scope.facility_id) warnings.push('Tesis/lokasyon kapsamli yetkide lokasyon secimi eksik.')
  if (Boolean(current.requires_joint_signature ?? representative.requires_joint_signature) && Boolean(current.can_approve_alone ?? representative.can_approve_alone)) {
    warnings.push('Musterek imza ile tek basina onay kuralinda celiski var.')
  }
  if (limitValues.some(value => value !== undefined && value !== null && value !== '' && Number(value) < 0)) {
    warnings.push('Negatif yetki limiti kullanilamaz.')
  }
  if (authorityTypes.length === 0 && recordStatus !== 'draft') warnings.push('Yetki turu okunamiyor; current authority projection kontrol edilmeli.')

  return Array.from(new Set(warnings.filter(Boolean)))
}

function normalizeRepresentativeWarningValues(value: unknown) {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
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

function createSaveErrorFromService(errorLike: any, fallback: string): SaveError {
  if ((errorLike as SaveError)?.toast || (errorLike as SaveError)?.fieldErrors) return errorLike as SaveError
  const body = errorLike?.details || {}
  const code = errorLike?.code || body.code || (errorLike?.status ? `HTTP_${errorLike.status}` : 'REQUEST_FAILED')
  const zodFieldErrors = body.details?.fieldErrors || {}
  const fields = Object.keys(zodFieldErrors)

  if (code === 'VALIDATION_FAILED' && fields.length > 0) {
    const message = fields.map(field => FIELD_LABELS[field] || field).join(', ')
    const error = new Error(`Eksik Zorunlu Alan [${message}]`) as SaveError
    error.fieldErrors = Object.fromEntries(fields.map(field => [field, `${FIELD_LABELS[field] || field} zorunludur`]))
    error.toast = { type: 'warning', title: 'Eksik Zorunlu Alan', message }
    return error
  }

  if (code === 'OPERATION_CONTROLLED_FIELDS') {
    const controlledFields = body.details?.fields || body.fields || errorLike?.fields || []
    const fieldLabels = Array.isArray(controlledFields)
      ? controlledFields.map((field: any) => FIELD_LABELS[field?.field || field] || field?.label || field?.field || field).filter(Boolean)
      : []
    const fieldSummary = fieldLabels.length ? ` (${fieldLabels.join(', ')})` : ''
    const message = `Temsil yetki alanlari kart guncellemesiyle degistirilemez${fieldSummary}. Temsilcilik Baslatma, Yetki Kapsami Degisikligi veya Limit Degisikligi islemini kullanin.`
    const error = new Error(`${message} [${code}]`) as SaveError
    error.code = code
    error.toast = { type: 'warning', title: 'Temsil Yetki Islemi Gerekli', message }
    return error
  }

  const message = `${body.error || errorLike?.message || fallback} [${code}]`
  const error = new Error(message) as SaveError
  error.code = code
  error.toast = { type: 'error', title: 'Kayıt Başarısız', message }
  return error
}
