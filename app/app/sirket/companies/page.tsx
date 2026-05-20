'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Archive, BriefcaseBusiness, Building2, CheckCircle2, CircleDot, FileText, History, Landmark, PlayCircle, Settings, ShieldAlert, Users } from 'lucide-react'
import { useSirketler } from '@/hooks/useSirketler'
import { EntityForm, FormField, FormMode, FormTab } from '@/components/ui/EntityForm'
import { CompanyLifecycleWizard, type CompanyLifecycleWizardType } from '@/components/ui/CompanyLifecycleWizard'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, ColumnDef, SortConfig, WidgetDef } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import type { AnyDashboardWidgetConfig } from '@/components/dashboard/dashboard.types'
import { CompanyNaceCodesSection } from '@/components/modules/sirket/CompanyPublicTab'
import { formatPhoneInput, normalizeEmailInput } from '@/lib/utils'
import { createFormModeState, mapPageStateToFormMode } from '@/lib/forms/formModeEngine'
import { createProgressiveFormLoadStages } from '@/lib/forms/progressiveFormLoading'
import { invalidateEntityDetailCache, readEntityDetailCache, writeEntityDetailCache } from '@/lib/forms/entityDetailCache'
import { createLegalEntityMasterTabs } from '@/lib/identity/legalEntityFormSections'
import { useModules } from '@/lib/security/moduleStore'
import { usePermissions } from '@/lib/security/permissionStore'
import { PERMISSIONS } from '@/packages/shared/src'
import { companyService } from '@/lib/services/companyService'
import type { CompanyLifecycleStatus, Sirket } from '@/types/sirket'

type PageState = 'list' | 'create' | 'view' | 'edit'
type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }
type SaveError = Error & { toast?: ToastState; fieldErrors?: Record<string, string> }
type SirketTableRow = Sirket & { adres_ozet: string; logo_url: string; lifecycle_status: CompanyLifecycleStatus }
type TaxOfficeOption = { value: string; label: string }
type TaxOfficeReference = { code?: string | null; name?: string | null; province?: string | null; district?: string | null }
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
const COMPANY_DETAIL_CACHE_NAMESPACE = 'companies:phased-v2'

function waitForStagePaint() {
  return new Promise<void>(resolve => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
      return
    }
    setTimeout(resolve, 0)
  })
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
  trade_name: 'Ticari Unvan',
  short_name: 'Kısa Ünvan',
  tax_number: 'VKN',
  tax_office: 'Vergi Dairesi',
  mersis_number: 'MERSİS No',
  trade_registry_number: 'Ticaret Sicil No',
  foundation_date: 'Kuruluş Tarihi',
  company_type: 'Şirket Türü',
  country: 'Ülke',
  city: 'İl',
  district: 'İlçe',
  address: 'Adres',
  phone: 'Telefon',
  email: 'E-posta',
  website: 'Web Sitesi',
  legal_entity: 'Tüzel Kişilik',
  electronic_notification_address: 'Elektronik Tebligat Adresi',
  trade_registry_office: 'Ticaret Sicili Müdürlüğü',
  company_code: 'Şirket Kodu',
  e_invoice_taxpayer: 'E-Fatura Mükellefi',
  e_archive_taxpayer: 'E-Arşiv Mükellefi',
  e_waybill_taxpayer: 'E-İrsaliye Mükellefi',
  sgk_workplace_registry_no: 'SGK İşyeri Sicil No',
  sgk_province: 'SGK İl',
  sgk_branch: 'SGK Şube',
  risk_class: 'Tehlike Sınıfı',
  default_currency: 'Varsayılan Para Birimi',
  default_language: 'Varsayılan Dil',
  time_zone: 'Zaman Dilimi',
  fiscal_year_start: 'Mali Yıl Başlangıcı',
}

const columns: ColumnDef[] = [
  { key: 'logo_url', label: 'Logo', type: 'image', width: 64, fixedWidth: true, category: 'Kimlik' },
  { key: 'short_name', label: 'Kısa Ünvan', type: 'text', width: 200, sortable: true, category: 'Kimlik' },
  { key: 'trade_name', label: 'Ticari Unvan', type: 'text', width: 280, sortable: true, category: 'Kimlik' },
  { key: 'tax_number', label: 'VKN', type: 'text', width: 120, sortable: true, category: 'Kimlik' },
  { key: 'tax_office', label: 'Vergi Dairesi', type: 'text', width: 140, sortable: true, category: 'Vergi' },
  { key: 'company_type', label: 'Şirket Türü', type: 'enum', width: 110, sortable: true, category: 'Tescil', render: (value) => COMPANY_TYPE_SHORT_LABELS[String(value)] || value || '-' },
  { key: 'adres_ozet', label: 'Adres', type: 'text', width: 250, category: 'İletişim' },
  { key: 'phone', label: 'Telefon', type: 'text', width: 150, category: 'İletişim' },
  { key: 'email', label: 'E-posta', type: 'text', width: 200, category: 'İletişim' },
  { key: 'lifecycle_status', label: 'Durum', type: 'enum', width: 160, sortable: true, category: 'Durum', render: (_value, row) => <LifecycleStatusBadge status={getCompanyLifecycleStatus(row)} /> },
  { key: 'mersis_number', label: FIELD_LABELS.mersis_number, type: 'text', width: 150, sortable: true, category: 'Tescil', required: false, visible: false },
  { key: 'trade_registry_number', label: FIELD_LABELS.trade_registry_number, type: 'text', width: 150, sortable: true, category: 'Tescil', required: false, visible: false },
  { key: 'foundation_date', label: FIELD_LABELS.foundation_date, type: 'date', width: 130, sortable: true, category: 'Tescil', required: false, visible: false },
  { key: 'electronic_notification_address', label: FIELD_LABELS.electronic_notification_address, type: 'text', width: 190, sortable: true, category: 'Tescil', required: false, visible: false },
  { key: 'trade_registry_office', label: FIELD_LABELS.trade_registry_office, type: 'text', width: 190, sortable: true, category: 'Tescil', required: false, visible: false },
  { key: 'company_code', label: FIELD_LABELS.company_code, type: 'text', width: 130, sortable: true, category: 'Tescil', required: false, visible: false },
  { key: 'country', label: FIELD_LABELS.country, type: 'text', width: 120, sortable: true, category: 'İletişim', required: false, visible: false },
  { key: 'city', label: FIELD_LABELS.city, type: 'text', width: 120, sortable: true, category: 'İletişim', required: false, visible: false },
  { key: 'district', label: FIELD_LABELS.district, type: 'text', width: 120, sortable: true, category: 'İletişim', required: false, visible: false },
  { key: 'address', label: FIELD_LABELS.address, type: 'text', width: 260, category: 'İletişim', required: false, visible: false },
  { key: 'website', label: FIELD_LABELS.website, type: 'text', width: 180, category: 'İletişim', required: false, visible: false },
  { key: 'e_invoice_taxpayer', label: FIELD_LABELS.e_invoice_taxpayer, type: 'boolean', width: 140, sortable: true, category: 'Vergi', required: false, visible: false },
  { key: 'e_archive_taxpayer', label: FIELD_LABELS.e_archive_taxpayer, type: 'boolean', width: 140, sortable: true, category: 'Vergi', required: false, visible: false },
  { key: 'e_waybill_taxpayer', label: FIELD_LABELS.e_waybill_taxpayer, type: 'boolean', width: 140, sortable: true, category: 'Vergi', required: false, visible: false },
  { key: 'sgk_workplace_registry_no', label: FIELD_LABELS.sgk_workplace_registry_no, type: 'text', width: 170, sortable: true, category: 'Vergi', required: false, visible: false },
  { key: 'sgk_province', label: FIELD_LABELS.sgk_province, type: 'text', width: 120, sortable: true, category: 'Vergi', required: false, visible: false },
  { key: 'sgk_branch', label: FIELD_LABELS.sgk_branch, type: 'text', width: 130, sortable: true, category: 'Vergi', required: false, visible: false },
  { key: 'risk_class', label: FIELD_LABELS.risk_class, type: 'enum', width: 140, sortable: true, category: 'Vergi', required: false, visible: false },
  { key: 'default_currency', label: FIELD_LABELS.default_currency, type: 'text', width: 150, sortable: true, category: 'Ayarlar', required: false, visible: false },
  { key: 'default_language', label: FIELD_LABELS.default_language, type: 'text', width: 130, sortable: true, category: 'Ayarlar', required: false, visible: false },
  { key: 'time_zone', label: FIELD_LABELS.time_zone, type: 'text', width: 170, sortable: true, category: 'Ayarlar', required: false, visible: false },
  { key: 'fiscal_year_start', label: FIELD_LABELS.fiscal_year_start, type: 'number', width: 150, sortable: true, category: 'Ayarlar', required: false, visible: false },
]

const heroFields: FormField[] = [
  { name: 'short_name', label: 'Kısa Ünvan', type: 'text' },
  { name: 'trade_name', label: 'Ticari Unvan', type: 'text', required: true, colSpan: 2 },
  { name: 'tax_office', label: 'Vergi Dairesi', type: 'select', required: true, searchable: true },
  {
    name: 'company_type',
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
  { name: 'phone', label: 'Telefon', type: 'tel' },
  { name: 'email', label: 'E-posta', type: 'email' },
  { name: 'website', label: 'Web Sitesi', type: 'text' },
  { name: 'country', label: 'Ülke', type: 'select', compact: true },
  { name: 'city', label: 'İl', type: 'text', required: true, compact: true },
  { name: 'district', label: 'İlçe', type: 'text', required: true, compact: true },
  { name: 'address', label: 'Adres', type: 'textarea', required: true, colSpan: 3 },
]

const tabs: FormTab[] = [
  {
    id: 'partners',
    label: 'Ortaklar',
    icon: <Users size={16} />,
    fields: [
      {
        name: 'partners',
        label: 'Ortaklar',
        type: 'custom',
        colSpan: 3,
      },
    ],
  },
  {
    id: 'representatives',
    label: 'Temsilciler',
    icon: <BriefcaseBusiness size={16} />,
    fields: [
      {
        name: 'representatives',
        label: 'Temsilciler',
        type: 'custom',
        colSpan: 3,
      },
    ],
  },
  {
    id: 'stakeholders',
    label: 'Paydaşlar',
    icon: <Users size={16} />,
    fields: [
      {
        name: 'stakeholders',
        label: 'Paydaşlar',
        type: 'custom',
        colSpan: 3,
      },
    ],
  },
  {
    id: 'tescil',
    label: 'Tescil',
    icon: <FileText size={16} />,
    fields: [
      { name: 'mersis_number', label: 'MERSİS No', type: 'text' },
      { name: 'trade_registry_number', label: 'Ticaret Sicil No', type: 'text' },
      { name: 'foundation_date', label: 'Kuruluş Tarihi', type: 'date' },
      { name: 'electronic_notification_address', label: 'Elektronik Tebligat Adresi', type: 'text', maxLength: 17, inputMode: 'numeric', pattern: '\\d{5}-\\d{5}-\\d{5}', placeholder: '11111-22222-33333' },
      { name: 'trade_registry_office', label: 'Ticaret Sicili Müdürlüğü', type: 'select', searchable: true },
      { name: 'company_code', label: 'Şirket Kodu', type: 'text' },
    ],
  },
  {
    id: 'vergi',
    label: 'Kamu',
    icon: <Landmark size={16} />,
    fields: [
      { name: 'e_invoice_taxpayer', label: 'E-Fatura Mükellefi', type: 'checkbox' },
      { name: 'e_archive_taxpayer', label: 'E-Arşiv Mükellefi', type: 'checkbox' },
      { name: 'e_waybill_taxpayer', label: 'E-İrsaliye Mükellefi', type: 'checkbox' },
      { name: 'sgk_workplace_registry_no', label: 'SGK İşyeri Sicil No', type: 'text', maxLength: 26, inputMode: 'numeric', placeholder: '26 hane: M + 4 işkolu + 2 eski şube + 2 yeni şube + 7 sıra + 3 city + 2 cityçe + 2 kontrol + 3 aracı' },
      { name: 'sgk_province', label: 'SGK İl', type: 'text', placeholder: 'SGK sicil no girilince otomatik dolar' },
      { name: 'sgk_branch', label: 'SGK Şube', type: 'text', placeholder: 'SGK sicil no girilince otomatik dolar' },
      { name: 'risk_class', label: 'Tehlike Sınıfı', type: 'custom', colSpan: 3 },
      { name: 'company_nace_codes', label: 'NACE / Faaliyet Kodları', type: 'custom', colSpan: 3 },
    ],
  },
  {
    id: 'ayarlar',
    label: 'Ayarlar',
    icon: <Settings size={16} />,
    fields: [
      {
        name: 'default_currency',
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
        name: 'default_language',
        label: 'Varsayılan Dil',
        type: 'select',
        defaultValue: 'tr',
        options: [
          { value: 'tr', label: 'Türkçe' },
          { value: 'en', label: 'English' },
          { value: 'de', label: 'Deutsch' },
        ],
      },
      { name: 'time_zone', label: 'Zaman Dilimi', type: 'text', defaultValue: 'Europe/Istanbul' },
      { name: 'fiscal_year_start', label: 'Mali Yıl Başlangıcı', type: 'number', defaultValue: 1 },
    ],
  },
]

const getFieldLabel = (field: string) => FIELD_LABELS[field] || field
const formatFieldList = (fields: string[]) => fields.map(getFieldLabel).join(', ')

function taxOfficeOptionsFromPayload(payload: unknown): TaxOfficeOption[] {
  const offices = Array.isArray((payload as { offices?: unknown[] } | null)?.offices)
    ? ((payload as { offices: TaxOfficeReference[] }).offices)
    : []
  const byName = new Map<string, TaxOfficeOption>()

  offices.forEach(office => {
    const name = String(office?.name || '').trim()
    if (!name || byName.has(name)) return
    const location = [office.province, office.district].map(value => String(value || '').trim()).filter(Boolean).join('/')
    const code = String(office.code || '').trim()
    const label = [code ? `${code} - ${name}` : name, location ? `(${location})` : ''].filter(Boolean).join(' ')
    byName.set(name, { value: name, label })
  })

  return Array.from(byName.values()).sort((a, b) => a.label.localeCompare(b.label, 'tr'))
}

export default function SirketlerPage() {
  const [includePassive, setIncludePassive] = useState(false)
  const [listQuery, setListQuery] = useState({ page: 1, pageSize: 10, search: '', sort: 'short_name', direction: 'asc' as 'asc' | 'desc' })
  const { data: companies, meta: listMeta, loading, error: listError, yenile } = useSirketler({ includePassive, ...listQuery })
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
  const [lifecycleWizard, setLifecycleWizard] = useState<CompanyLifecycleWizardType | null>(null)
  const detailRequestRef = useRef(0)

  useEffect(() => {
    if (pageState === 'list' || publicReferenceOptionsLoaded) return
    let cancelled = false

    fetch('/api/reference/tax-offices')
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        if (cancelled || !Array.isArray(payload?.offices)) return
        setTaxOfficeOptions(taxOfficeOptionsFromPayload(payload))
      })
      .catch(() => {
        if (!cancelled) setTaxOfficeOptions([])
      })
      .finally(() => {
        if (!cancelled) setPublicReferenceOptionsLoaded(true)
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
    return () => {
      cancelled = true
    }
  }, [pageState, publicReferenceOptionsLoaded])

  const configuredHeroFields = [
    {
      name: 'lifecycle_status_badge',
      label: 'Durum',
      type: 'custom',
      render: () => <LifecycleStatusBadge status={pageState === 'create' ? 'draft' : getCompanyLifecycleStatus(selectedSirket)} />,
    } as FormField,
    ...heroFields.map(field =>
      field.name === 'tax_office'
        ? { ...field, options: taxOfficeOptions }
        : field
    ),
  ]

  const lifecycleTab: FormTab = {
    id: 'lifecycle',
    label: 'Yaşam Döngüsü',
    icon: <CircleDot size={16} />,
    fields: [
      {
        name: 'company_lifecycle_summary',
        label: 'Yaşam Döngüsü',
        type: 'custom',
        colSpan: 3,
        render: () => <CompanyLifecycleSummary data={selectedSirket} />,
      },
    ],
  }

  const configuredTabs = [
    ...createLegalEntityMasterTabs({
      addressField: 'address',
      countryField: 'country',
      cityField: 'city',
      districtField: 'district',
      phoneField: 'phone',
      emailField: 'email',
      websiteField: 'website',
    }).filter(tab => tab.id !== 'organization_iletisim'),
    ...(pageState !== 'create' ? [lifecycleTab] : []),
    ...tabs,
  ].map(tab => ({
    ...tab,
    fields: tab.fields.map(field =>
      field.name === 'trade_registry_office' && tradeRegistryOfficeOptions.length > 0
        ? { ...field, options: tradeRegistryOfficeOptions }
        : field
    ),
  }))

  const tableData: SirketTableRow[] = useMemo(() => (companies || []).map(sirket => ({
    ...sirket,
    is_deleted: !!sirket.is_deleted,
    lifecycle_status: getCompanyLifecycleStatus(sirket),
    adres_ozet: [sirket.district, sirket.city].filter(Boolean).join(', '),
    logo_url: extractLogoUrl((sirket as any).hero_images),
  })), [companies])

  const handleListLifecycleAction = (row: SirketTableRow, type: CompanyLifecycleWizardType) => {
    setFormError(null)
    setFieldErrors({})
    setDetailSections(emptyDetailSectionState)
    setSelectedSirket(normalizeCompanyForForm(row as Sirket))
    setPageState('view')
    setLifecycleWizard(type)
  }

  const configuredColumns: ColumnDef[] = useMemo(() => [
    ...columns,
    {
      key: 'lifecycle_actions',
      label: 'İşlem',
      type: 'actions',
      width: 220,
      fixedWidth: true,
      hideable: false,
      category: 'İşlem',
      render: (_value, row: SirketTableRow) => (
        <CompanyListLifecycleActions
          row={row}
          canOpen={can(PERMISSIONS.companies.openingStart)}
          canLiquidate={can(PERMISSIONS.companies.liquidationStart)}
          canUpdateLiquidation={can(PERMISSIONS.companies.liquidationUpdate)}
          canDeregister={can(PERMISSIONS.companies.deregistrationStart)}
          onAction={handleListLifecycleAction}
        />
      ),
    },
  ], [can])

  const widgets: WidgetDef<SirketTableRow>[] = useMemo(() => [
    { key: 'total', label: 'Toplam Şirket', render: () => tableData.length },
    { key: 'draft', label: 'Taslak', render: () => tableData.filter(row => getCompanyLifecycleStatus(row) === 'draft').length },
    { key: 'active', label: 'Aktif', render: () => tableData.filter(row => getCompanyLifecycleStatus(row) === 'active').length },
    { key: 'liquidation', label: 'Tasfiye', render: () => tableData.filter(row => getCompanyLifecycleStatus(row) === 'liquidation').length },
    { key: 'closed', label: 'Kapanmış', render: () => tableData.filter(row => getCompanyLifecycleStatus(row) === 'deregistered').length },
  ], [tableData])

  const moduleEnabled = isEnabled('companies')
  const moduleWritable = isWritable('companies')
  const formAccess = createFormModeState(mapPageStateToFormMode(pageState), {
    canView: moduleEnabled && can(PERMISSIONS.companies.view),
    canInsert: moduleWritable && can(PERMISSIONS.companies.insert),
    canEdit: moduleWritable && can(PERMISSIONS.companies.edit),
    canApprove: moduleWritable && can(PERMISSIONS.companies.approve),
  })
  const selectedLifecycleStatus = getCompanyLifecycleStatus(selectedSirket)
  const isSelectedLiquidation = selectedLifecycleStatus === 'liquidation'
  const isSelectedDeregistered = selectedLifecycleStatus === 'deregistered'
  const canEditSelectedProfile = !isSelectedLiquidation && !isSelectedDeregistered
  const formMode: FormMode = pageState === 'create'
    ? 'create'
    : pageState === 'edit' && formAccess.canSave && canEditSelectedProfile
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
    const cached = readEntityDetailCache<Sirket, DetailSectionState>(COMPANY_DETAIL_CACHE_NAMESPACE, row.id)

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
      writeEntityDetailCache(COMPANY_DETAIL_CACHE_NAMESPACE, row.id, mergedData, { meta: { ...heroSections, mediaLoading: false } })
      await waitForStagePaint()

      try {
        const mediaResult = await companyService.detailSection(row.id, 'media')
        if (!mediaResult.data) throw new Error('Sirket fotograf ve belge bilgileri yuklenemedi')
        applySection(mediaResult.data)
        if (detailRequestRef.current !== requestId) return
        setDetailSections(previous => {
          const next = { ...previous, mediaLoading: false, mediaReady: true, detailsLoading: true }
          writeEntityDetailCache(COMPANY_DETAIL_CACHE_NAMESPACE, row.id, mergedData, { meta: { ...next, detailsLoading: false } })
          return next
        })
        await waitForStagePaint()
      } catch {
        if (detailRequestRef.current !== requestId) return
        setDetailSections(previous => ({ ...previous, mediaLoading: false, mediaError: true, detailsLoading: true }))
        await waitForStagePaint()
      }

      const detailsResult = await companyService.detailSection(row.id, 'details')
      if (!detailsResult.data) throw new Error('Sirket detay alanlari yuklenemedi')
      applySection(detailsResult.data)
      if (detailRequestRef.current !== requestId) return
      setDetailSections(previous => {
        const next = { ...previous, detailsLoading: false, detailsReady: true }
        writeEntityDetailCache(COMPANY_DETAIL_CACHE_NAMESPACE, row.id, mergedData, { meta: next })
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
    setLifecycleWizard(null)
    setFormError(null)
    setFieldErrors({})
    setDetailSections(emptyDetailSectionState)
  }

  const normalizePayload = (raw: Record<string, any>) => {
    const payload: Record<string, any> = {}

    Object.entries(raw).forEach(([key, value]) => {
      if (['partners', 'representatives', 'stakeholders', 'documents', 'logos', 'lifecycle_status_badge', 'company_lifecycle_summary', 'record_status', 'company_status', 'opening_details', 'liquidation_details', 'deregistration_details', 'lifecycle_events', 'lifecycle_last_event'].includes(key)) return
      if (value === '' || value === null || value === undefined) return
      if (pageState !== 'create' && ['hero_documents', 'hero_images'].includes(key) && selectedSirket) {
        if (JSON.stringify(value) === JSON.stringify((selectedSirket as any)[key] || [])) return
      }
      payload[key] = value
    })

    if (payload.phone) payload.phone = formatPhoneInput(String(payload.phone))
    if (payload.email) payload.email = normalizeEmailInput(String(payload.email))
    if (payload.tax_number) payload.tax_number = String(payload.tax_number).replace(/\D/g, '').slice(0, 10)
    if (payload.electronic_notification_address) {
      const digits = String(payload.electronic_notification_address).replace(/\D/g, '').slice(0, 15)
      payload.electronic_notification_address = digits.replace(/(\d{5})(?=\d)/g, '$1-')
    }
    if (payload.fiscal_year_start) payload.fiscal_year_start = Number(payload.fiscal_year_start)
    if (pageState === 'create') payload.is_deleted = false
    if (pageState === 'create') {
      payload.country = payload.country || 'Türkiye'
      payload.default_currency = payload.default_currency || 'TRY'
      payload.default_language = payload.default_language || 'tr'
      payload.time_zone = payload.time_zone || 'Europe/Istanbul'
      payload.fiscal_year_start = payload.fiscal_year_start || 1
    }

    return payload
  }

  const handleSave = async (data: Record<string, any>, mode: FormMode) => {
    setSaving(true)
    setFormError(null)
    setFieldErrors({})

    try {
      const payload = normalizePayload(data)
      const result = mode === 'create'
        ? await companyService.create(payload)
        : await companyService.update(selectedSirket?.id || '', payload)
      if (mode === 'create') {
        invalidateEntityDetailCache(COMPANY_DETAIL_CACHE_NAMESPACE)
      } else {
        invalidateEntityDetailCache(COMPANY_DETAIL_CACHE_NAMESPACE, selectedSirket?.id)
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
      const saveError = normalizeSaveError(error)
      setFormError(saveError.message)
      setFieldErrors(saveError.fieldErrors || {})
      setToast(saveError.toast || { type: 'error', title: 'Kayıt Başarısız', message: saveError.message })
      throw saveError
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedSirket) return

    const isDraft = getCompanyLifecycleStatus(selectedSirket) === 'draft'
    setDeleting(true)
    try {
      await companyService.delete(selectedSirket.id)
      invalidateEntityDetailCache(COMPANY_DETAIL_CACHE_NAMESPACE, selectedSirket.id)

      setToast({ type: 'success', title: 'Kayıt Başarılı', message: isDraft ? 'Sirket taslak kaydi kalici olarak silindi' : 'Şirket kaydı pasife çekildi' })
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
      const result = await companyService.update(selectedSirket.id, { is_deleted: false })
      invalidateEntityDetailCache(COMPANY_DETAIL_CACHE_NAMESPACE, selectedSirket.id)
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

  const handleLifecycleComplete = async (companyUpdate?: Partial<Sirket>) => {
    const nextCompany = normalizeCompanyForForm({
      ...(selectedSirket || {}),
      ...(companyUpdate || {}),
    } as Sirket)
    if (selectedSirket?.id) invalidateEntityDetailCache(COMPANY_DETAIL_CACHE_NAMESPACE, selectedSirket.id)
    setSelectedSirket(nextCompany)
    setLifecycleWizard(null)
    setPageState('view')
    await yenile()
    const status = getCompanyLifecycleStatus(nextCompany)
    setToast({
      type: 'success',
      title: 'Yaşam Döngüsü Güncellendi',
      message: `Şirket durumu ${getCompanyLifecycleLabel(status)} olarak güncellendi`,
    })
  }

  const openLifecycleWizard = (type: CompanyLifecycleWizardType) => {
    if (!selectedSirket?.id) return
    setLifecycleWizard(type)
  }

  const renderLifecycleActions = () => {
    if (!selectedSirket?.id || pageState === 'create') return null
    const status = getCompanyLifecycleStatus(selectedSirket)
    const actions: Array<{ key: string; label: string; icon: ReactNode; onClick: () => void; visible: boolean }> = [
      {
        key: 'opening',
        label: 'Şirket Açılışı Yap',
        icon: <PlayCircle size={16} />,
        onClick: () => openLifecycleWizard('opening'),
        visible: status === 'draft' && can(PERMISSIONS.companies.openingStart),
      },
      {
        key: 'liquidation',
        label: status === 'liquidation' ? 'Tasfiye Bilgilerini Güncelle' : 'Tasfiye Başlat',
        icon: <ShieldAlert size={16} />,
        onClick: () => openLifecycleWizard('liquidation'),
        visible: (status === 'active' && can(PERMISSIONS.companies.liquidationStart))
          || (status === 'liquidation' && can(PERMISSIONS.companies.liquidationUpdate)),
      },
      {
        key: 'deregistration',
        label: 'Terkin Yap',
        icon: <Archive size={16} />,
        onClick: () => openLifecycleWizard('deregistration'),
        visible: status === 'liquidation' && can(PERMISSIONS.companies.deregistrationStart),
      },
      {
        key: 'history',
        label: 'Geçmiş',
        icon: <History size={16} />,
        onClick: () => setToast({ type: 'success', title: 'Geçmiş', message: 'Yaşam döngüsü geçmişi özet kartında görüntüleniyor.' }),
        visible: status === 'deregistered' && can(PERMISSIONS.companies.lifecycleView),
      },
    ]
    const visibleActions = actions.filter(action => action.visible)
    if (!visibleActions.length) return null
    return (
      <div className="flex flex-wrap items-center gap-2">
        {visibleActions.map(action => (
          <button
            key={action.key}
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200 dark:hover:bg-blue-950/50"
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    )
  }

  const normalizeSaveError = (error: any): SaveError => {
    if (error?.fieldErrors || error?.toast) return error as SaveError

    const body = error?.details && typeof error.details === 'object'
      ? error.details as Record<string, any>
      : {}
    const code = body.code || error?.code || 'SAVE_FAILED'
    const validationDetails = body.details && typeof body.details === 'object'
      ? body.details as Record<string, any>
      : body
    const zodFieldErrors = validationDetails.fieldErrors && typeof validationDetails.fieldErrors === 'object'
      ? validationDetails.fieldErrors as Record<string, unknown>
      : {}
    const fields = Object.keys(zodFieldErrors)

    if (code === 'VALIDATION_FAILED' && fields.length > 0) {
      const fieldList = formatFieldList(fields)
      const saveError = new Error(`Eksik veya hatalı alan [${fieldList}]`) as SaveError
      saveError.fieldErrors = Object.fromEntries(
        fields.map(field => [field, validationMessageForField(field, zodFieldErrors[field])])
      )
      saveError.toast = { type: 'warning', title: 'Alanları Kontrol Et', message: fieldList }
      return saveError
    }

    const message = `${body.error || error?.message || 'Kayıt başarısız'} [${code}]`
    const saveError = new Error(message) as SaveError
    saveError.toast = { type: 'error', title: 'Kayıt Başarısız', message }
    return saveError
  }

  const validationMessageForField = (field: string, messages: unknown) => {
    const firstMessage = (Array.isArray(messages)
      ? messages.find((message): message is string => typeof message === 'string' && message.trim().length > 0)
      : typeof messages === 'string'
        ? messages
        : '') || ''
    const label = getFieldLabel(field)
    const normalized = firstMessage.toLowerCase()

    if (!firstMessage || normalized.includes('required') || normalized.includes('received undefined')) {
      return `${label} zorunludur`
    }
    if (normalized.includes('invalid enum')) return `${label} seçimi geçersiz`
    if (normalized.includes('invalid input')) return `${label} geçersiz`

    return firstMessage
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
        title: pageState === 'create' ? 'Yeni Şirket' : selectedSirket?.short_name || selectedSirket?.trade_name || 'Şirket Detayı',
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
      sort: sort?.key || 'short_name',
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
            columns={configuredColumns}
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
            storageKey="companies-table"
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
              roleTable: 'companies',
              roleDuplicateCheck: 'organization_id + active',
            }}
            heroFields={configuredHeroFields.map(withFieldHistory)}
            tabs={configuredTabs.map(tab => ({
              ...tab,
              fields: tab.fields.map(field => {
                const nextField = withFieldHistory(field)
                if (nextField.name === 'risk_class') {
                  return {
                    ...nextField,
                    render: () => {
                      const rows = Array.isArray((selectedSirket as any)?.company_nace_codes) ? (selectedSirket as any).company_nace_codes : []
                      const primary = rows.find((row: any) => row?.is_primary && row?.status !== 'passive')
                      const hazardClass = formatHazardClass(primary?.nace_code?.hazard_class || (selectedSirket as any)?.public_sgk?.risk_class || (selectedSirket as any)?.risk_class) || 'Birincil NACE seçilmemiş'

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

                if (nextField.name === 'partners') {
                  return {
                    ...nextField,
                    render: ({ value }) => <RelatedSummaryTable type="partners" rows={Array.isArray(value) ? value : []} />,
                  }
                }

                if (nextField.name === 'stakeholders') {
                  return {
                    ...nextField,
                    render: ({ value }) => <RelatedSummaryTable type="stakeholders" rows={Array.isArray(value) ? value : []} />,
                  }
                }

                if (nextField.name !== 'representatives') return nextField

                return {
                  ...nextField,
                  render: ({ value }) => <RelatedSummaryTable type="representatives" rows={Array.isArray(value) ? value : []} />,
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
            onDelete={selectedSirket && getCompanyLifecycleStatus(selectedSirket) === 'draft' ? handleDelete : undefined}
            onModeChange={(mode) => setPageState(mode === 'edit' && !formAccess.showEdit ? 'view' : mode)}
            onIdentityGateOpenExistingRole={async (roleRecord) => {
              await handleRowClick(roleRecord as SirketTableRow)
              setPageState('edit')
            }}
            onIdentityGateCancelDuplicate={handleBackToList}
            canCreate={formAccess.showAdd}
            canEdit={formAccess.showEdit && canEditSelectedProfile}
            additionalActions={renderLifecycleActions()}
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
                { id: 'ticaret_sicil_gazetesi', title: 'Ticaret Sicil Gazetesi', required: true },
                { id: 'sicil_tasdiknamesi', title: 'Sicil Tasdiknamesi', required: true },
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

      {lifecycleWizard && selectedSirket && (
        <CompanyLifecycleWizard
          type={lifecycleWizard}
          company={selectedSirket}
          onClose={() => setLifecycleWizard(null)}
          onComplete={handleLifecycleComplete}
        />
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

function getCompanyLifecycleStatus(company?: Partial<Sirket> | null): CompanyLifecycleStatus {
  const raw = company?.record_status || company?.company_status || (company?.is_deleted ? 'deregistered' : 'active')
  if (raw === 'draft' || raw === 'active' || raw === 'liquidation' || raw === 'deregistered') return raw
  return 'draft'
}

function getCompanyLifecycleLabel(status: CompanyLifecycleStatus) {
  if (status === 'draft') return 'Taslak'
  if (status === 'active') return 'Aktif'
  if (status === 'liquidation') return 'Tasfiye Halinde'
  return 'Terkin Edildi / Kapanmış'
}

function getCompanyLifecycleBadgeClass(status: CompanyLifecycleStatus) {
  if (status === 'draft') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200'
  if (status === 'active') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200'
  if (status === 'liquidation') return 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/70 dark:bg-orange-950/30 dark:text-orange-200'
  return 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
}

function LifecycleStatusBadge({ status }: { status: CompanyLifecycleStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getCompanyLifecycleBadgeClass(status)}`}>
      <CircleDot size={12} />
      Durum: {getCompanyLifecycleLabel(status)}
    </span>
  )
}

function CompanyListLifecycleActions({
  row,
  canOpen,
  canLiquidate,
  canUpdateLiquidation,
  canDeregister,
  onAction,
}: {
  row: SirketTableRow
  canOpen: boolean
  canLiquidate: boolean
  canUpdateLiquidation: boolean
  canDeregister: boolean
  onAction: (row: SirketTableRow, type: CompanyLifecycleWizardType) => void
}) {
  const status = getCompanyLifecycleStatus(row)
  const actionClass = 'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold transition-colors'
  const primaryClass = `${actionClass} border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200`
  const warningClass = `${actionClass} border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-200`
  const closedClass = `${actionClass} border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400`

  if (status === 'draft') {
    return canOpen ? (
      <button type="button" className={primaryClass} onClick={() => onAction(row, 'opening')}>
        <PlayCircle size={14} />
        Şirket Açılışı
      </button>
    ) : <span className={closedClass}>Yetki yok</span>
  }

  if (status === 'active') {
    return canLiquidate ? (
      <button type="button" className={warningClass} onClick={() => onAction(row, 'liquidation')}>
        <ShieldAlert size={14} />
        Tasfiye
      </button>
    ) : <span className={closedClass}>Aktif</span>
  }

  if (status === 'liquidation') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {canUpdateLiquidation && (
          <button type="button" className={warningClass} onClick={() => onAction(row, 'liquidation')}>
            <ShieldAlert size={14} />
            Güncelle
          </button>
        )}
        {canDeregister && (
          <button type="button" className={primaryClass} onClick={() => onAction(row, 'deregistration')}>
            <Archive size={14} />
            Terkin
          </button>
        )}
      </div>
    )
  }

  return (
    <span className={closedClass}>
      <History size={14} />
      Kapanmış
    </span>
  )
}

function CompanyLifecycleSummary({ data }: { data?: Sirket | null }) {
  const status = getCompanyLifecycleStatus(data)
  const opening = (data as any)?.opening_details || {}
  const liquidation = (data as any)?.liquidation_details || {}
  const deregistration = (data as any)?.deregistration_details || {}
  const events = Array.isArray((data as any)?.lifecycle_events) ? (data as any).lifecycle_events : []
  const lastEvent = (data as any)?.lifecycle_last_event || events[0]

  return (
    <div className="col-span-2 space-y-4 lg:col-span-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <LifecycleSummaryCard
          icon={<CircleDot size={16} />}
          title="Yaşam Döngüsü Durumu"
          rows={[
            ['Durum', getCompanyLifecycleLabel(status)],
            ['Son Güncelleme', formatLifecycleDate(data?.updated_at)],
          ]}
        />
        <LifecycleSummaryCard
          icon={<CheckCircle2 size={16} />}
          title="Açılış Bilgileri"
          rows={[
            ['Kuruluş', formatLifecycleDate(opening.foundation_date || data?.foundation_date)],
            ['Tescil', formatLifecycleDate(opening.registration_date)],
            ['Sicil', opening.trade_registry_no || data?.trade_registry_number || '-'],
          ]}
        />
        <LifecycleSummaryCard
          icon={<ShieldAlert size={16} />}
          title="Tasfiye Bilgileri"
          rows={[
            ['Karar', formatLifecycleDate(liquidation.liquidation_decision_date)],
            ['Başlangıç', formatLifecycleDate(liquidation.liquidation_start_date)],
            ['Memur', liquidation.liquidator_display_name || '-'],
          ]}
        />
        <LifecycleSummaryCard
          icon={<Archive size={16} />}
          title="Terkin Bilgileri"
          rows={[
            ['Başvuru', formatLifecycleDate(deregistration.deregistration_application_date)],
            ['Tescil', formatLifecycleDate(deregistration.deregistration_registration_date)],
            ['Referans', deregistration.deregistration_reference_no || '-'],
          ]}
        />
        <LifecycleSummaryCard
          icon={<FileText size={16} />}
          title="Son Yaşam Döngüsü Olayı"
          rows={[
            ['Olay', formatLifecycleEvent(lastEvent?.event_type)],
            ['Tarih', formatLifecycleDate(lastEvent?.event_date || lastEvent?.created_at)],
            ['Yeni Durum', lastEvent?.new_status ? getCompanyLifecycleLabel(getCompanyLifecycleStatus({ record_status: lastEvent.new_status as CompanyLifecycleStatus })) : '-'],
          ]}
        />
      </div>
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
        Açılış, tasfiye ve terkin bilgileri doğrudan form alanı değildir; ilgili wizard kayıtlarından read-only özet olarak gösterilir.
      </div>
    </div>
  )
}

function LifecycleSummaryCard({ icon, title, rows }: { icon: ReactNode; title: string; rows: Array<[string, any]> }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        {icon}
        {title}
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3">
            <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className="text-right font-medium text-gray-900 dark:text-gray-100">{value || '-'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function formatLifecycleDate(value: unknown) {
  if (!value) return '-'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('tr-TR')
}

function formatLifecycleEvent(value: unknown) {
  const event = String(value || '')
  if (!event) return '-'
  const labels: Record<string, string> = {
    company_created_as_draft: 'Şirket taslak olarak oluşturuldu',
    company_opening_started: 'Şirket açılışı başlatıldı',
    company_opening_completed: 'Şirket açılışı tamamlandı',
    company_liquidation_started: 'Tasfiye başlatıldı',
    company_liquidation_updated: 'Tasfiye bilgileri güncellendi',
    company_deregistration_started: 'Terkin başlatıldı',
    company_deregistered: 'Terkin tamamlandı',
    status_changed: 'Durum değişti',
  }
  return labels[event] || event
}

function RelatedSummaryTable({ type, rows }: { type: 'partners' | 'representatives' | 'stakeholders'; rows: any[] }) {
  const isPartners = type === 'partners'
  const isStakeholders = type === 'stakeholders'
  const columnCount = isPartners || isStakeholders ? 5 : 4
  const sourcePage = isPartners ? 'Ortaklar' : isStakeholders ? 'Paydaşlar' : 'Temsilciler'
  const href = isPartners ? '/app/sirket/companies/partners' : isStakeholders ? '/app/sirket/companies/stakeholders' : '/app/sirket/companies/representatives'
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
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{row.display_name || row.partner_name || '-'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.owner_kind === 'organization' || row.partner_type === 'organization' ? 'Tüzel Kişi' : 'Gerçek Kişi'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{formatPercent(row.share_ratio ?? row.share_ratio ?? row.current_share_ratio)}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{formatPercent(row.voting_ratio ?? row.current_voting_ratio)}</td>
                    <td className="px-3 py-2"><StatusPill status={row.is_deleted ? 'Pasif' : row.status || 'Aktif'} /></td>
                  </>
                ) : isStakeholders ? (
                  <>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{row.display_name || '-'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.stakeholder_type || '-'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.relationship_type || '-'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.priority || '-'}</td>
                    <td className="px-3 py-2"><StatusPill status={row.is_deleted ? 'Pasif' : row.status || 'Aktif'} /></td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{row.display_name || row.full_name || '-'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{row.person_kind === 'organization' ? 'Tüzel Kişi' : 'Gerçek Kişi'}</td>
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

  return value ? labels[value] || value : '-'
}

function getRepresentativePrimaryAuthority(row: Record<string, any>) {
  const candidates = [
    row.job_title,
    row.primary_authority_type,
    Array.isArray(row.authority_types) ? row.authority_types[0] : null,
    row.authority_type,
  ]
  return candidates.map(value => String(value || '').trim()).find(Boolean)
}

function formatSourceType(value?: string) {
  const labels: Record<string, string> = {
    employee: 'Çalışan',
    partner: 'Ortak',
    board_member: 'Yönetim Kurulu Üyesi',
    external_person: 'Dış Kişi',
    cari: 'Cari',
    stakeholder: 'Paydaş',
    partner_company: 'Ortak Şirket',
  }

  return value ? labels[value] || value : '-'
}

function normalizeCompanyForForm(company: Sirket) {
  return {
    ...company,
    is_deleted: !!company.is_deleted,
    partners: (company.partners || []).map((partner: any) => {
      const parts = String(partner.partner_name || '').trim().split(/\s+/)
      return {
        ...partner,
        owner_kind: partner.owner_kind || (partner.partner_type === 'organization' ? 'organization' : 'person'),
        source_type: partner.source_type || (partner.partner_type === 'organization' ? 'external_organization' : 'external_person'),
        source_id: partner.source_id || partner.id,
        display_name: partner.display_name || partner.partner_name || '',
        identity_number: partner.identity_number || partner.identity_tax_number || '',
        share_ratio: partner.share_ratio ?? partner.share_ratio ?? partner.current_share_ratio ?? '',
        voting_ratio: partner.voting_ratio ?? partner.current_voting_ratio ?? '',
        profit_ratio: partner.profit_ratio ?? partner.current_profit_ratio ?? '',
        has_representation_right: partner.has_representation_right ?? !!partner.signature_authority,
        status: partner.status || 'Aktif',
        history: partner.history || [],
        first_name: partner.first_name || parts.slice(0, -1).join(' ') || partner.partner_name || '',
        last_name: partner.last_name || (parts.length > 1 ? parts.at(-1) : ''),
        partner_type: partner.partner_type || 'person',
        identity_tax_number: partner.identity_tax_number || '',        signature_authority: !!partner.signature_authority,
      }
    }),
    representatives: (company.representatives || []).map((representative: any) => ({
      ...representative,
      authority_types: representative.authority_types || (representative.authority_type ? [representative.authority_type] : []),
      primary_authority_type: getRepresentativePrimaryAuthority(representative),
      person_kind: representative.person_kind || 'person',
      source_type: representative.source_type || 'external_person',
      source_id: representative.source_id || representative.id,
      display_name: representative.display_name || representative.full_name || '',
      status: representative.status || 'Aktif',
      history: representative.history || [],
    })),
    stakeholders: ((company as any).stakeholders || []).map((stakeholder: any) => ({
      ...stakeholder,
      display_name: stakeholder.display_name || stakeholder.ad_unvan || '',
      stakeholder_type: stakeholder.stakeholder_type === 'organization' ? 'Tüzel Kişi' : stakeholder.stakeholder_type === 'person' ? 'Gerçek Kişi' : stakeholder.stakeholder_type || stakeholder.paydas_turu || '-',
      relationship_type: stakeholder.relationship_type || stakeholder.category || stakeholder.iliski_turu || '-',
      priority: stakeholder.priority || stakeholder.priority_level || stakeholder.oncelik || '-',
      status: stakeholder.status || 'Aktif',
      history: stakeholder.history || [],
    })),
  }
}
