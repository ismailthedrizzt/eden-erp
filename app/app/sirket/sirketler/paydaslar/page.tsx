'use client'

import { useEffect, useMemo, useState } from 'react'
import { Handshake } from 'lucide-react'
import { EntityForm, FormField, FormMode, FormTab } from '@/components/ui/EntityForm'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, ColumnDef, SortConfig, WidgetDef } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
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

interface StakeholderRow {
  id: string
  company_id?: string
  stakeholder_type?: 'gercek_kisi' | 'tuzel_kisi'
  category?: string
  display_name?: string
  tax_id?: string
  phone?: string
  email?: string
  telefonlar?: Array<Record<string, any>>
  epostalar?: Array<Record<string, any>>
  country?: string
  city?: string
  district?: string
  status?: string
  priority_level?: string
  internal_owner_employee_id?: string
  relationship_start_date?: string
  is_deleted?: boolean
  history?: Array<Record<string, any>>
  photo_logo?: Array<Record<string, any>>
  stakeholder_documents?: Array<Record<string, any>>
  stakeholder_profile?: Record<string, any>
}

const FIELD_LABELS: Record<string, string> = {
  stakeholder_type: 'Paydaş Türü',
  first_name: 'Ad',
  last_name: 'Soyad',
  trade_name: 'Ticari Unvan',
  short_name: 'Kısa Unvan',
  category: 'Paydaş Kategorisi',
  phone: 'Telefon',
  email: 'Email',
  status: 'Durum',
  relationship_start_date: 'İlişki Başlangıç Tarihi',
}

const CATEGORY_OPTIONS = [
  'Muhasebe',
  'Mali Müşavir',
  'Avukat',
  'Danışman',
  'Ajans',
  'Freelancer',
  'Taşeron',
  'Distribütör',
  'Anlaşmalı Üretici',
  'Tedarikçi Temsilcisi',
  'Broker',
  'Resmi Temsilci',
  'İrtibat Kişisi',
  'Diğer',
]

const columns: ColumnDef[] = [
  { key: 'display_name', label: 'Ad Soyad / Ünvan', type: 'text', width: 260, sortable: true, category: 'Kimlik' },
  { key: 'company_name', label: 'Şirket', type: 'text', width: 220, category: 'Şirket' },
  { key: 'stakeholder_type_label', label: 'Paydaş Türü', type: 'enum', width: 130, category: 'Kimlik' },
  { key: 'category', label: 'Kategori', type: 'enum', width: 160, sortable: true, category: 'İlişki' },
  { key: 'phone', label: 'Telefon', type: 'text', width: 140, category: 'İletişim' },
  { key: 'email', label: 'Email', type: 'text', width: 200, category: 'İletişim' },
  { key: 'priority_level', label: 'Öncelik', type: 'enum', width: 100, category: 'İlişki' },
  { key: 'status', label: 'Durum', type: 'enum', width: 130, sortable: true, category: 'Durum' },
]

const heroFields: FormField[] = [
  {
    name: 'category',
    label: 'Paydaş Kategorisi',
    type: 'select',
    required: true,
    options: CATEGORY_OPTIONS.map(item => ({ value: item, label: item })),
  },
  { name: 'city', label: 'Şehir', type: 'text' },
  {
    name: 'status',
    label: 'Durum',
    type: 'select',
    required: true,
    options: [
      { value: 'Aktif', label: 'Aktif' },
      { value: 'Pasif', label: 'Pasif' },
      { value: 'Askıda', label: 'Askıda' },
      { value: 'Kara Liste', label: 'Kara Liste' },
      { value: 'Çalışma Sonlandı', label: 'Çalışma Sonlandı' },
    ],
  },
  { name: 'relationship_start_date', label: 'Şirketle İlişki Başlangıcı', type: 'date', required: true },
]

const tabs: FormTab[] = [
  {
    id: 'genel',
    label: 'Genel',
    fields: [
      { name: 'birth_place', label: 'Doğum Yeri', type: 'text', visibleWhen: { field: 'stakeholder_type', operator: 'equals', value: 'gercek_kisi' } },
      {
        name: 'gender',
        label: 'Cinsiyet',
        type: 'select',
        visibleWhen: { field: 'stakeholder_type', operator: 'equals', value: 'gercek_kisi' },
        options: [
          { value: 'erkek', label: 'Erkek' },
          { value: 'kadin', label: 'Kadın' },
        ],
      },
      { name: 'birth_date', label: 'Doğum Tarihi', type: 'date', visibleWhen: { field: 'stakeholder_type', operator: 'equals', value: 'gercek_kisi' } },
      { name: 'occupation', label: 'Meslek', type: 'text', visibleWhen: { field: 'stakeholder_type', operator: 'equals', value: 'gercek_kisi' } },
      { name: 'marital_status', label: 'Medeni Durum', type: 'text', visibleWhen: { field: 'stakeholder_type', operator: 'equals', value: 'gercek_kisi' } },
      { name: 'expertise_area', label: 'Uzmanlık Alanı', type: 'text', visibleWhen: { field: 'stakeholder_type', operator: 'equals', value: 'gercek_kisi' } },
      { name: 'employer_company', label: 'Çalıştığı Firma', type: 'text', visibleWhen: { field: 'stakeholder_type', operator: 'equals', value: 'gercek_kisi' } },
      { name: 'linkedin', label: 'LinkedIn', type: 'text', visibleWhen: { field: 'stakeholder_type', operator: 'equals', value: 'gercek_kisi' } },
      { name: 'foundation_date', label: 'Kuruluş Tarihi', type: 'date', visibleWhen: { field: 'stakeholder_type', operator: 'equals', value: 'tuzel_kisi' } },
      { name: 'company_type', label: 'Şirket Türü', type: 'text', visibleWhen: { field: 'stakeholder_type', operator: 'equals', value: 'tuzel_kisi' } },
      { name: 'tax_office', label: 'Vergi Dairesi', type: 'text', visibleWhen: { field: 'stakeholder_type', operator: 'equals', value: 'tuzel_kisi' } },
      { name: 'mersis_no', label: 'MERSİS', type: 'text', visibleWhen: { field: 'stakeholder_type', operator: 'equals', value: 'tuzel_kisi' } },
      { name: 'trade_registry_no', label: 'Ticaret Sicil No', type: 'text', visibleWhen: { field: 'stakeholder_type', operator: 'equals', value: 'tuzel_kisi' } },
      { name: 'website', label: 'Web Sitesi', type: 'text', visibleWhen: { field: 'stakeholder_type', operator: 'equals', value: 'tuzel_kisi' } },
      { name: 'reference_source', label: 'Referans Kaynağı', type: 'text' },
      { name: 'work_model', label: 'Çalışma Şekli', type: 'text' },
    ],
  },
  {
    id: 'iletisim',
    label: 'İletişim',
    fields: [
      {
        name: 'telefonlar',
        label: 'Telefon',
        type: 'list',
        colSpan: 3,
        listConfig: {
          addLabel: 'Telefon Ekle',
          emptyText: 'Telefon eklenmedi.',
          fields: [
            { name: 'etiket', key: 'etiket', label: 'Etiket', type: 'text', placeholder: 'Cep, iş, ev' },
            { name: 'numara', key: 'numara', label: 'Telefon Numarası', type: 'tel', required: true, placeholder: '+90 5XX XXX XX XX' },
          ],
        },
      },
      {
        name: 'epostalar',
        label: 'E-posta',
        type: 'list',
        colSpan: 3,
        listConfig: {
          addLabel: 'E-posta Ekle',
          emptyText: 'E-posta eklenmedi.',
          fields: [
            { name: 'etiket', key: 'etiket', label: 'Etiket', type: 'text', placeholder: 'Kişisel, iş' },
            { name: 'adres', key: 'adres', label: 'E-posta Adresi', type: 'email', required: true },
          ],
        },
      },
      { name: 'address', label: 'Adres', type: 'textarea', colSpan: 2 },
      { name: 'city', label: 'İl', type: 'text', compact: true },
      { name: 'district', label: 'İlçe', type: 'text', compact: true },
    ],
  },
  {
    id: 'finans',
    label: 'Finans',
    fields: [
      { name: 'account_code', label: 'Cari Hesap Kodu', type: 'text' },
      { name: 'iban', label: 'IBAN', type: 'iban' },
      { name: 'bank_name', label: 'Banka', type: 'text' },
      { name: 'payment_method', label: 'Ödeme Şekli', type: 'text' },
      { name: 'due_day', label: 'Vade Günü', type: 'number' },
      { name: 'currency', label: 'Para Birimi', type: 'text', defaultValue: 'TRY' },
      { name: 'withholding_applies', label: 'Stopaj Uygulanır mı', type: 'checkbox' },
      { name: 'pricing_note', label: 'Fiyatlandırma Notu', type: 'textarea', colSpan: 3 },
    ],
  },
  {
    id: 'sozlesmeler',
    label: 'Sözleşmeler',
    fields: [
      { name: 'contract_type', label: 'Sözleşme Türü', type: 'text' },
      { name: 'contract_start_date', label: 'Başlangıç Tarihi', type: 'date' },
      { name: 'contract_end_date', label: 'Bitiş Tarihi', type: 'date' },
      { name: 'auto_renewal', label: 'Otomatik Yenileme', type: 'checkbox' },
      { name: 'monthly_fee', label: 'Aylık Bedel', type: 'number' },
      { name: 'annual_fee', label: 'Yıllık Bedel', type: 'number' },
      { name: 'contract_currency', label: 'Para Birimi', type: 'text', defaultValue: 'TRY' },
      { name: 'sla_level', label: 'SLA Seviyesi', type: 'text' },
    ],
  },
  {
    id: 'yetkiler',
    label: 'Yetkiler',
    fields: [
      { name: 'company_representation_authority', label: 'Şirket Temsil Yetkisi', type: 'checkbox' },
      { name: 'gib_authority', label: 'GİB İşlem Yetkisi', type: 'checkbox' },
      { name: 'sgk_authority', label: 'SGK İşlem Yetkisi', type: 'checkbox' },
      { name: 'contract_authority', label: 'Sözleşme Yetkisi', type: 'checkbox' },
      { name: 'power_of_attorney', label: 'Vekalet Yetkisi', type: 'checkbox' },
      { name: 'document_delivery_authority', label: 'Belge Teslim Yetkisi', type: 'checkbox' },
      { name: 'declaration_calendar', label: 'Beyanname Takvimi', type: 'textarea', colSpan: 2, visibleWhen: { field: 'category', includes: ['Muhasebe', 'Mali Müşavir'] } },
      { name: 'bar_number', label: 'Baro No', type: 'text', visibleWhen: { field: 'category', operator: 'equals', value: 'Avukat' } },
      { name: 'case_tracking', label: 'Dava Takibi', type: 'checkbox', visibleWhen: { field: 'category', operator: 'equals', value: 'Avukat' } },
      { name: 'hourly_rate', label: 'Saatlik Ücret', type: 'number', visibleWhen: { field: 'category', includes: ['Freelancer', 'Danışman'] } },
      { name: 'monthly_package', label: 'Aylık Paket', type: 'number', visibleWhen: { field: 'category', includes: ['Freelancer', 'Danışman'] } },
      { name: 'delivery_model', label: 'Teslim Modeli', type: 'text', visibleWhen: { field: 'category', includes: ['Freelancer', 'Danışman'] } },
    ],
  },
  {
    id: 'projeler',
    label: 'Projeler',
    fields: [
      { name: 'related_projects', label: 'Bağlı Olduğu Projeler', type: 'textarea', colSpan: 2 },
      { name: 'active_jobs', label: 'Aktif İşler', type: 'textarea', colSpan: 2 },
      { name: 'last_task', label: 'Son Görev', type: 'text' },
      { name: 'performance_note', label: 'Performans Notu', type: 'textarea', colSpan: 2 },
      { name: 'delivery_score', label: 'Teslim Puanı', type: 'number' },
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
        render: ({ value }) => <SummaryList items={Array.isArray(value) ? value : []} emptyText="Yüklü belge bulunamadı." />,
      },
    ],
  },
  { id: 'notlar', label: 'Notlar', fields: [{ name: 'notes', label: 'Notlar', type: 'textarea', colSpan: 3 }] },
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

export default function PaydaslarPage() {
  const [pageState, setPageState] = useState<PageState>('list')
  const [stakeholders, setStakeholders] = useState<StakeholderRow[]>([])
  const [companies, setCompanies] = useState<Option[]>([])
  const [companiesLoaded, setCompaniesLoaded] = useState(false)
  const [selectedStakeholder, setSelectedStakeholder] = useState<Record<string, any> | null>(null)
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

  const isSelectedPassive = isSoftDeletedRecord(selectedStakeholder)
  const formMode: FormMode = pageState === 'create' ? 'create' : isSelectedPassive ? 'passive' : pageState === 'edit' ? 'edit' : 'view'
  const formLoadStages = createProgressiveFormLoadStages({
    mode: formMode,
    hasSnapshot: pageState !== 'create' && !!selectedStakeholder,
    detailLoading,
    detailError: !!formError,
    detailReady: pageState !== 'create' && !!selectedStakeholder && !detailLoading,
    hasMaster: !!(selectedStakeholder?.person_id || selectedStakeholder?.organization_id || selectedStakeholder?.master_record_id || selectedStakeholder?.master),
    referencesLoading: companyOptionsLoading,
    referencesReady: companiesLoaded,
    referencesError: companyOptionsError,
  })

  const loadData = async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      if (force) companyService.invalidateRelations()
      const stakeholderPayload = await companyService.stakeholdersList({ includePassive, useCache: !force, ...listQuery })

      setStakeholders(Array.isArray(stakeholderPayload.data) ? stakeholderPayload.data : [])
      setListMeta(stakeholderPayload.meta ?? { page: listQuery.page, pageSize: listQuery.pageSize, total: stakeholderPayload.data?.length ?? 0, totalPages: 1 })
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
      label: company.ticari_unvan || company.kisa_unvan,
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
  const tableData = useMemo(() => stakeholders.map(stakeholder => ({
    ...stakeholder,
    stakeholder_type_label: stakeholder.stakeholder_type === 'tuzel_kisi' ? 'Tüzel Kişi' : 'Gerçek Kişi',
    company_name: stakeholder.company_id ? companyNameById[stakeholder.company_id] || '-' : '-',
  })), [companyNameById, stakeholders])

  const widgets: WidgetDef<any>[] = useMemo(() => [
    { key: 'total', label: 'Toplam Paydaş', render: () => tableData.length },
    { key: 'active', label: 'Aktif', render: () => tableData.filter(row => !isSoftDeletedRecord(row)).length },
    { key: 'legal', label: 'Tüzel Kişi', render: () => tableData.filter(row => row.stakeholder_type === 'tuzel_kisi').length },
    { key: 'critical', label: 'Kritik', render: () => tableData.filter(row => row.priority_level === 'Kritik').length },
  ], [tableData])

  const handleListSortChange = (sorts: SortConfig[]) => {
    const sort = sorts[0]
    setListQuery(prev => ({ ...prev, page: 1, sort: sort?.key || 'created_at', direction: sort?.direction || 'desc' }))
  }

  const configuredTabs = [
    ...createRealPersonMasterTabs({
      visibleWhen: { field: 'stakeholder_type', operator: 'equals', value: 'gercek_kisi' },
      includeEmergencyContact: true,
    }),
    ...createLegalEntityMasterTabs({
      visibleWhen: { field: 'stakeholder_type', operator: 'equals', value: 'tuzel_kisi' },
      websiteField: 'web_sitesi',
    }),
    ...tabs.filter(tab => !['genel', 'iletisim', 'finans', 'yetkiler'].includes(tab.id)),
  ]

  const withFieldHistory = (field: FormField) => {
    const history = selectedStakeholder?.field_history?.[field.name]
    return history ? { ...field, history } : field
  }

  const handleRowClick = async (row: any) => {
    const cached = readEntityDetailCache<Record<string, any>>('company-stakeholders', row.id)
    setSelectedStakeholder(cached?.data || normalizeStakeholderForForm(row))
    setPageState('view')
    setFormError(null)
    setFieldErrors({})
    if (cached) {
      setDetailLoading(false)
      return
    }
    setDetailLoading(true)
    try {
      const result = await companyService.stakeholderDetail(row.id)
      if (!result.data) throw new Error('Paydaş detayı yüklenemedi')
      const normalized = normalizeStakeholderForForm(result.data)
      setSelectedStakeholder(normalized)
      writeEntityDetailCache('company-stakeholders', row.id, normalized)
    } catch (err: any) {
      setFormError(err.message || 'Paydaş detayı yüklenemedi')
      setToast(err.toast || { type: 'error', title: 'Detay Yüklenemedi', message: err.message || 'Paydaş detayı yüklenemedi' })
    } finally {
      setDetailLoading(false)
    }
  }

  const handleSave = async (data: Record<string, any>, mode: FormMode) => {
    setSaving(true)
    setFormError(null)
    setFieldErrors({})
    try {
      const payload = normalizePayload(data, companies, selectedStakeholder || undefined)
      const response = await fetch(mode === 'create' ? '/api/sirketler/paydaslar' : `/api/sirketler/paydaslar/${selectedStakeholder?.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw await createSaveError(response, mode === 'create' ? 'Paydaş oluşturulamadı' : 'Güncelleme başarısız')
      setToast({ type: 'success', title: 'Kayıt Başarılı', message: mode === 'create' ? 'Paydaş kaydı oluşturuldu' : 'Paydaş bilgileri güncellendi' })
      await loadData(true)
      if (mode === 'create') invalidateEntityDetailCache('company-stakeholders')
      else invalidateEntityDetailCache('company-stakeholders', selectedStakeholder?.id)
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
    if (!selectedStakeholder?.id) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/sirketler/paydaslar/${selectedStakeholder.id}`, { method: 'DELETE' })
      if (!response.ok) throw await createSaveError(response, 'Pasifleştirme başarısız')
      setToast({ type: 'success', title: 'Kayıt Başarılı', message: 'Paydaş kaydı pasife çekildi' })
      await loadData(true)
      setPageState('list')
    } finally {
      setDeleting(false)
    }
  }

  const handleActivate = async () => {
    if (!selectedStakeholder?.id) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/sirketler/paydaslar/${selectedStakeholder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedStakeholder,
          status: 'Aktif',
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
        }),
      })
      if (!response.ok) throw await createSaveError(response, 'Aktiflestirme basarisiz')
      const result = await response.json()
      if (result.data) setSelectedStakeholder(normalizeStakeholderForForm(result.data))
      setToast({ type: 'success', title: 'Kayit Basarili', message: 'Paydas kaydi aktive edildi' })
      invalidateEntityDetailCache('company-stakeholders', selectedStakeholder.id)
      await loadData(true)
      setPageState('view')
    } catch (err: any) {
      setToast(err.toast || { type: 'error', title: 'Kayit Basarisiz', message: err.message })
      throw err
    } finally {
      setDeleting(false)
    }
  }

  const bannerConfig = pageState === 'list'
    ? { mode: 'list' as const, title: 'Paydaşlarımız', subtitle: 'Şirket dışı ilişki ve paydaş kayıtlarını yönetin', onAddClick: () => { setSelectedStakeholder(null); setPageState('create') }, addButtonText: 'Ekle' }
    : { mode: 'form' as const, formMode, title: pageState === 'create' ? 'Yeni Paydaş' : selectedStakeholder?.display_name || 'Paydaş Detayı', subtitle: pageState === 'create' ? 'Yeni paydaş kaydı oluştur' : pageState === 'edit' ? 'Paydaş bilgilerini güncelle' : 'Paydaş kayıt detayları', onBackClick: () => setPageState('list') }

  return (
    <div className="relative">
      <PageBanner
        mode={bannerConfig.mode}
        {...(bannerConfig.mode === 'form' && { formMode: (bannerConfig as any).formMode })}
        title={bannerConfig.title}
        subtitle={bannerConfig.subtitle}
        icon={<Handshake size={24} />}
        {...(bannerConfig.mode === 'list' ? { onAddClick: (bannerConfig as any).onAddClick, addButtonText: (bannerConfig as any).addButtonText } : { onBackClick: (bannerConfig as any).onBackClick })}
      />

      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      {pageState === 'list' && (
        <div className="mt-6">
          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{error}</div>}
          <SmartDataTable columns={columns} data={tableData} loading={loading} widgets={widgets} defaultView="list" storageKey="sirket-paydaslar-table" emptyText="Paydaş kaydı bulunamadı" onRowClick={handleRowClick} onRefresh={() => loadData(true)} defaultPageSize={listQuery.pageSize} pagination={{ mode: 'server', page: listMeta.page, pageSize: listMeta.pageSize, total: listMeta.total, onPageChange: page => setListQuery(prev => ({ ...prev, page })), onPageSizeChange: pageSize => setListQuery(prev => ({ ...prev, page: 1, pageSize })), onSearchChange: search => setListQuery(prev => ({ ...prev, page: 1, search })), onSortChange: handleListSortChange }} showPassiveToggle includePassive={includePassive} onIncludePassiveChange={(next) => { setIncludePassive(next); setListQuery(prev => ({ ...prev, page: 1 })) }} />
        </div>
      )}

      {pageState !== 'list' && (
        <div className="mt-6">
          <EntityForm
            mode={formMode}
            entityName="Paydaşlarımız"
            entityNameSingular="Paydaş"
            identityGate={{
              enabled: true,
              allowedEntityKinds: ['person', 'organization'],
              masterTable: 'both',
              uniqueFields: {
                person: ['nationality', 'national_id', 'passport_no'],
                organization: ['country', 'tax_number', 'registration_number'],
              },
              roleTable: 'stakeholders',
              roleDuplicateCheck: 'company_id + person_id/organization_id + category + active',
              roleScopeFields: ['company_id', 'sirket_id'],
            }}
            heroFields={heroFields.map(withFieldHistory)}
            tabs={configuredTabs.map(tab => ({ ...tab, fields: tab.fields.map(withFieldHistory) }))}
            roleHeroCardTitle="Forma Özel"
            masterSummaryMode="entityIdentity"
            data={selectedStakeholder || undefined}
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
              dataField: 'photo_logo',
              slots: (formData) => normalizeStakeholderEntityType(formData.stakeholder_type || formData.master_entity_kind) === 'tuzel_kisi'
                ? [
                    { id: 'light_mode_avatar', title: 'Light Mode Avatar', required: true },
                    { id: 'dark_mode_avatar', title: 'Dark Mode Avatar', required: true },
                    { id: 'document_logo', title: 'Belge Logosu', required: false },
                  ]
                : [{ id: 'photo_logo', title: 'Fotoğraf', required: false }],
            }}
            documentSlot={{ title: 'Belgeler', dataField: 'stakeholder_documents', slots: [
              { id: 'sozlesme', title: 'Sözleşme', required: false },
              { id: 'teklif', title: 'Teklif Dosyası', required: false },
              { id: 'vergi_levhasi', title: 'Vergi Levhası', required: false },
              { id: 'imza_sirkuleri', title: 'İmza Sirküleri', required: false },
              { id: 'yetki_belgesi', title: 'Yetki Belgesi', required: false },
              { id: 'kvkk', title: 'KVKK Onayı', required: false },
              { id: 'nda', title: 'NDA', required: false },
              { id: 'mutabakat', title: 'Mutabakat', required: false },
              { id: 'diger', title: 'Diğer Belgeler', required: false },
            ], acceptedTypes: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 20 }}
            onValidationError={(fields) => setToast({ type: 'warning', title: 'Eksik Zorunlu Alan', message: fields.join(', ') })}
          />
        </div>
      )}
    </div>
  )
}

function SummaryList({ items, emptyText }: { items: any[]; emptyText: string }) {
  if (!items.length) return <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-700">{emptyText}</div>
  return <div className="rounded-lg border border-gray-200 dark:border-gray-700">{items.map((item, index) => <div key={`${item.slotId || item.name || index}`} className="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-sm last:border-b-0 dark:border-gray-800"><span className="font-medium text-gray-800 dark:text-gray-100">{item.slotTitle || item.title || item.name || 'Belge'}</span><span className="text-xs text-gray-500">{item.name || item.fileName || '-'}</span></div>)}</div>
}

function Timeline({ value }: { value: any[] }) {
  const items = value.length ? value : [
    { text: '01.02.2025 → Muhasebe şirketi olarak eklendi' },
    { text: '15.03.2025 → Yeni IBAN girildi' },
    { text: '01.06.2025 → Sözleşme yenilendi' },
    { text: '10.01.2026 → Durum pasif oldu' },
  ]
  return <div className="space-y-2">{items.map((item, index) => <div key={index} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">{item.text || `${item.changed_at || ''} → ${item.field || 'Değişiklik'}: ${item.old_value ?? '-'} → ${item.new_value ?? '-'}`}</div>)}</div>
}

function normalizeStakeholderForForm(stakeholder: StakeholderRow) {
  const profile = stakeholder.stakeholder_profile || {}
  const masterFields = stakeholder as StakeholderRow & {
    first_name?: string
    last_name?: string
    trade_name?: string
    legal_name?: string
    short_name?: string
    telefonlar?: Array<Record<string, any>>
    epostalar?: Array<Record<string, any>>
  }
  const displayName = stakeholder.display_name || ''
  const status = isSoftDeletedRecord(stakeholder) ? 'Pasif' : stakeholder.status || profile.status || 'Aktif'
  return {
    ...profile,
    ...stakeholder,
    stakeholder_type: normalizeStakeholderEntityType(profile.stakeholder_type || stakeholder.stakeholder_type),
    first_name: masterFields.first_name || '',
    last_name: masterFields.last_name || '',
    trade_name: masterFields.trade_name || masterFields.legal_name || '',
    short_name: masterFields.short_name || '',
    display_name: displayName,
    status,
    telefonlar: Array.isArray(masterFields.telefonlar) ? masterFields.telefonlar : [],
    epostalar: Array.isArray(masterFields.epostalar) ? masterFields.epostalar : [],
    document_summary: stakeholder.stakeholder_documents || [],
    timeline: stakeholder.history || [],
    field_history: buildEntityFieldHistory(stakeholder.history || []),
  }
}

function normalizeStakeholderEntityType(value: unknown): 'gercek_kisi' | 'tuzel_kisi' {
  const text = String(value || '').toLocaleLowerCase('tr-TR')
  if (['tuzel_kisi', 'tüzel_kisi', 'sirket', 'şirket', 'organization'].includes(text)) return 'tuzel_kisi'
  return 'gercek_kisi'
}

function normalizePayload(raw: Record<string, any>, companies: Option[], current?: Record<string, any>) {
  const payload = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== '' && value !== null && value !== undefined))
  const effective = { ...(current || {}), ...payload }
  payload.company_id = payload.company_id || current?.company_id || companies[0]?.value
  if (payload.master_entity_kind === 'person') payload.stakeholder_type = 'gercek_kisi'
  if (payload.master_entity_kind === 'organization') payload.stakeholder_type = 'tuzel_kisi'
  payload.stakeholder_type = payload.stakeholder_type || effective.stakeholder_type || 'gercek_kisi'
  payload.display_name = payload.stakeholder_type === 'tuzel_kisi'
    ? effective.trade_name || effective.legal_name || effective.ticari_unvan || effective.short_name || effective.kisa_unvan || effective.display_name
    : [effective.first_name, effective.last_name].filter(Boolean).join(' ').trim() || effective.full_name || effective.display_name
  payload.country = payload.country || payload.nationality_country || payload.nationality || 'TR'
  payload.tax_id = payload.tax_id || payload.national_id || payload.tc_kimlik || payload.tax_number || payload.vkn_tckn || payload.passport_no || payload.pasaport_no
  payload.document_summary = undefined
  payload.field_history = undefined
  return payload
}

function buildEntityFieldHistory(history: any[]) {
  const trackedMap: Record<string, string> = {
    category: 'category',
    status: 'status',
    phone: 'phone',
    email: 'email',
    internal_owner_employee_id: 'internal_owner_name',
    relationship_start_date: 'relationship_start_date',
  }
  return history.reduce((acc: Record<string, any[]>, entry: any) => {
    const field = trackedMap[entry.field]
    if (!field) return acc
    acc[field] = [...(acc[field] || []), { value: `${entry.old_value ?? '-'} → ${entry.new_value ?? '-'}`, date: entry.changed_at || entry.date || new Date().toISOString(), user: entry.changed_by || entry.user || 'Sistem Kullanıcısı' }]
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
