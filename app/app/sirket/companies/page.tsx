'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertTriangle, Archive, BriefcaseBusiness, Building2, CheckCircle2, CircleDot, FileText, History, Landmark, PencilLine, PlayCircle, Settings, ShieldAlert, TrendingUp, Users } from 'lucide-react'
import { useSirketler } from '@/hooks/useSirketler'
import { EntityForm, FormField, FormMode, FormTab, type FormOperationAction, type FormOperationActionGroup, type FormOperationProgress } from '@/components/ui/EntityForm'
import { CompanyCapitalIncreaseWizard, type CapitalIncreasePrecheckContext, type CapitalIncreaseSubmitPayload } from '@/components/ui/CompanyCapitalIncreaseWizard'
import { CompanyLifecycleWizard, type CompanyLifecycleWizardType } from '@/components/ui/CompanyLifecycleWizard'
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
import type { AnyDashboardWidgetConfig } from '@/components/dashboard/dashboard.types'
import { CompanyNaceCodesSection } from '@/components/modules/sirket/CompanyPublicTab'
import { cn, formatPhoneInput, normalizeEmailInput } from '@/lib/utils'
import { createFormModeState, mapPageStateToFormMode } from '@/lib/forms/formModeEngine'
import { createProgressiveFormLoadStages } from '@/lib/forms/progressiveFormLoading'
import { invalidateEntityDetailCache, readEntityDetailCache, writeEntityDetailCache } from '@/lib/forms/entityDetailCache'
import { createLegalEntityMasterTabs } from '@/lib/identity/legalEntityFormSections'
import { extractCompanyLogoUrl } from '@/lib/media/companyLogo'
import {
  buildFiscalYearStartValue,
  daysInFiscalYearMonth,
  formatFiscalYearStart,
  normalizeFiscalYearStartParts,
  normalizeFiscalYearStartStorage,
} from '@/lib/companies/fiscalYear'
import {
  LIFECYCLE_EVENTS_KEY,
  LIFECYCLE_FIELD_HISTORY_KEY,
  LIFECYCLE_HISTORY_TAB_ID,
} from '@/lib/lifecycle/lifecycleWizardTemplate'
import { useModules } from '@/lib/security/moduleStore'
import { usePermissions } from '@/lib/security/permissionStore'
import { PERMISSIONS } from '@/packages/shared/src'
import { companyService } from '@/lib/services/companyService'
import type { CompanyLifecycleStatus, Sirket } from '@/types/sirket'

type PageState = 'list' | 'create' | 'view' | 'edit'
type ToastState = { type: 'success' | 'error' | 'warning'; title?: string; message: string }
type SaveError = Error & { toast?: ToastState; fieldErrors?: Record<string, string> }
type CompanyRelatedStatus = 'ok' | 'module_closed' | 'error'
type CompanyRelatedStatusMap = Record<string, CompanyRelatedStatus | undefined>
type CompanyRelatedErrorsMap = Record<string, string | undefined>
type SirketTableRow = Sirket & {
  adres_ozet: string
  logo_url: string
  logo_url_light?: string | null
  logo_url_dark?: string | null
  lifecycle_status: CompanyLifecycleStatus
}
type CompanyStatusFilterValue = RecordStatusFilterValue
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
const COMPANY_DETAIL_CACHE_NAMESPACE = 'companies:phased-v3'
const COMPANY_HISTORY_TAB_ID = LIFECYCLE_HISTORY_TAB_ID
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
  capital_completion_ratio: 'Sermaye Tamamlanma Oranı',
  committed_capital_amount: 'Taahhüt Edilen Sermaye',
  paid_capital_amount: 'Yatırılan Sermaye',
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
  fiscal_year_start: 'Mali Yıl Başlangıcı (Ay/Gün)',
}

const COMPANY_OPENING_REGISTRATION_CONTROL = {
  category: 'registration' as const,
  operations: ['Şirket Açılışı', 'Tescil Bilgisi Düzeltme'],
  allowDraftEdit: true,
}

const COMPANY_TITLE_REGISTRATION_CONTROL = {
  category: 'registration' as const,
  operations: ['Şirket Açılışı', 'Unvan Değişikliği'],
  allowDraftEdit: true,
}

const COMPANY_ADDRESS_REGISTRATION_CONTROL = {
  category: 'registration' as const,
  operations: ['Şirket Açılışı', 'Adres Değişikliği'],
  allowDraftEdit: true,
}

const COMPANY_CAPITAL_REGISTRATION_CONTROL = {
  category: 'registration' as const,
  operations: ['Şirket Açılışı', 'Sermaye Artırımı', 'Sermaye Azaltımı'],
}

const COMPANY_PUBLIC_REGISTRATION_CONTROL = {
  category: 'registration' as const,
  operations: ['Şirket Açılışı', 'Kamu / Tescil Bilgisi Değişikliği'],
  allowDraftEdit: true,
}

const COMPANY_PUBLIC_RELATION_REGISTRATION_CONTROL = {
  ...COMPANY_PUBLIC_REGISTRATION_CONTROL,
  allowDraftEdit: false,
}

const columns: ColumnDef[] = [
  { key: 'lifecycle_status', label: 'Durum', type: 'enum', width: 44, minWidth: 44, maxWidth: 44, fixedWidth: true, sortable: false, hideHeaderLabel: true, category: 'Durum', order: -10, render: (_value, row) => <LifecycleStatusDot status={getCompanyLifecycleStatus(row)} /> },
  { key: 'logo_url', label: 'Logo', type: 'image', width: 52, maxWidth: 52, fixedWidth: true, sortable: false, hideHeaderLabel: true, category: 'Kimlik', imageFit: 'contain', imageShape: 'rounded' },
  { key: 'short_name', label: 'Kısa Ünvan', type: 'text', width: 200, sortable: true, category: 'Kimlik' },
  { key: 'trade_name', label: 'Ticari Unvan', type: 'text', width: 280, sortable: true, category: 'Kimlik' },
  { key: 'tax_number', label: 'VKN', type: 'text', width: 120, sortable: true, category: 'Kimlik' },
  { key: 'tax_office', label: 'Vergi Dairesi', type: 'text', width: 140, sortable: true, category: 'Vergi' },
  { key: 'company_type', label: 'Şirket Türü', type: 'enum', width: 110, sortable: true, category: 'Tescil', render: (value) => COMPANY_TYPE_SHORT_LABELS[String(value)] || value || '-' },
  { key: 'adres_ozet', label: 'Adres', type: 'text', width: 250, category: 'İletişim' },
  { key: 'phone', label: 'Telefon', type: 'text', width: 150, category: 'İletişim' },
  { key: 'email', label: 'E-posta', type: 'text', width: 200, category: 'İletişim' },
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
  { key: 'fiscal_year_start', label: FIELD_LABELS.fiscal_year_start, type: 'text', width: 150, sortable: true, category: 'Ayarlar', required: false, visible: false, render: (value) => formatFiscalYearStart(value) },
]

const heroFields: FormField[] = [
  { name: 'short_name', label: 'Kısa Ünvan', type: 'text' },
  { name: 'trade_name', label: 'Ticari Unvan', type: 'text', required: true, colSpan: 2, controlledByOperation: COMPANY_TITLE_REGISTRATION_CONTROL },
  {
    name: 'tax_office',
    label: 'Vergi Dairesi',
    type: 'select',
    required: true,
    controlledByOperation: COMPANY_PUBLIC_REGISTRATION_CONTROL,
    searchable: true,
    remoteOptions: {
      endpoint: '/api/reference/tax-offices',
      minQueryLength: 2,
      limit: 40,
    },
  },
  {
    name: 'company_type',
    label: 'Şirket Türü',
    type: 'select',
    required: true,
    controlledByOperation: COMPANY_OPENING_REGISTRATION_CONTROL,
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
  { name: 'country', label: 'Ülke', type: 'select', compact: true, controlledByOperation: COMPANY_ADDRESS_REGISTRATION_CONTROL },
  { name: 'city', label: 'İl', type: 'text', required: true, compact: true, controlledByOperation: COMPANY_ADDRESS_REGISTRATION_CONTROL },
  { name: 'district', label: 'İlçe', type: 'text', required: true, compact: true, controlledByOperation: COMPANY_ADDRESS_REGISTRATION_CONTROL },
  { name: 'address', label: 'Adres', type: 'textarea', required: true, colSpan: 3, controlledByOperation: COMPANY_ADDRESS_REGISTRATION_CONTROL },
]

const tabs: FormTab[] = [
  {
    id: 'lifecycle_summary',
    label: 'Yaşam Döngüsü',
    icon: <CircleDot size={16} />,
    fields: [
      {
        name: 'company_lifecycle_summary',
        label: 'Durum Özeti',
        type: 'custom',
        colSpan: 3,
      },
    ],
  },
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
      { name: 'mersis_number', label: 'MERSİS No', type: 'text', controlledByOperation: COMPANY_OPENING_REGISTRATION_CONTROL },
      { name: 'trade_registry_number', label: 'Ticaret Sicil No', type: 'text', controlledByOperation: COMPANY_OPENING_REGISTRATION_CONTROL },
      { name: 'foundation_date', label: 'Kuruluş Tarihi', type: 'date', controlledByOperation: COMPANY_OPENING_REGISTRATION_CONTROL },
      { name: 'capital_completion_ratio', label: 'Sermaye Tamamlanma Oranı', type: 'custom', colSpan: 3, controlledByOperation: COMPANY_CAPITAL_REGISTRATION_CONTROL },
      { name: 'electronic_notification_address', label: 'Elektronik Tebligat Adresi', type: 'text', maxLength: 17, inputMode: 'numeric', pattern: '\\d{5}-\\d{5}-\\d{5}', placeholder: '11111-22222-33333', controlledByOperation: COMPANY_PUBLIC_REGISTRATION_CONTROL },
      {
        name: 'trade_registry_office',
        label: 'Ticaret Sicili Müdürlüğü',
        type: 'select',
        controlledByOperation: COMPANY_OPENING_REGISTRATION_CONTROL,
        searchable: true,
        remoteOptions: {
          endpoint: '/api/reference/trade-registry-offices',
          minQueryLength: 2,
          limit: 40,
        },
      },
      { name: 'company_code', label: 'Şirket Kodu', type: 'text' },
    ],
  },
  {
    id: 'vergi',
    label: 'Kamu',
    icon: <Landmark size={16} />,
    fields: [
      { name: 'e_invoice_taxpayer', label: 'E-Fatura Mükellefi', type: 'checkbox', controlledByOperation: COMPANY_PUBLIC_REGISTRATION_CONTROL },
      { name: 'e_archive_taxpayer', label: 'E-Arşiv Mükellefi', type: 'checkbox', controlledByOperation: COMPANY_PUBLIC_REGISTRATION_CONTROL },
      { name: 'e_waybill_taxpayer', label: 'E-İrsaliye Mükellefi', type: 'checkbox', controlledByOperation: COMPANY_PUBLIC_REGISTRATION_CONTROL },
      { name: 'sgk_workplace_registry_no', label: 'SGK İşyeri Sicil No', type: 'text', maxLength: 26, inputMode: 'numeric', placeholder: '26 hane: M + 4 işkolu + 2 eski şube + 2 yeni şube + 7 sıra + 3 il + 2 ilçe + 2 kontrol + 3 aracı', controlledByOperation: COMPANY_PUBLIC_REGISTRATION_CONTROL },
      { name: 'sgk_province', label: 'SGK İl', type: 'text', placeholder: 'SGK sicil no girilince otomatik dolar', controlledByOperation: COMPANY_PUBLIC_REGISTRATION_CONTROL },
      { name: 'sgk_branch', label: 'SGK Şube', type: 'text', placeholder: 'SGK sicil no girilince otomatik dolar', controlledByOperation: COMPANY_PUBLIC_REGISTRATION_CONTROL },
      { name: 'risk_class', label: 'Tehlike Sınıfı', type: 'custom', colSpan: 3, controlledByOperation: COMPANY_PUBLIC_REGISTRATION_CONTROL },
      { name: 'company_nace_codes', label: 'NACE / Faaliyet Kodları', type: 'custom', colSpan: 3, controlledByOperation: COMPANY_PUBLIC_RELATION_REGISTRATION_CONTROL },
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
      { name: 'fiscal_year_start', label: 'Mali Yıl Başlangıcı (Ay/Gün)', type: 'custom', defaultValue: 101, render: renderFiscalYearStartField },
    ],
  },
]

const getFieldLabel = (field: string) => FIELD_LABELS[field] || field
const formatFieldList = (fields: string[]) => fields.map(getFieldLabel).join(', ')
const OPERATION_CONTROLLED_FORM_FIELDS = new Set([
  'trade_name',
  'tax_number',
  'tax_office',
  'mersis_number',
  'trade_registry_number',
  'foundation_date',
  'company_type',
  'country',
  'city',
  'district',
  'address',
  'committed_capital_amount',
  'paid_capital_amount',
  'electronic_notification_address',
  'trade_registry_office',
  'e_invoice_taxpayer',
  'e_archive_taxpayer',
  'e_waybill_taxpayer',
  'sgk_workplace_registry_no',
  'sgk_province',
  'sgk_branch',
  'risk_class',
  'nace_codes',
])
const DRAFT_EDITABLE_OPERATION_FORM_FIELDS = new Set([
  'trade_name',
  'tax_number',
  'tax_office',
  'mersis_number',
  'trade_registry_number',
  'foundation_date',
  'company_type',
  'country',
  'city',
  'district',
  'address',
  'electronic_notification_address',
  'trade_registry_office',
  'e_invoice_taxpayer',
  'e_archive_taxpayer',
  'e_waybill_taxpayer',
  'sgk_workplace_registry_no',
  'sgk_province',
  'sgk_branch',
  'risk_class',
  'nace_codes',
])

function buildCompanySaveToast(result: Record<string, any>, mode: FormMode): ToastState {
  const partialWarnings = normalizePartialWarnings(result?.partial_warnings)
  const warning = typeof result?.warning === 'string' ? result.warning : ''

  if (partialWarnings.length) {
    return {
      type: 'warning',
      title: 'Kısmi Kayıt',
      message: [
        mode === 'create' ? 'Şirket oluşturuldu.' : 'Şirket bilgileri güncellendi.',
        'Ancak bazı bağlı bilgiler kaydedilemedi:',
        ...partialWarnings.map(message => `- ${message}`),
      ].join('\n'),
    }
  }

  if (warning) {
    return {
      type: 'warning',
      title: 'Kısmi Kayıt',
      message: warning,
    }
  }

  return {
    type: 'success',
    title: 'Kayıt Başarılı',
    message: mode === 'create' ? 'Şirket kaydı oluşturuldu' : 'Şirket bilgileri güncellendi',
  }
}

function normalizePartialWarnings(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map(item => typeof item === 'string' ? item : item?.message)
    .filter((message): message is string => typeof message === 'string' && message.trim().length > 0)
}
const fiscalYearMonthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: new Intl.DateTimeFormat('tr-TR', { month: 'long' }).format(new Date(2024, index, 1)),
}))

function renderFiscalYearStartField({
  value,
  onChange,
  readOnly,
  className,
}: Parameters<NonNullable<FormField['render']>>[0]) {
  const { month, day } = normalizeFiscalYearStartParts(value)
  const dayOptions = Array.from({ length: daysInFiscalYearMonth(month) }, (_, index) => index + 1)

  const updateMonth = (nextMonth: number) => {
    onChange(buildFiscalYearStartValue(nextMonth, Math.min(day, daysInFiscalYearMonth(nextMonth))))
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        aria-label="Mali yil baslangic ayi"
        value={month}
        onChange={(event) => updateMonth(Number(event.target.value))}
        disabled={readOnly}
        className={className}
      >
        {fiscalYearMonthOptions.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <select
        aria-label="Mali yil baslangic gunu"
        value={day}
        onChange={(event) => onChange(buildFiscalYearStartValue(month, Number(event.target.value)))}
        disabled={readOnly}
        className={className}
      >
        {dayOptions.map(option => (
          <option key={option} value={option}>{String(option).padStart(2, '0')}</option>
        ))}
      </select>
    </div>
  )
}

function createTourDraftCompany(): Sirket {
  const now = new Date().toISOString()

  return {
    id: 'tour-draft-company',
    short_name: 'EDEN Demo',
    trade_name: 'EDEN Demo Teknoloji A.Ş.',
    tax_number: '1111111111',
    tax_office: 'Kadıköy',
    company_type: 'anonim',
    country: 'Türkiye',
    city: 'İstanbul',
    district: 'Kadıköy',
    address: 'Demo Mahallesi, Eğitim Sokak No: 1',
    phone: '+90 212 000 00 00',
    email: 'demo@eden.local',
    website: 'https://eden.local',
    record_status: 'draft',
    company_status: 'draft',
    is_deleted: false,
    partners: [],
    representatives: [],
    stakeholders: [],
    lifecycle_events: [
      {
        event_type: 'company_created_as_draft',
        event_date: now,
        new_status: 'draft',
      },
    ],
    lifecycle_last_event: {
      event_type: 'company_created_as_draft',
      event_date: now,
      new_status: 'draft',
    },
    created_at: now,
    updated_at: now,
  } as unknown as Sirket
}

export default function SirketlerPage() {
  const searchParams = useSearchParams()
  const [statusFilters, setStatusFilters] = useState<CompanyStatusFilterValue[]>(DEFAULT_RECORD_STATUS_FILTERS)
  const [listQuery, setListQuery] = useState({ page: 1, pageSize: 10, search: '', sort: 'short_name', direction: 'asc' as 'asc' | 'desc' })
  const includePassive = statusFilters.includes('passive')
  const { data: companies, meta: listMeta, loading, error: listError, yenile } = useSirketler({ includePassive, statuses: statusFilters, ...listQuery })
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
  const [lifecycleWizard, setLifecycleWizard] = useState<CompanyLifecycleWizardType | null>(null)
  const [lifecycleWizardReadOnly, setLifecycleWizardReadOnly] = useState(false)
  const [capitalIncreaseContext, setCapitalIncreaseContext] = useState<CapitalIncreasePrecheckContext | null>(null)
  const [capitalIncreaseSaving, setCapitalIncreaseSaving] = useState(false)
  const detailRequestRef = useRef(0)
  const mediaProbeRef = useRef<Record<string, boolean>>({})
  const [preferredFormTabId, setPreferredFormTabId] = useState<string | null>(null)
  const tourLifecycleOpenedRef = useRef(false)
  const notificationCompanyOpenRef = useRef<string | null>(null)
  const isDarkMode = useDarkModeFlag()

  const configuredHeroFields = [
    {
      name: 'lifecycle_status_badge',
      label: 'Durum',
      type: 'custom',
      render: () => <LifecycleStatusBadge status={pageState === 'create' ? 'draft' : getCompanyLifecycleStatus(selectedSirket)} tourId="record-lifecycle" />,
    } as FormField,
    ...heroFields,
  ]

  const historyTab: FormTab = {
    id: COMPANY_HISTORY_TAB_ID,
    label: 'Geçmiş',
    icon: <History size={16} />,
    fields: [
      {
        name: 'company_history',
        label: 'Geçmiş',
        type: 'custom',
        colSpan: 3,
        render: () => <CompanyHistoryPanel data={selectedSirket} />,
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
    ...tabs,
    ...(pageState !== 'create' ? [historyTab] : []),
  ]

  const tableData: SirketTableRow[] = useMemo(() => (companies || []).map(sirket => ({
    ...sirket,
    is_deleted: !!sirket.is_deleted,
    lifecycle_status: getCompanyLifecycleStatus(sirket),
    adres_ozet: [sirket.district, sirket.city].filter(Boolean).join(', '),
    logo_url: resolveCompanyLogoUrl(sirket, isDarkMode),
  })), [companies, isDarkMode])

  const moduleEnabled = isEnabled('companies')
  const moduleWritable = isWritable('companies')
  const formAccess = createFormModeState(mapPageStateToFormMode(pageState), {
    canView: moduleEnabled && can(PERMISSIONS.companies.view),
    canInsert: moduleWritable && can(PERMISSIONS.companies.insert),
    canEdit: moduleWritable && can(PERMISSIONS.companies.edit),
    canApprove: moduleWritable && can(PERMISSIONS.companies.approve),
  })

  const widgets: WidgetDef<SirketTableRow>[] = useMemo(() => [
    { key: 'total', label: 'Toplam Şirket', render: () => tableData.length },
    { key: 'draft', label: 'Taslak', render: () => tableData.filter(row => getCompanyLifecycleStatus(row) === 'draft').length },
    { key: 'active', label: 'Aktif', render: () => tableData.filter(row => getCompanyLifecycleStatus(row) === 'active').length },
    { key: 'liquidation', label: 'Tasfiye', render: () => tableData.filter(row => getCompanyLifecycleStatus(row) === 'liquidation').length },
    { key: 'closed', label: 'Kapanmış', render: () => tableData.filter(row => getCompanyLifecycleStatus(row) === 'deregistered').length },
  ], [tableData])

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
    referencesLoading: false,
    referencesReady: pageState !== 'list',
  })
  const selectedHeroDocumentCount = Array.isArray((selectedSirket as any)?.hero_documents)
    ? (selectedSirket as any).hero_documents.length
    : 0

  useEffect(() => {
    if (pageState === 'list' || pageState === 'create') return
    if (!selectedSirket?.id || detailLoading || detailSections.mediaLoading) return
    if (selectedHeroDocumentCount > 0) return
    if (mediaProbeRef.current[selectedSirket.id]) return

    const companyId = selectedSirket.id
    mediaProbeRef.current[companyId] = true
    let cancelled = false

    setDetailSections(previous => ({ ...previous, mediaLoading: true, mediaError: false }))
    companyService.detailSection(companyId, 'media')
      .then(result => {
        if (cancelled) return
        if (result.data) {
          setSelectedSirket(previous => {
            if (!previous || previous.id !== companyId) return previous
            return normalizeCompanyForForm({ ...previous, ...result.data } as Sirket)
          })
        }
        setDetailSections(previous => ({ ...previous, mediaLoading: false, mediaReady: true }))
      })
      .catch(() => {
        if (!cancelled) {
          setDetailSections(previous => ({ ...previous, mediaLoading: false, mediaError: true }))
        }
      })

    return () => {
      cancelled = true
    }
  }, [detailLoading, detailSections.mediaLoading, pageState, selectedHeroDocumentCount, selectedSirket?.id])

  useEffect(() => {
    if (searchParams.get('systemTour') !== 'lifecycle') return
    if (tourLifecycleOpenedRef.current || pageState !== 'list' || loading) return

    const draftCompany = tableData.find(row => getCompanyLifecycleStatus(row) === 'draft')
      || createTourDraftCompany()
    tourLifecycleOpenedRef.current = true
    setFormError(null)
    setFieldErrors({})
    setDetailSections(emptyDetailSectionState)
    setSelectedSirket(normalizeCompanyForForm(draftCompany as Sirket))
    setPageState('view')
  }, [loading, pageState, searchParams, tableData])

  useEffect(() => {
    const notificationCompanyId = searchParams.get('id')
    const pendingAction = searchParams.get('pending')
    if (!notificationCompanyId || !pendingAction || searchParams.has('systemTour')) return
    if (loading || pageState !== 'list' || notificationCompanyOpenRef.current === notificationCompanyId) return

    notificationCompanyOpenRef.current = notificationCompanyId
    void openCompanyFromNotification(notificationCompanyId)
  }, [loading, pageState, searchParams, tableData])

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
    setPreferredFormTabId(null)
    setPageState('create')
  }

  const handleRowClick = async (row: SirketTableRow, preferredTabId?: string) => {
    const requestId = detailRequestRef.current + 1
    detailRequestRef.current = requestId
    setPreferredFormTabId(preferredTabId || null)
    const snapshot = normalizeCompanyForForm(row as Sirket)
    const cached = readEntityDetailCache<Sirket, DetailSectionState>(COMPANY_DETAIL_CACHE_NAMESPACE, row.id)

    if (cached?.meta?.heroReady && cached.meta.mediaReady && cached.meta.detailsReady) {
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
    setCapitalIncreaseContext(null)
    setFormError(null)
    setFieldErrors({})
    setDetailSections(emptyDetailSectionState)
    setPreferredFormTabId(null)
  }

  const normalizePayload = (raw: Record<string, any>) => {
    const payload: Record<string, any> = {}
    const isDraftEdit = pageState !== 'create' && getCompanyLifecycleStatus(selectedSirket) === 'draft'

    Object.entries(raw).forEach(([key, value]) => {
      if (
        pageState !== 'create'
        && OPERATION_CONTROLLED_FORM_FIELDS.has(key)
        && !(isDraftEdit && DRAFT_EDITABLE_OPERATION_FORM_FIELDS.has(key))
      ) return
      if (['partners', 'representatives', 'stakeholders', 'documents', 'logos', 'lifecycle_status_badge', 'company_lifecycle_summary', 'record_status', 'company_status', 'opening_details', 'liquidation_details', 'deregistration_details', 'lifecycle_events', 'lifecycle_last_event', 'capital_completion_ratio', 'committed_capital_amount', 'paid_capital_amount', 'company_nace_codes', 'public_tax', 'public_sgk', 'public_incentives', 'public_registry', 'public_licenses', 'public_channels', 'related_status', 'related_errors'].includes(key)) return
      if (value === undefined) return
      if (value === '' || value === null) {
        if (pageState !== 'create') payload[key] = null
        return
      }
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
    if (payload.fiscal_year_start !== undefined) payload.fiscal_year_start = normalizeFiscalYearStartStorage(payload.fiscal_year_start)
    if (pageState === 'create') payload.is_deleted = false
    if (pageState === 'create') {
      payload.country = payload.country || 'Türkiye'
      payload.default_currency = payload.default_currency || 'TRY'
      payload.default_language = payload.default_language || 'tr'
      payload.time_zone = payload.time_zone || 'Europe/Istanbul'
      payload.fiscal_year_start = payload.fiscal_year_start || 101
    }

    return payload
  }

  const handleFormFieldChange = (field: string, value: any) => {
    if (pageState === 'create' || !selectedSirket) return
    if (!['hero_documents', 'hero_images'].includes(field)) return

    const merged = normalizeCompanyForForm({ ...selectedSirket, [field]: value } as Sirket)
    setSelectedSirket(merged)
    writeEntityDetailCache(COMPANY_DETAIL_CACHE_NAMESPACE, merged.id, merged, {
      meta: { ...detailSections, mediaReady: true, mediaLoading: false },
    })
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
      if (result.data) {
        setSelectedSirket(normalizeCompanyForForm({
          ...(selectedSirket || {}),
          ...result.data,
        } as Sirket))
      }
      setToast(buildCompanySaveToast(result as Record<string, any>, mode))
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

      setToast({ type: 'success', title: 'Kayıt Başarılı', message: isDraft ? 'Şirket taslak kaydı kalıcı olarak silindi' : 'Şirket kaydı pasife çekildi' })
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
      setToast({ type: 'success', title: 'Kayıt Başarılı', message: 'Şirket kaydı aktive edildi' })
      await yenile()
      setPageState('view')
    } catch (error: any) {
      setFormError(error.message)
      setToast(error.toast || { type: 'error', title: 'Kayıt Başarısız', message: error.message })
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
    setLifecycleWizardReadOnly(false)
    setPageState('view')
    await yenile()
    const status = getCompanyLifecycleStatus(nextCompany)
    setToast({
      type: 'success',
      title: 'Yaşam Döngüsü Güncellendi',
      message: `Şirket durumu ${getCompanyLifecycleLabel(status)} olarak güncellendi`,
    })
  }

  const openLifecycleWizard = async (type: CompanyLifecycleWizardType, options: { readOnly?: boolean } = {}) => {
    if (!selectedSirket?.id) return
    const readOnly = !!options.readOnly

    setLifecycleWizardReadOnly(readOnly)
    setLifecycleWizard(type)
  }

  const openCapitalIncreaseWizard = async () => {
    if (!selectedSirket?.id) return
    setFormError(null)
    setFieldErrors({})
    try {
      const result = await companyService.capitalIncreasePrecheck(selectedSirket.id)
      const context = result.data as CapitalIncreasePrecheckContext
      if (!context?.ok) {
        setToast({
          type: 'warning',
          title: 'Sermaye Artırımı Başlatılamaz',
          message: context?.message || 'Sermaye artırımı ön kontrolleri tamamlanamadı.',
        })
        return
      }
      setCapitalIncreaseContext(context)
    } catch (error: any) {
      setToast({
        type: 'error',
        title: 'Ön Kontrol Başarısız',
        message: error?.message || 'Sermaye artırımı ön kontrolü yapılamadı.',
      })
    }
  }

  const completeCapitalIncrease = async (payload: CapitalIncreaseSubmitPayload) => {
    if (!selectedSirket?.id) return
    setCapitalIncreaseSaving(true)
    try {
      const result = await companyService.completeCapitalIncrease(selectedSirket.id, payload as unknown as Record<string, any>)
      invalidateEntityDetailCache(COMPANY_DETAIL_CACHE_NAMESPACE, selectedSirket.id)
      if (result.data?.company) {
        setSelectedSirket(normalizeCompanyForForm({
          ...selectedSirket,
          ...result.data.company,
        } as Sirket))
      }
      setCapitalIncreaseContext(null)
      setPreferredFormTabId('tescil')
      setToast({
        type: 'success',
        title: 'Sermaye Artırımı Tamamlandı',
        message: `Şirket sermayesi ${formatCurrencyAmount(result.data?.new_capital_amount || 0)} olarak güncellendi.`,
      })
      await yenile()
    } catch (error: any) {
      setToast({
        type: 'error',
        title: 'Sermaye Artırımı Tamamlanamadı',
        message: error?.message || 'Sermaye artırımı kaydı oluşturulamadı.',
      })
      throw error
    } finally {
      setCapitalIncreaseSaving(false)
    }
  }

  const getFormOperationActions = (): FormOperationActionGroup[] => {
    if (!selectedSirket?.id || pageState === 'create') return []
    const status = getCompanyLifecycleStatus(selectedSirket)
    const canStartOpening = status === 'draft' && can(PERMISSIONS.companies.openingStart)
    const canStartLiquidation = status === 'active' && can(PERMISSIONS.companies.liquidationStart)
    const canUpdateLiquidation = status === 'liquidation' && can(PERMISSIONS.companies.liquidationUpdate)
    const canStartDeregistration = status === 'liquidation' && can(PERMISSIONS.companies.deregistrationStart)
    const lifecycleProgress = getCompanyLifecycleOperationProgress(status)
    const completedLifecycleActions = new Set(lifecycleProgress.completedActionKeys || [])
    const isCompletedLifecycleAction = (actionKey: CompanyLifecycleWizardType) => completedLifecycleActions.has(actionKey)
    const lifecycleActions: FormOperationAction[] = [
      {
        key: 'opening',
        label: 'Şirket Açılışı',
        icon: <PlayCircle size={16} />,
        onClick: () => openLifecycleWizard('opening', { readOnly: isCompletedLifecycleAction('opening') }),
        disabled: !isCompletedLifecycleAction('opening') && !canStartOpening,
        dataTourId: 'record-operation-company-opening',
      },
      {
        key: 'liquidation',
        label: status === 'liquidation' ? 'Tasfiye Bilgilerini Güncelle' : 'Tasfiye Başlat',
        icon: <ShieldAlert size={16} />,
        onClick: () => openLifecycleWizard('liquidation', { readOnly: isCompletedLifecycleAction('liquidation') }),
        disabled: !isCompletedLifecycleAction('liquidation') && !(canStartLiquidation || canUpdateLiquidation),
      },
      {
        key: 'deregistration',
        label: 'Terkin Başlat',
        icon: <Archive size={16} />,
        onClick: () => openLifecycleWizard('deregistration', { readOnly: isCompletedLifecycleAction('deregistration') }),
        disabled: !isCompletedLifecycleAction('deregistration') && !canStartDeregistration,
      },
    ]

    const canUseOfficialUpdates = status !== 'deregistered' && can(PERMISSIONS.companies.edit)
    const officialUpdateActions: FormOperationAction[] = canUseOfficialUpdates ? [
      {
        key: 'capital_increase',
        label: 'Sermaye Artırımı',
        icon: <TrendingUp size={16} />,
        onClick: openCapitalIncreaseWizard,
        disabled: status !== 'active',
      },
      {
        key: 'capital_decrease',
        label: 'Sermaye Azaltımı',
        icon: <TrendingUp size={16} />,
        onClick: () => undefined,
        disabled: true,
        tone: 'neutral' as const,
      },
      {
        key: 'title_change',
        label: 'Unvan Değişikliği',
        icon: <FileText size={16} />,
        onClick: () => undefined,
        disabled: true,
        tone: 'neutral' as const,
      },
      {
        key: 'address_change',
        label: 'Adres Değişikliği',
        icon: <Building2 size={16} />,
        onClick: () => undefined,
        disabled: true,
        tone: 'neutral' as const,
      },
      {
        key: 'public_registration_update',
        label: 'Kamu / Tescil Bilgisi Güncelleme',
        icon: <Landmark size={16} />,
        onClick: () => undefined,
        disabled: true,
        tone: 'neutral' as const,
      },
    ] : []

    const basicUpdateActions: FormOperationAction[] = pageState === 'view' && formAccess.showEdit && canEditSelectedProfile
      ? [{
          key: 'edit',
          label: 'Güncelle',
          icon: <PencilLine size={16} />,
          onClick: () => setPageState('edit'),
        }]
      : []

    return [
      ...(lifecycleActions.length ? [{
        key: 'lifecycle',
        progress: lifecycleProgress,
        actions: lifecycleActions,
      }] : []),
      ...(officialUpdateActions.length ? [{
        key: 'official_updates',
        actions: officialUpdateActions,
      }] : []),
      ...(basicUpdateActions.length ? [{
        key: 'basic_update',
        actions: basicUpdateActions,
      }] : []),
    ]
  }

  async function openCompanyFromNotification(companyId: string) {
    try {
      const tableRow = tableData.find(row => row.id === companyId)
      if (tableRow) {
        await handleRowClick(tableRow)
        return
      }

      const result = await companyService.detail(companyId)
      if (!result.data) throw new Error('Şirket kaydı bulunamadı')
      await handleRowClick(normalizeCompanyForForm(result.data) as unknown as SirketTableRow)
    } catch (error: any) {
      notificationCompanyOpenRef.current = null
      setToast({
        type: 'error',
        title: 'Bildirim Açılamadı',
        message: error?.message || 'Bildirimdeki şirket formu açılamadı.',
      })
    }
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
            activeStatusFilters={statusFilters}
            onStatusFiltersChange={(next) => {
              setStatusFilters(normalizeRecordStatusFilters(next))
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
            quickLookDefaultOpen={false}
            forceQuickLookClosed={searchParams.has('systemTour')}
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
                    render: ({ data }) => {
                      const rows = Array.isArray((selectedSirket as any)?.company_nace_codes) ? (selectedSirket as any).company_nace_codes : []
                      const primary = rows.find((row: any) => row?.is_primary && row?.status !== 'passive')
                      const hazardClass = formatHazardClass(primary?.nace_code?.hazard_class || (selectedSirket as any)?.public_sgk?.risk_class || (selectedSirket as any)?.risk_class) || 'Birincil NACE seçilmemiş'

                      return (
                        <div className="space-y-3">
                          <RelatedSectionNotice data={data} sections={['public_sgk', 'company_nace_codes']} />
                          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900/50">
                            <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">{hazardClass}</span>
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Tehlike sınıfı, birincil NACE koduna göre otomatik belirlenir.</p>
                          </div>
                        </div>
                      )
                    },
                  }
                }

                if (nextField.name === 'company_lifecycle_summary') {
                  return {
                    ...nextField,
                    render: ({ data }) => (
                      <CompanyLifecycleSummary data={(data as Sirket) || selectedSirket} />
                    ),
                  }
                }

                if (nextField.name === 'company_nace_codes') {
                  return {
                    ...nextField,
                    render: ({ value, data }) => (
                      <div className="space-y-3">
                        <RelatedSectionNotice data={data} sections={['public_tax', 'public_sgk', 'public_registry', 'public_licenses', 'public_channels', 'company_nace_codes']} />
                        <CompanyNaceCodesSection
                          companyId={selectedSirket?.id}
                          initialRows={Array.isArray(value) ? value : (selectedSirket as any)?.company_nace_codes}
                          readOnly={pageState !== 'edit'}
                        />
                      </div>
                    ),
                  }
                }

                if (nextField.name === 'capital_completion_ratio') {
                  return {
                    ...nextField,
                    render: ({ data }) => (
                      <CapitalCompletionField
                        company={data as Sirket}
                        loading={detailSections.detailsLoading && !(data as any)?.opening_details}
                      />
                    ),
                  }
                }

                if (nextField.name === 'partners') {
                  return {
                    ...nextField,
                    render: ({ value, data }) => (
                      <div className="space-y-3">
                        <RelatedSectionNotice data={data} sections={['partners', 'current_ownership']} />
                        <RelatedSummaryTable type="partners" rows={Array.isArray(value) ? value : []} />
                      </div>
                    ),
                  }
                }

                if (nextField.name === 'stakeholders') {
                  return {
                    ...nextField,
                    render: ({ value, data }) => (
                      <div className="space-y-3">
                        <RelatedSectionNotice data={data} sections={['stakeholders']} />
                        <RelatedSummaryTable type="stakeholders" rows={Array.isArray(value) ? value : []} />
                      </div>
                    ),
                  }
                }

                if (nextField.name !== 'representatives') return nextField

                return {
                  ...nextField,
                  render: ({ value, data }) => (
                    <div className="space-y-3">
                      <RelatedSectionNotice data={data} sections={['representatives']} />
                      <RelatedSummaryTable type="representatives" rows={Array.isArray(value) ? value : []} />
                    </div>
                  ),
                }
              }),
            }))}
            initialActiveTabId={preferredFormTabId || undefined}
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
            onFieldChange={handleFormFieldChange}
            onIdentityGateOpenExistingRole={async (roleRecord) => {
              await handleRowClick(roleRecord as SirketTableRow)
              setPageState('edit')
            }}
            onIdentityGateCancelDuplicate={handleBackToList}
            canCreate={formAccess.showAdd}
            canEdit={formAccess.showEdit && canEditSelectedProfile}
            operationActions={getFormOperationActions()}
            enableHistory
            showHeroHeader={false}
            showMasterSummaryBadge={false}
            masterSummaryTitle="Şirket Bilgileri"
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
              title: 'Şirket Belgeleri',
              dataField: 'hero_documents',
              slots: [
                { id: 'vergi_levhasi', title: 'Vergi Levhası', required: false },
                { id: 'ticaret_sicil_gazetesi', title: 'Ticaret Sicil Gazetesi', required: false },
                { id: 'sicil_tasdiknamesi', title: 'Sicil Tasdiknamesi', required: false },
                { id: 'faaliyet_belgesi', title: 'Faaliyet Belgesi', required: false },
                { id: 'imza_sirkuleri', title: 'İmza Sirküleri', required: false },
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

      {lifecycleWizard && selectedSirket && (
        <CompanyLifecycleWizard
          type={lifecycleWizard}
          company={selectedSirket}
          readOnly={lifecycleWizardReadOnly}
          onClose={() => {
            setLifecycleWizard(null)
            setLifecycleWizardReadOnly(false)
          }}
          onComplete={handleLifecycleComplete}
        />
      )}

      {capitalIncreaseContext && selectedSirket && (
        <CompanyCapitalIncreaseWizard
          companyName={selectedSirket.short_name || selectedSirket.trade_name || 'Şirket'}
          context={capitalIncreaseContext}
          saving={capitalIncreaseSaving}
          onClose={() => !capitalIncreaseSaving && setCapitalIncreaseContext(null)}
          onComplete={completeCapitalIncrease}
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

function extractLogoUrl(images: unknown, darkMode?: boolean) {
  const isDark = darkMode ?? (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
  const preferredSlot = isDark ? 'dark_mode_avatar' : 'light_mode_avatar'
  return extractCompanyLogoUrl(images, { preferredSlotId: preferredSlot })
}

function resolveCompanyLogoUrl(company: Partial<Sirket> | Record<string, any>, isDarkMode: boolean) {
  const lightLogoUrl = extractLogoUrl((company as any).hero_images, false)
    || (company as any).logo_url_light
    || (company as any).logo_url
    || ''
  const darkLogoUrl = extractLogoUrl((company as any).hero_images, true)
    || (company as any).logo_url_dark
    || lightLogoUrl
    || (company as any).logo_url
    || ''

  return isDarkMode ? darkLogoUrl : lightLogoUrl
}

function useDarkModeFlag() {
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const update = () => setIsDarkMode(root.classList.contains('dark'))
    update()

    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return isDarkMode
}

function getCompanyLifecycleStatus(company?: Partial<Sirket> | null): CompanyLifecycleStatus {
  if (!company) return 'draft'
  if (company.is_deleted === true) return 'deregistered'

  const values = [company.record_status, company.company_status]
    .map(value => String(value || '').trim().toLocaleLowerCase('tr-TR'))
    .filter(Boolean)

  for (const value of values) {
    if (['draft', 'taslak'].includes(value)) return 'draft'
    if (['active', 'opened', 'aktif'].includes(value)) return 'active'
    if (['liquidation', 'tasfiye', 'tasfiye halinde'].includes(value)) return 'liquidation'
    if (['deregistered', 'passive', 'closed', 'deleted', 'pasif', 'kapalı', 'kapanmış'].includes(value)) return 'deregistered'
  }

  return values.length ? 'unknown' : 'active'
}

function getCompanyLifecycleOperationProgress(status: CompanyLifecycleStatus): FormOperationProgress {
  if (status === 'draft') {
    return { activeActionKeys: ['opening'] }
  }
  if (status === 'active') {
    return { completedActionKeys: ['opening'], activeActionKeys: ['liquidation'] }
  }
  if (status === 'liquidation') {
    return { completedActionKeys: ['opening'], activeActionKeys: ['liquidation', 'deregistration'] }
  }
  if (status === 'unknown') return {}
  return { completedActionKeys: ['opening', 'liquidation', 'deregistration'] }
}

function getCompanyLifecycleLabel(status: CompanyLifecycleStatus) {
  if (status === 'draft') return 'Taslak'
  if (status === 'active') return 'Aktif'
  if (status === 'liquidation') return 'Tasfiye Halinde'
  if (status === 'unknown') return 'Bilinmeyen'
  return 'Terkin Edildi / Kapanmış'
}

function getCompanyLifecycleBadgeClass(status: CompanyLifecycleStatus) {
  if (status === 'draft') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200'
  if (status === 'active') return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200'
  if (status === 'liquidation') return 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/70 dark:bg-orange-950/30 dark:text-orange-200'
  return 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
}

function getCompanyLifecycleDotClass(status: CompanyLifecycleStatus) {
  if (status === 'draft') return 'border-amber-200 bg-amber-400 dark:border-amber-300'
  if (status === 'active') return 'border-emerald-200 bg-emerald-500 dark:border-emerald-300'
  if (status === 'liquidation') return 'border-orange-200 bg-orange-500 dark:border-orange-300'
  return 'border-gray-300 bg-gray-500 dark:border-gray-500'
}

function LifecycleStatusDot({ status }: { status: CompanyLifecycleStatus }) {
  const label = getCompanyLifecycleLabel(status)

  return (
    <span className="inline-flex w-full justify-center" title={label} aria-label={label}>
      <span className={`h-3.5 w-3.5 rounded-full border ${getCompanyLifecycleDotClass(status)}`} aria-hidden="true" />
    </span>
  )
}

function LifecycleStatusBadge({ status, tourId }: { status: CompanyLifecycleStatus; tourId?: string }) {
  return (
    <span
      data-tour-id={tourId}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getCompanyLifecycleBadgeClass(status)}`}
    >
      <CircleDot size={12} />
      Durum: {getCompanyLifecycleLabel(status)}
    </span>
  )
}

function CompanyLifecycleSummary({ data }: { data?: Sirket | null }) {
  const status = getCompanyLifecycleStatus(data)
  const opening = (data as any)?.opening_details || {}
  const liquidation = (data as any)?.liquidation_details || {}
  const deregistration = (data as any)?.deregistration_details || {}
  const missingDocuments = status === 'active' ? getMissingCompanyProfileDocuments(data) : []

  return (
    <div data-tour-id="record-lifecycle-summary" className="col-span-2 space-y-4 lg:col-span-3">
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
      </div>
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
        Açılış, tasfiye ve terkin bilgileri doğrudan form alanı değildir; ilgili wizard kayıtlarından read-only özet olarak gösterilir.
      </div>
      {missingDocuments.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          Aktif şirket profilinde eksik belge var: {missingDocuments.join(', ')}.
        </div>
      )}
    </div>
  )
}

function getMissingCompanyProfileDocuments(data?: Sirket | null) {
  const documents: any[] = Array.isArray((data as any)?.hero_documents) ? (data as any).hero_documents : []
  const required = [
    ['vergi_levhasi', 'Vergi Levhası'],
    ['ticaret_sicil_gazetesi', 'Ticaret Sicil Gazetesi'],
    ['sicil_tasdiknamesi', 'Sicil Tasdiknamesi'],
  ] as const

  return required
    .filter(([slotId]) => !documents.some(document => isCompanyDocumentReadyForSlot(document, slotId)))
    .map(([, title]) => title)
}

function isCompanyDocumentReadyForSlot(document: any, slotId: string) {
  if (!document || document.isDeleted || document.is_deleted || document.status === 'deleted' || document.status === 'archived') return false
  const documentSlotId = String(document.slotId || document.slot_id || document.document_type || '')
  if (documentSlotId !== slotId) return false
  return Boolean(document.storagePath || document.documentId || document.document_id || document.url || document.previewUrl || document.name)
}

function CompanyHistoryPanel({ data }: { data?: Sirket | null }) {
  const fieldHistorySource = (data as any)?.[LIFECYCLE_FIELD_HISTORY_KEY]
  const fieldHistory = (fieldHistorySource && typeof fieldHistorySource === 'object')
    ? fieldHistorySource as Record<string, Array<{ value?: unknown; date?: string; user?: string }>>
    : {}
  const fieldChanges = Object.entries(fieldHistory)
    .flatMap(([field, entries]) => (Array.isArray(entries) ? entries : []).map(entry => ({ field, ...entry })))
    .sort((a, b) => getHistoryTime(b.date) - getHistoryTime(a.date))
  const events = (Array.isArray((data as any)?.[LIFECYCLE_EVENTS_KEY]) ? (data as any)[LIFECYCLE_EVENTS_KEY] : [])
    .slice()
    .sort((a: any, b: any) => getHistoryTime(b.created_at || b.event_date) - getHistoryTime(a.created_at || a.event_date))

  return (
    <div className="col-span-2 space-y-6 lg:col-span-3">
      <HistorySection
        title="Yaşam Döngüsü Olayları"
        description="Açılış, tasfiye ve terkin işlemlerinin kısa olay kayıtları"
        emptyText="Bu kayıt için yaşam döngüsü olayı bulunmuyor."
      >
        {events.map((event: any, index: number) => (
          <div key={event.id || index} className="flex flex-col gap-1 border-b border-gray-100 py-3 text-sm last:border-0 dark:border-gray-800 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="font-medium text-gray-900 dark:text-white">{formatLifecycleEvent(event.event_type)}</div>
              <div className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{formatLifecycleEventSummary(event)}</div>
            </div>
            <div className="shrink-0 text-xs text-gray-500 dark:text-gray-400 md:text-right">
              {formatHistoryDateTime(event.created_at || event.event_date)}
            </div>
          </div>
        ))}
      </HistorySection>

      <HistorySection
        title="Yapılan Değişiklikler"
        description="Form alanlarında yapılan kayıt değişiklikleri"
        emptyText="Bu kayıt için alan değişikliği bulunmuyor."
      >
        {fieldChanges.map((entry, index) => (
          <div key={`${entry.field}-${entry.date || index}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-gray-100 py-2.5 text-sm last:border-0 dark:border-gray-800">
            <span className="text-xs text-gray-500 dark:text-gray-400">{formatHistoryDateTime(entry.date)}</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatHistoryFieldLabel(entry.field)}</span>
            <span className="text-gray-600 dark:text-gray-300">değişti.</span>
            <span className="text-gray-500 dark:text-gray-400">Önceki: {formatHistoryValue(entry.value)}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{entry.user || 'Sistem Kullanıcısı'}</span>
          </div>
        ))}
      </HistorySection>
    </div>
  )
}

function HistorySection({
  title,
  description,
  emptyText,
  children,
}: {
  title: string
  description: string
  emptyText: string
  children: ReactNode
}) {
  const hasItems = Array.isArray(children) ? children.length > 0 : !!children

  return (
    <section className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <div className="px-4">
        {hasItems ? children : (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{emptyText}</div>
        )}
      </div>
    </section>
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

function CapitalCompletionField({ company, loading = false }: { company?: Partial<Sirket> | null; loading?: boolean }) {
  const committedCapital = getCommittedCapitalAmount(company)
  const paidCapital = getPaidCapitalAmount(company)
  const ratio = committedCapital > 0 ? (paidCapital / committedCapital) * 100 : 0
  const progressPercent = Math.max(0, Math.min(100, ratio))

  if (loading && committedCapital <= 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="h-6 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="h-14 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
          <div className="h-14 animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">{formatCompletionRatio(ratio)}</div>
          <div className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">Yatırılan / taahhüt edilen sermaye</div>
        </div>
        <div className="grid gap-2 text-sm sm:min-w-[360px] sm:grid-cols-2">
          <CapitalMetric label="Taahhüt Edilen Sermaye" value={formatCurrencyAmount(committedCapital)} />
          <CapitalMetric label="Yatırılan Sermaye" value={formatCurrencyAmount(paidCapital)} />
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}

function CapitalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  )
}

function formatHistoryDateTime(value: unknown) {
  if (!value) return '-'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

function getHistoryTime(value: unknown) {
  if (!value) return 0
  const time = new Date(String(value)).getTime()
  return Number.isFinite(time) ? time : 0
}

function formatHistoryValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır'
  if (typeof value === 'number') return value.toLocaleString('tr-TR')
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return `${value.length} kayıt`
  if (typeof value === 'object') return 'Yapılandırılmış veri'
  return String(value)
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
  return labels[event] || 'Yaşam döngüsü olayı kaydedildi'
}

function formatHistoryFieldLabel(field: string) {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field]
  return field
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, first => first.toLocaleUpperCase('tr-TR'))
}

function formatLifecycleEventSummary(event: any) {
  const parts: string[] = []
  const oldStatus = event?.old_status ? formatLifecycleStatusLabel(event.old_status) : ''
  const newStatus = event?.new_status ? formatLifecycleStatusLabel(event.new_status) : ''

  if (oldStatus && newStatus) {
    parts.push(`Durum ${oldStatus} iken ${newStatus} oldu.`)
  } else if (newStatus) {
    parts.push(`Durum ${newStatus} oldu.`)
  }

  if (event?.event_date) {
    parts.push(`İşlem tarihi: ${formatLifecycleDate(event.event_date)}.`)
  }

  return parts.join(' ') || 'Olay kaydı oluşturuldu.'
}

function formatLifecycleStatusLabel(value: unknown) {
  return getCompanyLifecycleLabel(getCompanyLifecycleStatus({ record_status: value as CompanyLifecycleStatus }))
}

const RELATED_SECTION_LABELS: Record<string, string> = {
  partners: 'Ortaklar',
  representatives: 'Temsilciler',
  stakeholders: 'Paydaşlar',
  public_tax: 'Vergi bilgileri',
  public_sgk: 'SGK bilgileri',
  public_registry: 'Sicil bilgileri',
  public_licenses: 'Ruhsat bilgileri',
  public_channels: 'Dijital kamu kanalları',
  company_nace_codes: 'NACE kodları',
  current_ownership: 'Güncel ortaklık',
}
const SILENT_MODULE_CLOSED_RELATED_SECTIONS = new Set(['current_ownership'])

function RelatedSectionNotice({ data, sections }: { data?: Record<string, any>; sections: string[] }) {
  const statuses = (data?.related_status || {}) as CompanyRelatedStatusMap
  const errors = (data?.related_errors || {}) as CompanyRelatedErrorsMap
  const warnings = sections
    .map(section => {
      const status = statuses[section]
      if (!status || status === 'ok') return null
      if (status === 'module_closed' && SILENT_MODULE_CLOSED_RELATED_SECTIONS.has(section)) return null
      const label = RELATED_SECTION_LABELS[section] || section
      return errors[section] || (status === 'module_closed'
        ? `${label} modülü kapalı veya migration eksik.`
        : `${label} yüklenemedi.`)
    })
    .filter(Boolean) as string[]

  if (!warnings.length) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      <div className="flex gap-2">
        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          {warnings.map(warning => <div key={warning}>{warning}</div>)}
        </div>
      </div>
    </div>
  )
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
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{isOrganizationPartner(row) ? 'Tüzel Kişi' : 'Gerçek Kişi'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{formatPercent(row.share_ratio ?? row.current_share_ratio)}</td>
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

function isOrganizationPartner(row: Record<string, any>) {
  const kind = String(row.owner_kind || row.partner_type || '').trim().toLocaleLowerCase('tr-TR')
  return ['organization', 'company', 'sirket', 'şirket', 'tüzel_kisi'].includes(kind)
}

function formatCompletionRatio(value: number) {
  if (!Number.isFinite(value)) return '0%'
  return `${value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}%`
}

function formatCurrencyAmount(value: unknown) {
  const amount = toNumber(value)
  return amount.toLocaleString('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  })
}

function getCommittedCapitalAmount(company?: Partial<Sirket> | null) {
  const explicitCommitted = toNumber((company as any)?.committed_capital_amount)
  if (explicitCommitted > 0) return explicitCommitted
  const opening = (company as any)?.opening_details || {}
  const payload = opening?.payload_json && typeof opening.payload_json === 'object' ? opening.payload_json : {}
  return toNumber(
    payload.foundation_capital_amount
    ?? payload.capital_amount
    ?? opening.foundation_capital_amount
    ?? (company as any)?.foundation_capital_amount
    ?? (company as any)?.committed_capital_amount
  )
}

function getPaidCapitalAmount(company?: Partial<Sirket> | null) {
  return toNumber((company as any)?.paid_capital_amount)
}

function toNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0
  const trimmed = value.trim()
  if (!trimmed) return 0
  const direct = Number(trimmed)
  if (Number.isFinite(direct)) return direct
  const localized = Number(trimmed.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(localized) ? localized : 0
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
  const committedCapitalAmount = getCommittedCapitalAmount(company)
  const paidCapitalAmount = getPaidCapitalAmount(company)
  const capitalCompletionRatio = committedCapitalAmount > 0 ? (paidCapitalAmount / committedCapitalAmount) * 100 : 0

  return {
    ...company,
    is_deleted: !!company.is_deleted,
    committed_capital_amount: committedCapitalAmount,
    paid_capital_amount: paidCapitalAmount,
    capital_completion_ratio: capitalCompletionRatio,
    logo_url: extractLogoUrl((company as any).hero_images) || (company as any).logo_url || '',
    logo_url_light: extractLogoUrl((company as any).hero_images, false) || (company as any).logo_url_light || (company as any).logo_url || '',
    logo_url_dark: extractLogoUrl((company as any).hero_images, true) || (company as any).logo_url_dark || (company as any).logo_url_light || (company as any).logo_url || '',
    partners: (company.partners || []).map((partner: any) => {
      const parts = String(partner.partner_name || '').trim().split(/\s+/)
      return {
        ...partner,
        owner_kind: partner.owner_kind || (isOrganizationPartner(partner) ? 'organization' : 'person'),
        source_type: partner.source_type || (isOrganizationPartner(partner) ? 'external_organization' : 'external_person'),
        source_id: partner.source_id || partner.id,
        display_name: partner.display_name || partner.partner_name || '',
        identity_number: partner.identity_number || partner.identity_tax_number || '',
        share_ratio: partner.share_ratio ?? partner.current_share_ratio ?? '',
        voting_ratio: partner.voting_ratio ?? partner.current_voting_ratio ?? '',
        profit_ratio: partner.profit_ratio ?? partner.current_profit_ratio ?? '',
        has_representation_right: partner.has_representation_right ?? !!partner.signature_authority,
        status: partner.status || 'Aktif',
        history: partner.history || [],
        first_name: partner.first_name || parts.slice(0, -1).join(' ') || partner.partner_name || '',
        last_name: partner.last_name || (parts.length > 1 ? parts.at(-1) : ''),
        partner_type: isOrganizationPartner(partner) ? 'organization' : 'person',
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
