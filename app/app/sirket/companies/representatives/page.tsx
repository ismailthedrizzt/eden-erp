'use client'

import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, ListChecks } from 'lucide-react'
import { EntityForm, FormField, FormMode, FormOperationActionGroup, FormTab } from '@/components/ui/EntityForm'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, ColumnDef, SortConfig, WidgetDef } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { normalizeCountryId } from '@/lib/reference/country-nationalities'
import { createRealPersonMasterTabs } from '@/lib/identity/realPersonFormSections'
import { createLegalEntityMasterTabs } from '@/lib/identity/legalEntityFormSections'
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
  operations: ['Temsilcilik Başlatma', 'Askıya Alma', 'Sonlandırma'],
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

const REPRESENTATIVE_MASTER_TAB_LABELS: Record<string, string> = {
  person_iletisim: 'Kişi İletişim',
  person_egitim: 'Kişi Eğitim',
  person_aile: 'Kişi Aile',
  person_banka: 'Kişi Banka',
  organization_iletisim: 'Kurum İletişim',
  organization_banka: 'Kurum Banka',
  organization_irtibat_noktalari: 'Kurum İrtibat Noktaları',
}

function toAuthorityValue(value: string) {
  return value
}

function toAuthorityLabel(value: string) {
  return AUTHORITY_LABEL_BY_VALUE[value] || value
}

function getRepresentativePrimaryAuthority(representative: RepresentativeRow & Record<string, any>) {
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
  { key: 'display_name', label: 'Ad Soyad / Ünvan', type: 'text', width: 260, sortable: true, category: 'Kimlik' },
  { key: 'company_name', label: 'Şirket', type: 'text', width: 220, category: 'Şirket' },
  { key: 'person_kind_label', label: 'Kişi / Kurum Tipi', type: 'enum', width: 150, category: 'Kimlik' },
  { key: 'primary_authority_type', label: 'Ana Yetki Tipi', type: 'enum', width: 180, category: 'Yetki' },
  { key: 'status', label: 'Yetki Durumu', type: 'enum', width: 130, sortable: true, category: 'Durum' },
  { key: 'start_date', label: 'Başlangıç', type: 'date', width: 120, category: 'Tarih' },
  { key: 'authority_limit', label: 'Yetki Limiti', type: 'number', width: 130, category: 'Limit' },
]

const heroFields: FormField[] = [
  {
    name: 'company_id',
    label: 'Temsil Ettiği Şirket',
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
  { name: 'first_name', label: 'Ad', type: 'text', required: true, visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'person' } },
  { name: 'last_name', label: 'Soyad', type: 'text', required: true, visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'person' } },
  { name: 'trade_name', label: 'Ticari Unvan', type: 'text', required: true, visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'organization' } },
  { name: 'short_name', label: 'Kısa Unvan', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'organization' } },
  {
    name: 'status',
    label: 'Yetki Durumu',
    type: 'select',
    defaultValue: 'Taslak',
    controlledByOperation: REPRESENTATIVE_LIFECYCLE_CONTROL,
    options: [
      { value: 'Taslak', label: 'Taslak' },
      { value: 'Aktif', label: 'Aktif' },
      { value: 'Pasif', label: 'Pasif' },
      { value: 'Sonlandırıldı', label: 'Sonlandırıldı' },
      { value: 'Askıda', label: 'Askıda' },
      { value: 'Süresi Dolmuş', label: 'Süresi Dolmuş' },
    ],
  },
  { name: 'start_date', label: 'Başlangıç Tarihi', type: 'date', required: true },
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
      { name: 'marital_status', label: 'Medeni Durum', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'person' } },
      { name: 'foundation_date', label: 'Kuruluş Tarihi', type: 'date', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'organization' } },
      { name: 'company_type', label: 'Şirket Türü', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'organization' } },
      { name: 'tax_office', label: 'Vergi Dairesi', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'organization' } },
      { name: 'mersis_number', label: 'MERSİS', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'organization' } },
      { name: 'trade_registry_no', label: 'Ticaret Sicil No', type: 'text', visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'organization' } },
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
    label: 'Kurumlar',
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

const representativeRelationTabs: FormTab[] = [
  {
    id: 'representative_status',
    label: 'Temsilcilik Durumu',
    fields: [
      {
        name: 'status',
        label: 'Yetki Durumu',
        type: 'custom',
        readOnly: true,
        render: ({ data }) => <RepresentativeStatusSummary representative={data} />,
      },
      { name: 'start_date', label: 'Başlangıç Tarihi', type: 'date' },
      { name: 'end_date', label: 'Bitiş Tarihi', type: 'date' },
    ],
  },
  {
    id: 'representative_current_authorities',
    label: 'Güncel Yetkiler',
    fields: [
      {
        name: 'authority_types',
        label: 'Yetki Tipleri',
        type: 'custom',
        colSpan: 3,
        render: ({ value, data }) => <AuthoritySummary value={Array.isArray(value) ? value : data.current_authority?.authority_types || []} />,
      },
      { name: 'signature_type', label: 'İmza Türü', type: 'select', options: [
        { value: 'Münferit', label: 'Münferit' },
        { value: 'Müşterek', label: 'Müşterek' },
        { value: 'Sınırlı', label: 'Sınırlı' },
        { value: 'Süresiz', label: 'Süresiz' },
        { value: 'Yok', label: 'Yok' },
      ] },
      { name: 'transaction_limit', label: 'Genel Limit', type: 'number' },
      { name: 'currency', label: 'Para Birimi', type: 'select', defaultValue: 'TRY', options: [
        { value: 'TRY', label: 'TRY' },
        { value: 'USD', label: 'USD' },
        { value: 'EUR', label: 'EUR' },
        { value: 'GBP', label: 'GBP' },
      ] },
      { name: 'payment_approval_limit', label: 'Ödeme Onay Limiti', type: 'number' },
      { name: 'purchase_approval_limit', label: 'Satınalma Onay Limiti', type: 'number' },
      { name: 'bank_transaction_limit', label: 'Banka İşlem Limiti', type: 'number' },
      { name: 'contract_signature_limit', label: 'Sözleşme İmza Limiti', type: 'number' },
      { name: 'requires_joint_signature', label: 'Müşterek İmza Gerekli mi?', type: 'checkbox' },
      { name: 'can_approve_alone', label: 'Tek Başına Onaylayabilir mi?', type: 'checkbox' },
      { name: 'scope_section', label: 'Yetki Kapsamı', type: 'section', colSpan: 3 },
      { name: 'bank_authority_level', label: 'Banka Yetki Seviyesi', type: 'text' },
      { name: 'department_scope', label: 'Departman Kapsamı', type: 'text' },
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
    id: 'representative_authority_documents',
    label: 'Yetki Belgeleri',
    fields: [
      {
        name: 'document_summary',
        label: 'Yetki Belgeleri',
        type: 'custom',
        colSpan: 3,
        render: ({ value }) => <SummaryList items={Array.isArray(value) ? value : []} emptyText="Yüklü yetki belgesi bulunamadı." />,
      },
    ],
  },
  {
    id: 'representative_authority_history',
    label: 'Yetki Geçmişi',
    fields: [
      {
        name: 'timeline',
        label: 'Yetki Geçmişi',
        type: 'custom',
        colSpan: 3,
        render: ({ value }) => <Timeline value={Array.isArray(value) ? value : []} />,
      },
    ],
  },
  {
    id: 'representative_notes',
    label: 'Notlar',
    fields: [
      { name: 'notes', label: 'Notlar', type: 'textarea', colSpan: 3 },
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
  const [includePassive, setIncludePassive] = useState(false)
  const [listQuery, setListQuery] = useState({ page: 1, pageSize: 50, search: '', sort: 'created_at', direction: 'desc' as 'asc' | 'desc' })
  const [listMeta, setListMeta] = useState<ListMeta>({ page: 1, pageSize: 50, total: 0, totalPages: 1 })
  const [toast, setToast] = useState<ToastState | null>(null)
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
      const representativePayload = await companyService.representativesList({ includePassive, useCache: !force, ...listQuery })

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
  }, [includePassive, listQuery])

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
    company_name: companyNameById[representative.company_id] || '-',
    primary_authority_type: toAuthorityLabel(getRepresentativePrimaryAuthority(representative) || '-'),
    status: representative.current_authority?.status || representative.status,
    record_status: representative.current_authority?.record_status || representative.record_status,
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
        allowDraftEdit: false,
      },
    }
  }

  const configuredHeroFields = heroFields.filter(field => {
    if (pageState !== 'create') return true
    return !REPRESENTATIVE_CREATE_HIDDEN_HERO_FIELDS.has(field.name)
  }).map(field => {
    if (field.name === 'status') {
      return withRepresentativeOperationControl({
        ...field,
        type: 'custom',
        readOnly: true,
        required: false,
        requiredWhen: undefined,
        options: undefined,
        render: ({ data }) => <RepresentativeStatusSummary representative={data} />,
      })
    }
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

  const configuredMasterTabs = [
    ...createRealPersonMasterTabs({
      visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'person' },
      includeEmergencyContact: true,
    }),
    ...createLegalEntityMasterTabs({
      visibleWhen: { field: 'person_or_entity_type', operator: 'equals', value: 'organization' },
      websiteField: 'website',
    }),
  ].map(tab => ({
    ...tab,
    label: REPRESENTATIVE_MASTER_TAB_LABELS[tab.id] || tab.label,
  }))

  const configuredTabs = [
    ...configuredMasterTabs,
    ...representativeRelationTabs.map(tab => ({
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

  const handleDelete = async () => {
    if (!selectedRepresentative?.id) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/companies/representatives/${selectedRepresentative.id}`, { method: 'DELETE' })
      if (!response.ok) throw await createSaveError(response, 'Pasifleştirme başarısız')
      setToast({ type: 'success', title: 'Kayıt Başarılı', message: 'Temsilci kaydı pasife çekildi' })
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
          label: 'Temsilcilik Başlatma',
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
            label: 'Sonlandırma',
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
        actions: lifecycleActions,
      },
      {
        key: 'registration',
        title: 'Resmi Yetki İşlemleri',
        operationKind: 'official_update',
        actions: authorityActions,
      },
      {
        key: 'update',
        title: 'Kart Bilgileri',
        operationKind: 'basic_update',
        actions: pageState === 'view' && recordStatus !== 'terminated' && recordStatus !== 'passive'
          ? [{
              key: 'basic-edit',
              label: 'Kart Bilgilerini Düzenle',
              icon: <BadgeCheck size={15} />,
              onClick: () => setPageState('edit'),
            }]
          : [],
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
          setPageState('create')
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
            includePassive={includePassive}
            onIncludePassiveChange={(next) => {
              setIncludePassive(next)
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
            onDelete={handleDelete}
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
          transactionType={authorityWizardType}
          saving={saving}
          onClose={() => setAuthorityWizardOpen(false)}
          onSubmit={handleAuthorityWizardSubmit}
        />
      )}
    </div>
  )
}

function RepresentativeStatusSummary({ representative }: { representative: Record<string, any> }) {
  const recordStatus = getRepresentativeRecordStatus(representative)
  const label = getRepresentativeStatusLabel(recordStatus, representative.status)
  const toneClass = {
    draft: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200',
    suspended: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-200',
    expired: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200',
    terminated: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200',
    passive: 'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400',
  }[recordStatus] || 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200'

  return (
    <div className={`inline-flex min-h-10 w-full items-center rounded-lg border px-3 py-2 text-sm font-semibold ${toneClass}`}>
      {label}
    </div>
  )
}

function AuthoritySummary({ value }: { value: string[] }) {
  const authorities = value.map(toAuthorityValue).filter(Boolean)
  if (!authorities.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        Henüz aktif temsil yetkisi yok. Yetkiler Temsilcilik Başlatma veya Yetki işlemleriyle tanımlanır.
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {authorities.map(authority => (
        <span key={authority} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
          {toAuthorityLabel(authority)}
        </span>
      ))}
    </div>
  )
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
  const [form, setForm] = useState({
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
    notes: '',
  })
  const [localError, setLocalError] = useState<string | null>(null)
  const update = (name: string, value: string | boolean | string[]) => setForm(prev => ({ ...prev, [name]: value }))
  const inputClass = 'mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
  const isTermination = ['Askıya Alma', 'Sonlandırma', 'Ters Kayıt'].includes(form.transaction_type)

  const complete = async () => {
    setLocalError(null)
    if (!form.company_id) return setLocalError('Şirket seçimi zorunludur.')
    if (!form.effective_date) return setLocalError('Yürürlük tarihi zorunludur.')
    if (!isTermination && form.authority_types.length === 0) return setLocalError('En az bir yetki tipi seçilmelidir.')
    await onSubmit({
      ...form,
      transaction_limit: form.transaction_limit === '' ? null : Number(form.transaction_limit),
      payment_approval_limit: form.payment_approval_limit === '' ? null : Number(form.payment_approval_limit),
      purchase_approval_limit: form.purchase_approval_limit === '' ? null : Number(form.purchase_approval_limit),
      bank_transaction_limit: form.bank_transaction_limit === '' ? null : Number(form.bank_transaction_limit),
      contract_signature_limit: form.contract_signature_limit === '' ? null : Number(form.contract_signature_limit),
      document_files: representative.authority_documents || [],
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{form.transaction_type}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{representative.display_name || representative.full_name || 'Temsilci'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">
            Kapat
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            İşlem Türü
            <select value={form.transaction_type} onChange={event => update('transaction_type', event.target.value)} className={inputClass}>
              {REPRESENTATIVE_AUTHORITY_TRANSACTION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Şirket
            <select value={form.company_id} onChange={event => update('company_id', event.target.value)} className={inputClass}>
              <option value="">Seçiniz</option>
              {companies.map(company => <option key={company.value} value={company.value}>{company.label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Yürürlük Tarihi
            <input type="date" value={form.effective_date} onChange={event => update('effective_date', event.target.value)} className={inputClass} />
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Bitiş Tarihi
            <input type="date" value={form.end_date} onChange={event => update('end_date', event.target.value)} className={inputClass} />
          </label>
          {!isTermination && (
            <div className="md:col-span-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Yetki Tipleri</span>
              <div className="mt-2">
                <AuthoritySelector value={form.authority_types} onChange={value => update('authority_types', value)} readOnly={false} />
              </div>
            </div>
          )}
          {!isTermination && (
            <>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                İmza Türü
                <select value={form.signature_type} onChange={event => update('signature_type', event.target.value)} className={inputClass}>
                  <option value="">Seçiniz</option>
                  <option value="Münferit">Münferit</option>
                  <option value="Müşterek">Müşterek</option>
                  <option value="Sınırlı">Sınırlı</option>
                  <option value="Süresiz">Süresiz</option>
                  <option value="Yok">Yok</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Para Birimi
                <select value={form.currency} onChange={event => update('currency', event.target.value)} className={inputClass}>
                  <option value="TRY">TRY</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </label>
              {[
                ['transaction_limit', 'Genel Limit'],
                ['payment_approval_limit', 'Ödeme Onay Limiti'],
                ['purchase_approval_limit', 'Satınalma Onay Limiti'],
                ['bank_transaction_limit', 'Banka İşlem Limiti'],
                ['contract_signature_limit', 'Sözleşme İmza Limiti'],
              ].map(([name, label]) => (
                <label key={name} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {label}
                  <input type="number" min="0" step="0.01" value={(form as any)[name]} onChange={event => update(name, event.target.value)} className={inputClass} />
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                <input type="checkbox" checked={form.requires_joint_signature} onChange={event => update('requires_joint_signature', event.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                Müşterek imza gerekir
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                <input type="checkbox" checked={form.can_approve_alone} onChange={event => update('can_approve_alone', event.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                Tek başına onaylayabilir
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Banka Yetki Seviyesi
                <input value={form.bank_authority_level} onChange={event => update('bank_authority_level', event.target.value)} className={inputClass} />
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Departman Kapsamı
                <input value={form.department_scope} onChange={event => update('department_scope', event.target.value)} className={inputClass} />
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                GİB Yetkileri
                <textarea value={form.gib_permissions} onChange={event => update('gib_permissions', event.target.value)} rows={3} className={inputClass} />
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                SGK Yetkileri
                <textarea value={form.sgk_permissions} onChange={event => update('sgk_permissions', event.target.value)} rows={3} className={inputClass} />
              </label>
            </>
          )}
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 md:col-span-2">
            Notlar
            <textarea value={form.notes} onChange={event => update('notes', event.target.value)} rows={3} className={inputClass} />
          </label>
        </div>

        {localError && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{localError}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900">
            Vazgeç
          </button>
          <button type="button" disabled={saving} onClick={complete} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            Onayla
          </button>
        </div>
      </div>
    </div>
  )
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
  payload.status = mode === 'create' ? 'Taslak' : payload.status
  payload.record_status = mode === 'create' ? 'draft' : payload.record_status
  payload.person_kind = payload.person_or_entity_type
  for (const field of REPRESENTATIVE_OPERATION_CONTROLLED_FIELDS) {
    if (mode === 'create' && ['status', 'record_status'].includes(field)) continue
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

function getRepresentativeStatusLabel(recordStatus: string, fallback?: string) {
  const labels: Record<string, string> = {
    draft: 'Taslak',
    active: 'Aktif',
    suspended: 'Askıda',
    expired: 'Süresi Dolmuş',
    terminated: 'Sonlandırıldı',
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
  if (status.includes('son')) return 'terminated'
  if (status.includes('aktif')) return 'active'
  return 'draft'
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
