'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BriefcaseBusiness, Building2, FileText, Landmark, Phone, Settings, Users } from 'lucide-react'
import { useSirketler } from '@/hooks/useSirketler'
import { EntityForm, FormField, FormMode, FormTab } from '@/components/ui/EntityForm'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, ColumnDef, SortConfig, WidgetDef } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import type { AnyDashboardWidgetConfig } from '@/components/dashboard/dashboard.types'
import { CompanyNaceCodesSection } from '@/components/modules/sirket/CompanyPublicTab'
import { formatPhoneInput, normalizeEmailInput } from '@/lib/utils'
import { createFormModeState, mapPageStateToFormMode } from '@/lib/forms/formModeEngine'
import { isSoftDeletedRecord } from '@/lib/forms/entityState'
import { createProgressiveFormLoadStages } from '@/lib/forms/progressiveFormLoading'
import { invalidateEntityDetailCache, readEntityDetailCache, writeEntityDetailCache } from '@/lib/forms/entityDetailCache'
import { createLegalEntityMasterTabs } from '@/lib/identity/legalEntityFormSections'
import { useModules } from '@/lib/security/moduleStore'
import { usePermissions } from '@/lib/security/permissionStore'
import { PERMISSIONS } from '@/packages/shared/src'
import { companyService } from '@/lib/services/companyService'
import type { Sirket } from '@/types/sirket'

type PageState = 'list' | 'create' | 'view' | 'edit'
type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }
type SaveError = Error & { toast?: ToastState; fieldErrors?: Record<string, string> }
type SirketTableRow = Sirket & { adres_ozet: string; logo_url: string }
type TaxOfficeOption = { value: string; label: string }
type DetailSectionState = {
  heroLoading: boolean
  heroReady: boolean
  heroError: boolean
  mediaLoading: boolean
  mediaReady: boolean
  mediaError: boolean
  detailsLoading: boolean
  detailsReady: boolean
  detailsError: boolean
}
const emptyDetailSectionState: DetailSectionState = {
  heroLoading: false,
  heroReady: false,
  heroError: false,
  mediaLoading: false,
  mediaReady: false,
  mediaError: false,
  detailsLoading: false,
  detailsReady: false,
  detailsError: false,
}

const COMPANY_TYPE_SHORT_LABELS: Record<string, string> = {
  anonim: 'A.Ş.',
  limited: 'Ltd. Şti.',
  komandit: 'Kom. Şti.',
  kolektif: 'Kol. Şti.',
  adi_komandit: 'Adi Kom.',
  adi_sirket: 'Adi Şti.',
}

const FIELD_LABELS: Record<string, string> = {
  ticari_unvan: 'Ticari Unvan',
  kisa_unvan: 'Kısa Ünvan',
  vkn_tckn: 'VKN',
  vergi_dairesi: 'Vergi Dairesi',
  mersis_no: 'MERSİS No',
  ticaret_sicil_no: 'Ticaret Sicil No',
  kurulus_tarihi: 'Kuruluş Tarihi',
  sirket_turu: 'Şirket Türü',
  ulke: 'Ülke',
  il: 'İl',
  ilce: 'İlçe',
  adres: 'Adres',
  telefon: 'Telefon',
  email: 'E-posta',
  web_sitesi: 'Web Sitesi',
  legal_entity: 'Tüzel Kişilik',
  electronic_notification_address: 'Elektronik Tebligat Adresi',
  trade_registry_office: 'Ticaret Sicili Müdürlüğü',
  sirket_kodu: 'Şirket Kodu',
  e_fatura_mukellefi: 'E-Fatura Mükellefi',
  e_arsiv_mukellefi: 'E-Arşiv Mükellefi',
  e_irsaliye_mukellefi: 'E-İrsaliye Mükellefi',
  sgk_is_yeri_sicil_no: 'SGK İşyeri Sicil No',
  sgk_il: 'SGK İl',
  sgk_sube: 'SGK Şube',
  tehlike_sinifi: 'Tehlike Sınıfı',
  varsayilan_para_birimi: 'Varsayılan Para Birimi',
  varsayilan_dil: 'Varsayılan Dil',
  zaman_dilimi: 'Zaman Dilimi',
  mali_yil_baslangici: 'Mali Yıl Başlangıcı',
}

const columns: ColumnDef[] = [
  { key: 'logo_url', label: 'Logo', type: 'image', width: 64, fixedWidth: true, category: 'Kimlik' },
  { key: 'kisa_unvan', label: 'Kısa Ünvan', type: 'text', width: 200, sortable: true, category: 'Kimlik' },
  { key: 'ticari_unvan', label: 'Ticari Unvan', type: 'text', width: 280, sortable: true, category: 'Kimlik' },
  { key: 'vkn_tckn', label: 'VKN', type: 'text', width: 120, sortable: true, category: 'Kimlik' },
  { key: 'vergi_dairesi', label: 'Vergi Dairesi', type: 'text', width: 140, sortable: true, category: 'Vergi' },
  { key: 'sirket_turu', label: 'Şirket Türü', type: 'enum', width: 110, sortable: true, category: 'Tescil', render: (value) => COMPANY_TYPE_SHORT_LABELS[String(value)] || value || '-' },
  { key: 'adres_ozet', label: 'Adres', type: 'text', width: 250, category: 'İletişim' },
  { key: 'telefon', label: 'Telefon', type: 'text', width: 150, category: 'İletişim' },
  { key: 'email', label: 'E-posta', type: 'text', width: 200, category: 'İletişim' },
  { key: 'is_deleted', label: 'Durum', type: 'enum', width: 110, sortable: true, category: 'Durum', render: (value) => value ? 'Pasif' : 'Aktif' },
  { key: 'mersis_no', label: FIELD_LABELS.mersis_no, type: 'text', width: 150, sortable: true, category: 'Tescil', required: false, visible: false },
  { key: 'ticaret_sicil_no', label: FIELD_LABELS.ticaret_sicil_no, type: 'text', width: 150, sortable: true, category: 'Tescil', required: false, visible: false },
  { key: 'kurulus_tarihi', label: FIELD_LABELS.kurulus_tarihi, type: 'date', width: 130, sortable: true, category: 'Tescil', required: false, visible: false },
  { key: 'electronic_notification_address', label: FIELD_LABELS.electronic_notification_address, type: 'text', width: 190, sortable: true, category: 'Tescil', required: false, visible: false },
  { key: 'trade_registry_office', label: FIELD_LABELS.trade_registry_office, type: 'text', width: 190, sortable: true, category: 'Tescil', required: false, visible: false },
  { key: 'sirket_kodu', label: FIELD_LABELS.sirket_kodu, type: 'text', width: 130, sortable: true, category: 'Tescil', required: false, visible: false },
  { key: 'ulke', label: FIELD_LABELS.ulke, type: 'text', width: 120, sortable: true, category: 'İletişim', required: false, visible: false },
  { key: 'il', label: FIELD_LABELS.il, type: 'text', width: 120, sortable: true, category: 'İletişim', required: false, visible: false },
  { key: 'ilce', label: FIELD_LABELS.ilce, type: 'text', width: 120, sortable: true, category: 'İletişim', required: false, visible: false },
  { key: 'adres', label: FIELD_LABELS.adres, type: 'text', width: 260, category: 'İletişim', required: false, visible: false },
  { key: 'web_sitesi', label: FIELD_LABELS.web_sitesi, type: 'text', width: 180, category: 'İletişim', required: false, visible: false },
  { key: 'e_fatura_mukellefi', label: FIELD_LABELS.e_fatura_mukellefi, type: 'boolean', width: 140, sortable: true, category: 'Vergi', required: false, visible: false },
  { key: 'e_arsiv_mukellefi', label: FIELD_LABELS.e_arsiv_mukellefi, type: 'boolean', width: 140, sortable: true, category: 'Vergi', required: false, visible: false },
  { key: 'e_irsaliye_mukellefi', label: FIELD_LABELS.e_irsaliye_mukellefi, type: 'boolean', width: 140, sortable: true, category: 'Vergi', required: false, visible: false },
  { key: 'sgk_is_yeri_sicil_no', label: FIELD_LABELS.sgk_is_yeri_sicil_no, type: 'text', width: 170, sortable: true, category: 'Vergi', required: false, visible: false },
  { key: 'sgk_il', label: FIELD_LABELS.sgk_il, type: 'text', width: 120, sortable: true, category: 'Vergi', required: false, visible: false },
  { key: 'sgk_sube', label: FIELD_LABELS.sgk_sube, type: 'text', width: 130, sortable: true, category: 'Vergi', required: false, visible: false },
  { key: 'tehlike_sinifi', label: FIELD_LABELS.tehlike_sinifi, type: 'enum', width: 140, sortable: true, category: 'Vergi', required: false, visible: false },
  { key: 'varsayilan_para_birimi', label: FIELD_LABELS.varsayilan_para_birimi, type: 'text', width: 150, sortable: true, category: 'Ayarlar', required: false, visible: false },
  { key: 'varsayilan_dil', label: FIELD_LABELS.varsayilan_dil, type: 'text', width: 130, sortable: true, category: 'Ayarlar', required: false, visible: false },
  { key: 'zaman_dilimi', label: FIELD_LABELS.zaman_dilimi, type: 'text', width: 170, sortable: true, category: 'Ayarlar', required: false, visible: false },
  { key: 'mali_yil_baslangici', label: FIELD_LABELS.mali_yil_baslangici, type: 'number', width: 150, sortable: true, category: 'Ayarlar', required: false, visible: false },
]

const heroFields: FormField[] = [
  { name: 'kisa_unvan', label: 'Kısa Ünvan', type: 'text', required: true },
  { name: 'ticari_unvan', label: 'Ticari Unvan', type: 'text', required: true, colSpan: 2 },
  { name: 'vergi_dairesi', label: 'Vergi Dairesi', type: 'select', required: true, searchable: true },
  {
    name: 'sirket_turu',
    label: 'Şirket Türü',
    type: 'select',
    required: true,
    options: [
      { value: 'anonim', label: 'Sermaye Şirketi - Anonim' },
      { value: 'limited', label: 'Sermaye Şirketi - Limited' },
      { value: 'komandit', label: 'Sermaye Şirketi - Komandit' },
      { value: 'kolektif', label: 'Şahıs Şirketi - Kolektif' },
      { value: 'adi_komandit', label: 'Şahıs Şirketi - Adi Komandit' },
      { value: 'adi_sirket', label: 'Şahıs Şirketi - Adi Şirket' },
    ],
  },
]

const tabs: FormTab[] = [
  {
    id: 'ortaklar',
    label: 'Ortaklar',
    icon: <Users size={16} />,
    fields: [
      {
        name: 'ortaklar',
        label: 'Ortaklar',
        type: 'custom',
        colSpan: 3,
      },
    ],
  },
  {
    id: 'temsilciler',
    label: 'Temsilciler',
    icon: <BriefcaseBusiness size={16} />,
    fields: [
      {
        name: 'temsilciler',
        label: 'Temsilciler',
        type: 'custom',
        colSpan: 3,
      },
    ],
  },
  {
    id: 'paydaslar',
    label: 'Paydaşlar',
    icon: <Users size={16} />,
    fields: [
      {
        name: 'paydaslar',
        label: 'Paydaşlar',
        type: 'custom',
        colSpan: 3,
      },
    ],
  },
  {
    id: 'iletisim',
    label: 'İletişim',
    icon: <Phone size={16} />,
    fields: [
      { name: 'il', label: 'İl', type: 'text', required: true },
      { name: 'ilce', label: 'İlçe', type: 'text', required: true },
      { name: 'adres', label: 'Adres', type: 'textarea', required: true, colSpan: 3 },
      { name: 'telefon', label: 'Telefon', type: 'tel' },
      { name: 'email', label: 'E-posta', type: 'email' },
      { name: 'web_sitesi', label: 'Web Sitesi', type: 'text', colSpan: 2 },
    ],
  },
  {
    id: 'tescil',
    label: 'Tescil',
    icon: <FileText size={16} />,
    fields: [
      { name: 'mersis_no', label: 'MERSİS No', type: 'text' },
      { name: 'ticaret_sicil_no', label: 'Ticaret Sicil No', type: 'text' },
      { name: 'kurulus_tarihi', label: 'Kuruluş Tarihi', type: 'date' },
      { name: 'electronic_notification_address', label: 'Elektronik Tebligat Adresi', type: 'text', maxLength: 17, inputMode: 'numeric', pattern: '\\d{5}-\\d{5}-\\d{5}', placeholder: '11111-22222-33333' },
      { name: 'trade_registry_office', label: 'Ticaret Sicili Müdürlüğü', type: 'select', searchable: true },
      { name: 'sirket_kodu', label: 'Şirket Kodu', type: 'text' },
    ],
  },
  {
    id: 'vergi',
    label: 'Kamu',
    icon: <Landmark size={16} />,
    fields: [
      { name: 'e_fatura_mukellefi', label: 'E-Fatura Mükellefi', type: 'checkbox' },
      { name: 'e_arsiv_mukellefi', label: 'E-Arşiv Mükellefi', type: 'checkbox' },
      { name: 'e_irsaliye_mukellefi', label: 'E-İrsaliye Mükellefi', type: 'checkbox' },
      { name: 'sgk_is_yeri_sicil_no', label: 'SGK İşyeri Sicil No', type: 'text', maxLength: 26, inputMode: 'numeric', placeholder: '26 hane: M + 4 işkolu + 2 eski şube + 2 yeni şube + 7 sıra + 3 il + 2 ilçe + 2 kontrol + 3 aracı' },
      { name: 'sgk_il', label: 'SGK İl', type: 'text', placeholder: 'SGK sicil no girilince otomatik dolar' },
      { name: 'sgk_sube', label: 'SGK Şube', type: 'text', placeholder: 'SGK sicil no girilince otomatik dolar' },
      { name: 'tehlike_sinifi', label: 'Tehlike Sınıfı', type: 'custom', colSpan: 3 },
      { name: 'company_nace_codes', label: 'NACE / Faaliyet Kodları', type: 'custom', colSpan: 3 },
    ],
  },
  {
    id: 'ayarlar',
    label: 'Ayarlar',
    icon: <Settings size={16} />,
    fields: [
      {
        name: 'varsayilan_para_birimi',
        label: 'Varsayılan Para Birimi',
        type: 'select',
        defaultValue: 'TRY',
        options: [
          { value: 'TRY', label: 'TRY - Türk Lirası' },
          { value: 'USD', label: 'USD - US Dollar' },
          { value: 'EUR', label: 'EUR - Euro' },
          { value: 'GBP', label: 'GBP - British Pound' },
        ],
      },
      {
        name: 'varsayilan_dil',
        label: 'Varsayılan Dil',
        type: 'select',
        defaultValue: 'tr',
        options: [
          { value: 'tr', label: 'Türkçe' },
          { value: 'en', label: 'English' },
          { value: 'de', label: 'Deutsch' },
        ],
      },
      { name: 'zaman_dilimi', label: 'Zaman Dilimi', type: 'text', defaultValue: 'Europe/Istanbul' },
      { name: 'mali_yil_baslangici', label: 'Mali Yıl Başlangıcı', type: 'number', defaultValue: 1 },
    ],
  },
]

const getFieldLabel = (field: string) => FIELD_LABELS[field] || field
const formatFieldList = (fields: string[]) => fields.map(getFieldLabel).join(', ')

export default function SirketlerPage() {
  const [includePassive, setIncludePassive] = useState(false)
  const [listQuery, setListQuery] = useState({ page: 1, pageSize: 50, search: '', sort: 'kisa_unvan', direction: 'asc' as 'asc' | 'desc' })
  const { data: sirketler, meta: listMeta, loading, error: listError, yenile } = useSirketler({ includePassive, ...listQuery })
  const { can } = usePermissions()
  const { isEnabled, isWritable } = useModules()
  const [pageState, setPageState] = useState<PageState>('list')
  const [selectedSirket, setSelectedSirket] = useState<Sirket | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailSections, setDetailSections] = useState<DetailSectionState>(emptyDetailSectionState)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<ToastState | null>(null)
  const [taxOfficeOptions, setTaxOfficeOptions] = useState<TaxOfficeOption[]>([])
  const [tradeRegistryOfficeOptions, setTradeRegistryOfficeOptions] = useState<TaxOfficeOption[]>([])
  const [publicReferenceOptionsLoaded, setPublicReferenceOptionsLoaded] = useState(false)
  const detailRequestRef = useRef(0)

  useEffect(() => {
    if (pageState === 'list' || publicReferenceOptionsLoaded) return
    let cancelled = false

    fetch('/api/reference/tax-offices')
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        if (cancelled || !Array.isArray(payload?.offices)) return
        setTaxOfficeOptions(payload.offices.map((office: any) => {
          const label = `${office.code ? `${office.code} - ` : ''}${office.name} (${office.province}/${office.district})`
          return { value: label, label }
        }))
      })
      .catch(() => {
        if (!cancelled) setTaxOfficeOptions([])
      })

    fetch('/api/reference/trade-registry-offices')
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        if (cancelled || !Array.isArray(payload?.offices)) return
        setTradeRegistryOfficeOptions(payload.offices.map((office: any) => {
          const label = `${office.name} Ticaret Sicili Müdürlüğü`
          return { value: label, label }
        }))
      })
      .catch(() => {
        if (!cancelled) setTradeRegistryOfficeOptions([])
      })

    setPublicReferenceOptionsLoaded(true)

    return () => {
      cancelled = true
    }
  }, [pageState, publicReferenceOptionsLoaded])

  const configuredHeroFields = heroFields.map(field =>
    field.name === 'vergi_dairesi' && taxOfficeOptions.length > 0
      ? { ...field, options: taxOfficeOptions }
      : field
  )

  const configuredTabs = [
    ...createLegalEntityMasterTabs({
      addressField: 'adres',
      countryField: 'ulke',
      cityField: 'il',
      districtField: 'ilce',
      phoneField: 'telefon',
      emailField: 'email',
      websiteField: 'web_sitesi',
    }),
    ...tabs.filter(tab => tab.id !== 'iletisim'),
  ].map(tab => ({
    ...tab,
    fields: tab.fields.map(field =>
      field.name === 'trade_registry_office' && tradeRegistryOfficeOptions.length > 0
        ? { ...field, options: tradeRegistryOfficeOptions }
        : field
    ),
  }))

  const tableData: SirketTableRow[] = useMemo(() => (sirketler || []).map(sirket => ({
    ...sirket,
    is_deleted: !!sirket.is_deleted,
    adres_ozet: [sirket.ilce, sirket.il].filter(Boolean).join(', '),
    logo_url: extractLogoUrl((sirket as any).hero_images),
  })), [sirketler])

  const widgets: WidgetDef<SirketTableRow>[] = useMemo(() => [
    { key: 'total', label: 'Toplam Şirket', render: () => tableData.length },
    { key: 'active', label: 'Aktif', render: () => tableData.filter(row => !isSoftDeletedRecord(row)).length },
    { key: 'passive', label: 'Pasif', render: () => tableData.filter(row => isSoftDeletedRecord(row)).length },
  ], [tableData])

  const moduleEnabled = isEnabled('companies')
  const moduleWritable = isWritable('companies')
  const formAccess = createFormModeState(mapPageStateToFormMode(pageState), {
    canView: moduleEnabled && can(PERMISSIONS.companies.view),
    canInsert: moduleWritable && can(PERMISSIONS.companies.insert),
    canEdit: moduleWritable && can(PERMISSIONS.companies.edit),
    canApprove: moduleWritable && can(PERMISSIONS.companies.approve),
  })
  const isSelectedPassive = isSoftDeletedRecord(selectedSirket)
  const formMode: FormMode = pageState === 'create'
    ? 'create'
    : isSelectedPassive
      ? 'passive'
      : pageState === 'edit' && formAccess.canSave
        ? 'edit'
        : 'view'
  const formLoadStages = createProgressiveFormLoadStages({
    mode: formMode,
    hasSnapshot: pageState !== 'create' && !!selectedSirket,
    ...detailSections,
    hasMaster: !!((selectedSirket as any)?.organization_id || (selectedSirket as any)?.master_record_id || (selectedSirket as any)?.master),
    referencesLoading: pageState !== 'list' && !publicReferenceOptionsLoaded,
    referencesReady: pageState !== 'list' && publicReferenceOptionsLoaded,
  })

  if (!formAccess.canView) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
        Bu modulu goruntuleme yetkiniz bulunmuyor.
      </div>
    )
  }

  const handleAddClick = () => {
    if (!formAccess.showAdd) return
    setSelectedSirket(null)
    setFormError(null)
    setFieldErrors({})
    setDetailSections(emptyDetailSectionState)
    setPageState('create')
  }

  const handleRowClick = async (row: SirketTableRow) => {
    const requestId = detailRequestRef.current + 1
    detailRequestRef.current = requestId
    const snapshot = normalizeCompanyForForm(row as Sirket)
    const cached = readEntityDetailCache<Sirket, DetailSectionState>('companies', row.id)

    if (cached) {
      setFormError(null)
      setFieldErrors({})
      setSelectedSirket(cached.data)
      setPageState('view')
      setDetailLoading(false)
      setDetailSections(cached.meta || emptyDetailSectionState)
      return
    }

    let mergedData = snapshot
    const applySection = (sectionData: Partial<Sirket>) => {
      if (detailRequestRef.current !== requestId) return
      mergedData = normalizeCompanyForForm({ ...mergedData, ...sectionData } as Sirket)
      setSelectedSirket(mergedData)
    }

    setFormError(null)
    setFieldErrors({})
    setSelectedSirket(snapshot)
    setPageState('view')
    setDetailLoading(true)
    setDetailSections({ ...emptyDetailSectionState, heroLoading: true })

    try {
      const heroResult = await companyService.detailSection(row.id, 'hero')
      if (!heroResult.data) throw new Error('Sirket hero bilgileri yuklenemedi')

      applySection(heroResult.data)
      if (detailRequestRef.current !== requestId) return
      const heroSections = { ...emptyDetailSectionState, heroLoading: false, heroReady: true, mediaLoading: true }
      setDetailSections(heroSections)
      writeEntityDetailCache('companies', row.id, mergedData, { meta: { ...heroSections, mediaLoading: false } })

      try {
        const mediaResult = await companyService.detailSection(row.id, 'media')
        if (!mediaResult.data) throw new Error('Sirket fotograf ve belge bilgileri yuklenemedi')
        applySection(mediaResult.data)
        if (detailRequestRef.current !== requestId) return
        setDetailSections(previous => {
          const next = { ...previous, mediaLoading: false, mediaReady: true, detailsLoading: true }
          writeEntityDetailCache('companies', row.id, mergedData, { meta: { ...next, detailsLoading: false } })
          return next
        })
      } catch {
        if (detailRequestRef.current !== requestId) return
        setDetailSections(previous => ({ ...previous, mediaLoading: false, mediaError: true, detailsLoading: true }))
      }

      const detailsResult = await companyService.detailSection(row.id, 'details')
      if (!detailsResult.data) throw new Error('Sirket detay alanlari yuklenemedi')
      applySection(detailsResult.data)
      if (detailRequestRef.current !== requestId) return
      setDetailSections(previous => {
        const next = { ...previous, detailsLoading: false, detailsReady: true }
        writeEntityDetailCache('companies', row.id, mergedData, { meta: next })
        return next
      })
    } catch (error: any) {
      if (detailRequestRef.current !== requestId) return
      setDetailSections(previous => ({
        ...previous,
        heroLoading: false,
        mediaLoading: false,
        detailsLoading: false,
        heroError: previous.heroReady ? previous.heroError : true,
        detailsError: previous.heroReady ? true : previous.detailsError,
      }))
      setFormError(error.message || 'Şirket detayı yüklenemedi')
      setToast(error.toast || {
        type: 'error',
        title: 'Detay Yüklenemedi',
        message: error.message || 'Şirket detayı yüklenemedi',
      })
    } finally {
      if (detailRequestRef.current === requestId) setDetailLoading(false)
    }
  }

  const handleBackToList = () => {
    setPageState('list')
    setSelectedSirket(null)
    setFormError(null)
    setFieldErrors({})
    setDetailSections(emptyDetailSectionState)
  }

  const normalizePayload = (raw: Record<string, any>) => {
    const payload: Record<string, any> = {}

    Object.entries(raw).forEach(([key, value]) => {
      if (['ortaklar', 'temsilciler', 'paydaslar', 'dokumanlar', 'logolar'].includes(key)) return
      if (value === '' || value === null || value === undefined) return
      if (pageState !== 'create' && ['hero_documents', 'hero_images'].includes(key) && selectedSirket) {
        if (JSON.stringify(value) === JSON.stringify((selectedSirket as any)[key] || [])) return
      }
      payload[key] = value
    })

    if (payload.telefon) payload.telefon = formatPhoneInput(String(payload.telefon))
    if (payload.email) payload.email = normalizeEmailInput(String(payload.email))
    if (payload.vkn_tckn) payload.vkn_tckn = String(payload.vkn_tckn).replace(/\D/g, '').slice(0, 10)
    if (payload.electronic_notification_address) {
      const digits = String(payload.electronic_notification_address).replace(/\D/g, '').slice(0, 15)
      payload.electronic_notification_address = digits.replace(/(\d{5})(?=\d)/g, '$1-')
    }
    if (payload.mali_yil_baslangici) payload.mali_yil_baslangici = Number(payload.mali_yil_baslangici)
    payload.is_deleted = payload.is_deleted ?? false
    if (pageState === 'create') {
      payload.ulke = payload.ulke || 'Türkiye'
      payload.varsayilan_para_birimi = payload.varsayilan_para_birimi || 'TRY'
      payload.varsayilan_dil = payload.varsayilan_dil || 'tr'
      payload.zaman_dilimi = payload.zaman_dilimi || 'Europe/Istanbul'
      payload.mali_yil_baslangici = payload.mali_yil_baslangici || 1
    }

    return payload
  }

  const handleSave = async (data: Record<string, any>, mode: FormMode) => {
    setSaving(true)
    setFormError(null)
    setFieldErrors({})

    try {
      const payload = normalizePayload(data)
      const response = await fetch(mode === 'create' ? '/api/sirketler' : `/api/sirketler/${selectedSirket?.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw await createSaveError(response, mode === 'create' ? 'Şirket oluşturulamadı' : 'Güncelleme başarısız')
      }

      const result = await response.json()
      if (mode === 'create') {
        invalidateEntityDetailCache('companies')
      } else {
        invalidateEntityDetailCache('companies', selectedSirket?.id)
      }
      if (result.data) setSelectedSirket(result.data)
      setToast({
        type: 'success',
        title: 'Kayıt Başarılı',
        message: mode === 'create' ? 'Şirket kaydı oluşturuldu' : 'Şirket bilgileri güncellendi',
      })
      await yenile()
      setPageState('list')
    } catch (error: any) {
      setFormError(error.message)
      setFieldErrors(error.fieldErrors || {})
      setToast(error.toast || { type: 'error', title: 'Kayıt Başarısız', message: error.message })
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedSirket) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/sirketler/${selectedSirket.id}`, { method: 'DELETE' })
      invalidateEntityDetailCache('companies', selectedSirket.id)

      if (!response.ok) {
        throw await createSaveError(response, 'Silme işlemi başarısız')
      }

      setToast({ type: 'success', title: 'Kayıt Başarılı', message: 'Şirket kaydı pasife çekildi' })
      await yenile()
      setPageState('list')
    } catch (error: any) {
      setFormError(error.message)
      setToast(error.toast || { type: 'error', title: 'Kayıt Başarısız', message: error.message })
      throw error
    } finally {
      setDeleting(false)
    }
  }

  const handleActivate = async () => {
    if (!selectedSirket) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/sirketler/${selectedSirket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_deleted: false }),
      })
      invalidateEntityDetailCache('companies', selectedSirket.id)

      if (!response.ok) {
        throw await createSaveError(response, 'Aktiflestirme basarisiz')
      }

      const result = await response.json()
      if (result.data) setSelectedSirket({ ...selectedSirket, ...result.data, is_deleted: false })
      setToast({ type: 'success', title: 'Kayit Basarili', message: 'Sirket kaydi aktive edildi' })
      await yenile()
      setPageState('view')
    } catch (error: any) {
      setFormError(error.message)
      setToast(error.toast || { type: 'error', title: 'Kayit Basarisiz', message: error.message })
      throw error
    } finally {
      setDeleting(false)
    }
  }

  const createSaveError = async (response: Response, fallback: string): Promise<SaveError> => {
    const body = await response.json().catch(() => ({}))
    const code = body.code || `HTTP_${response.status}`
    const zodFieldErrors = body.details?.fieldErrors || {}
    const fields = Object.keys(zodFieldErrors)

    if (code === 'VALIDATION_FAILED' && fields.length > 0) {
      const message = formatFieldList(fields)
      const error = new Error(`Eksik Zorunlu Alan [${message}]`) as SaveError
      error.fieldErrors = Object.fromEntries(
        fields.map(field => {
          const firstMessage = Array.isArray(zodFieldErrors[field]) ? zodFieldErrors[field][0] : null
          return [field, typeof firstMessage === 'string' ? firstMessage : `${getFieldLabel(field)} zorunludur`]
        })
      )
      error.toast = { type: 'warning', title: 'Eksik Zorunlu Alan', message }
      return error
    }

    const message = `${body.error || fallback} [${code}]`
    const error = new Error(message) as SaveError
    error.toast = { type: 'error', title: 'Kayıt Başarısız', message }
    return error
  }

  const withFieldHistory = (field: FormField) => {
    const history = (selectedSirket as any)?.field_history?.[field.name]
    return history ? { ...field, history } : field
  }

  const bannerConfig = pageState === 'list'
    ? {
        mode: 'list' as const,
        title: 'Şirketlerimiz',
        subtitle: 'Yönetilen şirket kayıtlarını görüntüleyin',
        onAddClick: formAccess.showAdd ? handleAddClick : undefined,
        addButtonText: 'Ekle',
      }
    : {
        mode: 'form' as const,
        formMode,
        title: pageState === 'create' ? 'Yeni Şirket' : selectedSirket?.kisa_unvan || 'Şirket Detayı',
        subtitle: pageState === 'create'
          ? 'Yeni şirket kaydı oluştur'
          : pageState === 'edit'
            ? 'Şirket bilgilerini güncelle'
            : 'Şirket bilgilerini görüntüle',
        onBackClick: handleBackToList,
      }


  const dashboardWidgets: AnyDashboardWidgetConfig[] = [
    {
      id: 'companies-geographic-trade-reach',
      type: 'geographicTradeReach',
      title: 'Coğrafi Erişim ve Ticari Ağ',
      description: 'Şirket bağlantılarının Türkiye ve dünya üzerindeki dağılımı',
      module: 'companies',
      size: { w: 12, h: 6, minHeight: 560 },
      dataSource: 'dashboard.companies.geographicTradeReach',
      permissions: [],
    },
  ]

  const handleListSortChange = (sorts: SortConfig[]) => {
    const sort = sorts[0]
    setListQuery(prev => ({
      ...prev,
      page: 1,
      sort: sort?.key || 'kisa_unvan',
      direction: sort?.direction || 'asc',
    }))
  }

  return (
    <div className="relative">
      <PageBanner
        mode={bannerConfig.mode}
        {...(bannerConfig.mode === 'form' && { formMode: (bannerConfig as any).formMode })}
        title={bannerConfig.title}
        subtitle={bannerConfig.subtitle}
        icon={<Building2 size={24} />}
        {...(bannerConfig.mode === 'list'
          ? { onAddClick: (bannerConfig as any).onAddClick, addButtonText: (bannerConfig as any).addButtonText }
          : { onBackClick: (bannerConfig as any).onBackClick }
        )}
      />

      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {pageState === 'list' && (
        <div className="mt-6 space-y-4">
          {listError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>
            </div>
          )}

          <SmartDataTable<SirketTableRow>
            columns={columns}
            data={tableData}
            loading={loading}
            onRowClick={handleRowClick}
            onRefresh={yenile}
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
            widgets={widgets}
            dashboardWidgets={dashboardWidgets}
            onDashboardFilter={(event) => {
              if (event.widgetId === 'companies-geographic-trade-reach') {
                setToast({
                  type: 'success',
                  title: 'Coğrafi Filtre',
                  message: 'Coğrafi erişim widget filtresi üretildi.',
                })
              }
            }}
            defaultView="list"
            storageKey="sirketler-table"
            emptyText="Şirket kaydı bulunamadı"
          />
        </div>
      )}

      {pageState !== 'list' && (
        <div className="mt-6 space-y-4">
          <EntityForm
            mode={formMode}
            entityName="Şirketler"
            entityNameSingular="Şirket"
            identityGate={{
              enabled: true,
              allowedEntityKinds: ['organization'],
              masterTable: 'organizations',
              uniqueFields: {
                organization: ['country', 'tax_number', 'registration_number'],
              },
              roleTable: 'sirketler',
              roleDuplicateCheck: 'organization_id + active',
            }}
            heroFields={configuredHeroFields.map(withFieldHistory)}
            tabs={configuredTabs.map(tab => ({
              ...tab,
              fields: tab.fields.map(field => {
                const nextField = withFieldHistory(field)
                if (nextField.name === 'tehlike_sinifi') {
                  return {
                    ...nextField,
                    render: () => {
                      const rows = Array.isArray((selectedSirket as any)?.company_nace_codes) ? (selectedSirket as any).company_nace_codes : []
                      const primary = rows.find((row: any) => row?.is_primary && row?.status !== 'passive')
                      const hazardClass = formatHazardClass(primary?.nace_code?.hazard_class || (selectedSirket as any)?.public_sgk?.risk_class || (selectedSirket as any)?.tehlike_sinifi) || 'Birincil NACE seçilmemiş'

                      return (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900/50">
                          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">{hazardClass}</span>
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Tehlike sınıfı, birincil NACE koduna göre otomatik belirlenir.</p>
                        </div>
                      )
                    },
                  }
                }

                if (nextField.name === 'company_nace_codes') {
                  return {
                    ...nextField,
                    render: ({ value }) => (
                      <CompanyNaceCodesSection
                        companyId={selectedSirket?.id}
                        initialRows={Array.isArray(value) ? value : (selectedSirket as any)?.company_nace_codes}
                        readOnly={pageState !== 'edit'}
                      />
                    ),
                  }
                }

                if (nextField.name === 'ortaklar') {
                  return {
                    ...nextField,
                    render: ({ value }) => <RelatedSummaryTable type="ortaklar" rows={Array.isArray(value) ? value : []} />,
                  }
                }

                if (nextField.name === 'paydaslar') {
                  return {
                    ...nextField,
                    render: ({ value }) => <RelatedSummaryTable type="paydaslar" rows={Array.isArray(value) ? value : []} />,
                  }
                }

                if (nextField.name !== 'temsilciler') return nextField

                return {
                  ...nextField,
                  render: ({ value }) => <RelatedSummaryTable type="temsilciler" rows={Array.isArray(value) ? value : []} />,
                }
              }),
            }))}
            data={selectedSirket || undefined}
            saving={saving}
            deleting={deleting}
            error={formError}
            loadStages={formLoadStages}
            externalFieldErrors={fieldErrors}
            onSave={handleSave}
            onCancel={handleBackToList}
            onDelete={handleDelete}
            onActivate={handleActivate}
            onModeChange={(mode) => setPageState(mode === 'edit' && !formAccess.showEdit ? 'view' : mode)}
            onIdentityGateOpenExistingRole={async (roleRecord) => {
              await handleRowClick(roleRecord as SirketTableRow)
              setPageState('edit')
            }}
            onIdentityGateCancelDuplicate={handleBackToList}
            canCreate={formAccess.showAdd}
            canEdit={formAccess.showEdit}
            enableHistory
            showHeroHeader={false}
            showMasterSummaryBadge={false}
            masterSummaryMode="organizationIdentity"
            hideRoleHeroFields
            showEmptyRoleHeroState={false}
            imageSlot={{
              dataField: 'hero_images',
              slots: [
                { id: 'light_mode_avatar', title: 'Light Mode Avatar', required: true },
                { id: 'dark_mode_avatar', title: 'Dark Mode Avatar', required: true },
                { id: 'document_logo', title: 'Belge Logosu', required: false },
              ],
            }}
            documentSlot={{
              dataField: 'hero_documents',
              slots: [
                { id: 'vergi_levhasi', title: 'Vergi Levhası', required: true },
                { id: 'ticaret_sicil', title: 'Ticaret Sicil Gazetesi', required: true },
                { id: 'sicil_tasdiknamesi', title: 'Sicil Tasdiknamesi', required: false },
                { id: 'imza_sirkuleri', title: 'İmza Sirküleri', required: true },
                { id: 'faaliyet_belgesi', title: 'Faaliyet Belgesi', required: false },
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

function formatHazardClass(value: unknown) {
  const normalized = String(value || '').trim().toLocaleLowerCase('tr-TR').replace(/_/g, ' ')
  if (!normalized) return ''
  if (normalized === 'az tehlikeli') return 'Az Tehlikeli'
  if (normalized === 'tehlikeli') return 'Tehlikeli'
  if (normalized === 'cok tehlikeli' || normalized === 'çok tehlikeli') return 'Çok Tehlikeli'
  return String(value || '')
}

function extractLogoUrl(images: unknown) {
  const rows = Array.isArray(images) ? images : []
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const preferredSlot = isDark ? 'dark_mode_avatar' : 'light_mode_avatar'
  const preferred = rows.find((image: any) => image?.slotId === preferredSlot || image?.slot_id === preferredSlot)
    || rows.find((image: any) => image?.slotId === 'light_mode_avatar' || image?.slot_id === 'light_mode_avatar')
    || rows.find((image: any) => image?.slotId === 'document_logo' || image?.slot_id === 'document_logo')
    || rows.find((image: any) => image?.slotId === 'original_logo' || image?.slot_id === 'original_logo' || image?.slotId === 'logo_primary' || image?.slot_id === 'logo_primary')
    || rows[0]
  return preferred?.url || preferred?.previewUrl || preferred?.preview_url || ''
}

function RelatedSummaryTable({ type, rows }: { type: 'ortaklar' | 'temsilciler' | 'paydaslar'; rows: any[] }) {
  const isPartners = type === 'ortaklar'
  const isStakeholders = type === 'paydaslar'
  const columnCount = isPartners || isStakeholders ? 5 : 4
  const sourcePage = isPartners ? 'Ortaklar' : isStakeholders ? 'Paydaşlar' : 'Temsilciler'
  const href = isPartners ? '/app/sirket/sirketler/ortaklar' : isStakeholders ? '/app/sirket/sirketler/paydaslar' : '/app/sirket/sirketler/temsilciler'
  const title = isPartners ? 'Ortak bilgileri' : isStakeholders ? 'Paydaş bilgileri' : 'Temsilci bilgileri'
  const emptyText = isPartners
    ? 'Bu şirket için ortak kaydı bulunamadı.'
    : isStakeholders
      ? 'Bu şirket için paydaş kaydı bulunamadı.'
      : 'Bu şirket için temsilci kaydı bulunamadı.'

  return (
    <div className="col-span-2 space-y-3 lg:col-span-3">
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
        <span className="font-medium">{title}</span> {sourcePage} sayfasından otomatik çekilmektedir. Eksik ya da yanlış varsa lütfen{' '}
        <a href={href} className="font-semibold underline underline-offset-2">
          ilgili sayfadan
        </a>{' '}
        düzeltiniz.
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
            <tr>
              {isPartners ? (
                <>
                  <th className="px-3 py-2">Ad / Ünvan</th>
                  <th className="px-3 py-2">Tür</th>
                  <th className="px-3 py-2">Hisse %</th>
                  <th className="px-3 py-2">Oy %</th>
                  <th className="px-3 py-2">Durum</th>
                </>
              ) : isStakeholders ? (
                <>
                  <th className="px-3 py-2">Ad / Ünvan</th>
                  <th className="px-3 py-2">Paydaş Türü</th>
                  <th className="px-3 py-2">İlişki</th>
                  <th className="px-3 py-2">Öncelik</th>
                  <th className="px-3 py-2">Durum</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-2">Ad / Ünvan</th>
                  <th className="px-3 py-2">Kişi / Kurum</th>
                  <th className="px-3 py-2">Ana Yetki</th>
                  <th className="px-3 py-2">Durum</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  {emptyText}
                </td>
              </tr>
            )}
            {rows.map((row, index) => (
              <tr key={row.id || row.temp_id || index}>
                {isPartners ? (
                  <>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{row.display_name || row.ortak_adi || '-'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.owner_kind === 'tuzel_kisi' || row.ortak_tipi === 'sirket' ? 'Tüzel Kişi' : 'Gerçek Kişi'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{formatPercent(row.share_ratio ?? row.hisse_orani ?? row.current_share_ratio)}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{formatPercent(row.voting_ratio ?? row.current_voting_ratio)}</td>
                    <td className="px-3 py-2"><StatusPill status={row.is_deleted ? 'Pasif' : row.status || 'Aktif'} /></td>
                  </>
                ) : isStakeholders ? (
                  <>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{row.display_name || row.ad_unvan || '-'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.stakeholder_type || row.paydas_turu || '-'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.relationship_type || row.iliski_turu || '-'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.priority || row.oncelik || '-'}</td>
                    <td className="px-3 py-2"><StatusPill status={row.is_deleted ? 'Pasif' : row.status || 'Aktif'} /></td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{row.display_name || row.ad_soyad || '-'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.person_kind === 'tuzel_kisi' ? 'Tüzel Kişi' : 'Gerçek Kişi'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{formatAuthorityType(getRepresentativePrimaryAuthority(row))}</td>
                    <td className="px-3 py-2"><StatusPill status={row.is_deleted ? 'Pasif' : row.status || 'Aktif'} /></td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const isActive = status === 'Aktif'

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
      {status}
    </span>
  )
}

function formatPercent(value: unknown) {
  if (value === '' || value === null || value === undefined) return '-'
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return `%${number.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`
}

function formatAuthorityType(value?: string) {
  const labels: Record<string, string> = {
    imza_yetkilisi: 'İmza Yetkilisi',
    banka_yetkilisi: 'Banka Yetkilisi',
    gib_yetkilisi: 'GİB Yetkilisi',
    sgk_yetkilisi: 'SGK Yetkilisi',
    sozlesme_yetkilisi: 'Sözleşme Yetkilisi',
    satinalma_onay_yetkilisi: 'Satınalma Onay Yetkilisi',
    odeme_onay_yetkilisi: 'Ödeme Onay Yetkilisi',
    mesul_mudur: 'Mesul Müdür',
    kanuni_temsilci: 'Kanuni Temsilci',
  }

  return value ? labels[value] || value : '-'
}

function getRepresentativePrimaryAuthority(row: Record<string, any>) {
  const candidates = [
    row.gorev,
    row.primary_authority_type,
    Array.isArray(row.authority_types) ? row.authority_types[0] : null,
    row.yetki_turu,
  ]
  return candidates.map(value => String(value || '').trim()).find(Boolean)
}

function formatSourceType(value?: string) {
  const labels: Record<string, string> = {
    calisan: 'Çalışan',
    ortak: 'Ortak',
    yonetim_kurulu_uyesi: 'Yönetim Kurulu Üyesi',
    dis_kisi: 'Dış Kişi',
    cari: 'Cari',
    paydas: 'Paydaş',
    ortak_sirket: 'Ortak Şirket',
  }

  return value ? labels[value] || value : '-'
}

function normalizeCompanyForForm(company: Sirket) {
  return {
    ...company,
    is_deleted: !!company.is_deleted,
    ortaklar: (company.ortaklar || []).map((partner: any) => {
      const parts = String(partner.ortak_adi || '').trim().split(/\s+/)
      return {
        ...partner,
        owner_kind: partner.owner_kind || (partner.ortak_tipi === 'sirket' ? 'tuzel_kisi' : 'gercek_kisi'),
        source_type: partner.source_type || (partner.ortak_tipi === 'sirket' ? 'harici_sirket' : 'harici_kisi'),
        source_id: partner.source_id || partner.id,
        display_name: partner.display_name || partner.ortak_adi || '',
        identity_number: partner.identity_number || partner.tckn_vkn || '',
        share_ratio: partner.share_ratio ?? partner.hisse_orani ?? partner.current_share_ratio ?? '',
        voting_ratio: partner.voting_ratio ?? partner.current_voting_ratio ?? '',
        profit_ratio: partner.profit_ratio ?? partner.current_profit_ratio ?? '',
        has_representation_right: partner.has_representation_right ?? !!partner.imza_yetkisi,
        status: partner.status || 'Aktif',
        history: partner.history || [],
        ad: partner.ad || parts.slice(0, -1).join(' ') || partner.ortak_adi || '',
        soyad: partner.soyad || (parts.length > 1 ? parts.at(-1) : ''),
        ortak_tipi: partner.ortak_tipi || 'kisi',
        tckn_vkn: partner.tckn_vkn || '',
        hisse_orani: partner.hisse_orani || '',
        imza_yetkisi: !!partner.imza_yetkisi,
      }
    }),
    temsilciler: (company.temsilciler || []).map((representative: any) => ({
      ...representative,
      authority_types: representative.authority_types || (representative.yetki_turu ? [representative.yetki_turu] : []),
      primary_authority_type: getRepresentativePrimaryAuthority(representative),
      person_kind: representative.person_kind || 'gercek_kisi',
      source_type: representative.source_type || 'dis_kisi',
      source_id: representative.source_id || representative.id,
      display_name: representative.display_name || representative.ad_soyad || '',
      status: representative.status || 'Aktif',
      history: representative.history || [],
    })),
    paydaslar: ((company as any).paydaslar || []).map((stakeholder: any) => ({
      ...stakeholder,
      display_name: stakeholder.display_name || stakeholder.ad_unvan || '',
      stakeholder_type: stakeholder.stakeholder_type === 'tuzel_kisi' ? 'Tüzel Kişi' : stakeholder.stakeholder_type === 'gercek_kisi' ? 'Gerçek Kişi' : stakeholder.stakeholder_type || stakeholder.paydas_turu || '-',
      relationship_type: stakeholder.relationship_type || stakeholder.category || stakeholder.iliski_turu || '-',
      priority: stakeholder.priority || stakeholder.priority_level || stakeholder.oncelik || '-',
      status: stakeholder.status || 'Aktif',
      history: stakeholder.history || [],
    })),
  }
}
