'use client'

import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck } from 'lucide-react'
import { EntityForm, FormField, FormMode, FormTab } from '@/components/ui/EntityForm'
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
  start_date?: string
  end_date?: string
  signature_type?: string
  transaction_limit?: number
  currency?: string
  is_deleted?: boolean
  history?: Array<Record<string, any>>
  photo_logo?: Array<Record<string, any>>
  authority_documents?: Array<Record<string, any>>
  representative_profile?: Record<string, any>
}

const FIELD_LABELS: Record<string, string> = {
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

function toAuthorityValue(value: string) {
  return value
}

function toAuthorityLabel(value: string) {
  return AUTHORITY_LABEL_BY_VALUE[value] || value
}

function getRepresentativePrimaryAuthority(representative: RepresentativeRow & Record<string, any>) {
  const candidates = [
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
    required: true,
    options: [
      { value: 'Aktif', label: 'Aktif' },
      { value: 'Pasif', label: 'Pasif' },
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
    authority_limit: representative.transaction_limit,
  })), [companyNameById, representatives])

  const widgets: WidgetDef<any>[] = useMemo(() => [
    { key: 'total', label: 'Toplam Temsilci', render: () => tableData.length },
    { key: 'active', label: 'Aktif', render: () => tableData.filter(row => !isSoftDeletedRecord(row)).length },
    { key: 'signature', label: 'İmza Yetkilisi', render: () => tableData.filter(row => row.authority_types?.some(type => toAuthorityValue(type) === 'signature_authority')).length },
    { key: 'bank', label: 'Banka Yetkilisi', render: () => tableData.filter(row => row.authority_types?.some(type => toAuthorityValue(type) === 'bank_authority')).length },
  ], [tableData])

  const handleListSortChange = (sorts: SortConfig[]) => {
    const sort = sorts[0]
    setListQuery(prev => ({ ...prev, page: 1, sort: sort?.key || 'created_at', direction: sort?.direction || 'desc' }))
  }
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
      .filter(tab => !['genel', 'iletisim'].includes(tab.id))
      .map(tab => tab.id === 'banka' ? { ...tab, id: 'banka_yetkileri', label: 'Banka Yetkileri' } : tab),
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
      const payload = normalizePayload(data, companies, selectedRepresentative || undefined)
      const response = await fetch(mode === 'create' ? '/api/companies/representatives' : `/api/companies/representatives/${selectedRepresentative?.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  const handleActivate = async () => {
    if (!selectedRepresentative?.id) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/companies/representatives/${selectedRepresentative.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedRepresentative,
          status: 'Aktif',
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
        }),
      })
      if (!response.ok) throw await createSaveError(response, 'Aktifleştirme başarısız')
      const result = await response.json()
      if (result.data) setSelectedRepresentative(normalizeRepresentativeForForm(result.data))
      setToast({ type: 'success', title: 'Kayıt Başarılı', message: 'Temsilci kaydı aktive edildi' })
      invalidateEntityDetailCache('company-representatives', selectedRepresentative.id)
      await loadData(true)
      setPageState('view')
    } catch (err: any) {
      setToast(err.toast || { type: 'error', title: 'Kayıt Başarısız', message: err.message })
      throw err
    } finally {
      setDeleting(false)
    }
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
              roleDuplicateCheck: 'company_id + person_id/organization_id + authority_type + active',
              roleScopeFields: ['company_id', 'company_id'],
            }}
            heroFields={heroFields.map(withFieldHistory)}
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
            onActivate={handleActivate}
            onModeChange={(mode) => setPageState(mode)}
            onIdentityGateOpenExistingRole={async (roleRecord) => {
              await handleRowClick(roleRecord as any)
              setPageState('edit')
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
  const items = value.length ? value : [
    { text: '01.01.2025 → İmza Yetkilisi olarak eklendi' },
    { text: '15.03.2025 → Banka işlem limiti 500.000 TL oldu' },
    { text: '20.06.2025 → GİB yetkisi pasifleştirildi' },
  ]

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          {item.text || `${item.changed_at || ''} → ${item.field || 'Değişiklik'}: ${item.old_value ?? '-'} → ${item.new_value ?? '-'}`}
        </div>
      ))}
    </div>
  )
}

function normalizeRepresentativeForForm(representative: RepresentativeRow) {
  const profile = representative.representative_profile || {}
  const authorityTypes = (profile.authority_types || representative.authority_types || []).map(toAuthorityValue)
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
  const status = isSoftDeletedRecord(representative) ? 'Pasif' : representative.status || profile.status || 'Aktif'
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
    authority_limit: profile.authority_limit ?? representative.transaction_limit ?? '',
    currency: profile.currency || representative.currency || 'TRY',
    photo_logo: representative.photo_logo || [],
    authority_documents: representative.authority_documents || [],
    phones: Array.isArray(masterFields.phones) ? masterFields.phones : [],
    emails: Array.isArray(masterFields.emails) ? masterFields.emails : [],
    document_summary: representative.authority_documents || [],
    timeline: representative.history || [],
    field_history: buildEntityFieldHistory(representative.history || []),
  }
}

function normalizeRepresentativeEntityType(value: unknown): 'person' | 'organization' {
  const text = String(value || '').toLocaleLowerCase('tr-TR')
  if (['organization', 'company', 'tüzel_kisi', 'sirket', 'şirket'].includes(text)) return 'organization'
  return 'person'
}

function normalizePayload(raw: Record<string, any>, companies: Option[], current?: Record<string, any>) {
  const payload = Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  )
  const effective = { ...(current || {}), ...payload }

  payload.company_id = payload.company_id || current?.company_id || current?.company_id || payload.company_id || companies[0]?.value
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
  payload.primary_authority_type = toAuthorityValue(payload.primary_authority_type || '')
  payload.authority_types = Array.isArray(payload.authority_types) && payload.authority_types.length
    ? payload.authority_types.map(toAuthorityValue)
    : [payload.primary_authority_type].filter(Boolean)
  payload.person_kind = payload.person_or_entity_type
  delete payload.source_link
  payload.document_summary = undefined
  payload.field_history = undefined
  return payload
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
