'use client'

/**
 * EntityForm - ERP Entity Form Component
 * 
 * A reusable form component that supports Create, View, and Edit modes
 * for any database entity. Designed to be the core of ERP data management pages.
 * 
 * Architecture:
 * - Hero Section: Left (Photo/Documents) | Right (Required Fields + Actions)
 * - Tabs: Detailed information sections
 * - No internal banner (PageBanner handles page header)
 * - Form Actions at bottom-right of Hero section
 * 
 * @example
 * <EntityForm
 *   mode="create"
 *   entityName="Çalışan"
 *   heroFields={[...]}
 *   tabs={[...]}
 *   onSave={handleSave}
 *   onCancel={handleCancel}
 * />
 */

import { useState, useEffect, ReactNode, useCallback, useMemo } from 'react'
import { Save, Loader2, Edit3, History, Clock, Plus, Trash2, Upload, Briefcase, LogOut, Building2, UserRound, FileText, RotateCcw, CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import { cn, formatPhoneInput, normalizeEmailInput, resolveTurkishIban } from '@/lib/utils'
import { ImageSlotUploader, ImageSlot, SlotImage } from './ImageSlotUploader'
import { DocumentSlotUploader, DocumentSlot, SlotDocument } from './DocumentSlotUploader'
import { IBANInput } from './IBANInput'
import { MasterIdentityGate } from './MasterIdentityGate'
import { AutomationBadge, type AutomationBadgeStatus } from './AutomationBadge'
import Modal from './Modal'
import type { IdentityGateConfig, IdentityGateResolveResult } from '@/lib/identity-gate'
import { COUNTRY_OPTIONS, normalizeCountryId } from '@/lib/reference/country-nationalities'
import { isSoftDeletedRecord } from '@/lib/forms/entityState'
import { companyService } from '@/lib/services/companyService'
import { organizationService } from '@/lib/services/organizationService'
import { ModuleDependencyNotice, type EntityAccessState, type ModuleDependency } from '@/lib/access/entityAccess'

/** Historical value entry */
export interface HistoryEntry {
  value: unknown
  date: string
  user?: string
}

/** Form field configuration */
export interface FormField {
  name: string
  key?: string
  label: string
  errorLabel?: string
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'textarea' | 'number' | 'checkbox' | 'section' | 'list' | 'iban' | 'document' | 'workLifecycle' | 'custom'
  required?: boolean
  options?: { value: string; label: string }[]
  searchable?: boolean
  placeholder?: string
  maxLength?: number
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'url' | 'search' | 'decimal'
  pattern?: string
  defaultValue?: any
  colSpan?: 1 | 2 | 3
  compact?: boolean
  visibleWhen?: any
  disabledWhen?: any
  requiredWhen?: FieldCondition
  requiredGroup?: string
  listConfig?: {
    addLabel?: string
    emptyText?: string
    maxItems?: number
    fields: FormField[]
  }
  /** History entries for this field */
  history?: HistoryEntry[]
  /** Marks fields that trigger automation and fill or derive other form fields. */
  automation?: FieldAutomationConfig
  /** Custom render function */
  render?: (props: { value: any; onChange: (val: any) => void; readOnly: boolean; data: Record<string, any>; mode: FormMode }) => ReactNode
}

export interface FieldAutomationConfig {
  status?: AutomationBadgeStatus | ((data: Record<string, any>, field: FormField) => AutomationBadgeStatus)
  sourceFields?: string[]
  targetFields?: string[]
  title?: string
  idleLabel?: string
  workingLabel?: string
  doneLabel?: string
  noDataLabel?: string
}

interface FieldCondition {
  field: string
  operator?: 'equals' | 'notEquals' | 'exists' | 'notExists' | 'empty' | 'notEmpty' | 'includes'
  value?: any
  equals?: any
  notEquals?: any
  includes?: any[]
}

interface TurkeyProvince {
  id: number
  name: string
  districts: Array<{ id: number; name: string }>
}

/** Tab configuration for grouping fields */
export interface FormTab {
  id: string
  label: string
  icon?: ReactNode
  fields: FormField[]
}

/** Form modes */
export type FormMode = 'create' | 'view' | 'edit' | 'passive'

export type FormLoadStageKey = 'snapshot' | 'detail' | 'master' | 'references'
export type FormLoadStageStatus = 'idle' | 'loading' | 'ready' | 'error' | 'skipped'

export interface FormLoadStage {
  key: FormLoadStageKey
  label: string
  status: FormLoadStageStatus
  description?: string
}

/** EntityForm props */
export interface EntityFormProps {
  /** Current form mode */
  mode: FormMode
  
  /** Entity display name (e.g., "Çalışan", "Müşteri") */
  entityName: string
  
  /** Entity name for title (singular) */
  entityNameSingular: string
  
  /** Hero section fields (critical/identity fields) - displayed in right panel */
  heroFields: FormField[]
  
  /** Tab sections for detailed information */
  tabs: FormTab[]
  
  /** Current data (for view/edit modes) */
  data?: Record<string, any>
  
  /** Loading state */
  loading?: boolean
  
  /** Saving state */
  saving?: boolean

  /** Deleting state */
  deleting?: boolean
  
  /** Whether the user has edit permission (future: auth integration) */
  canEdit?: boolean
  
  /** Whether the user has create permission (future: auth integration) */
  canCreate?: boolean

  /** Central page/module/permission state for scalable ERP access control. */
  access?: Partial<EntityAccessState>

  /** Missing optional module dependencies shown as field-level notices instead of crashing forms. */
  moduleDependencies?: ModuleDependency[]
  
  /** Custom hero left panel content (Photo, Documents, etc.) - overrides default */
  heroLeftPanel?: ReactNode

  /** Optional hero presentation controls for module-specific layouts */
  showHeroHeader?: boolean
  showMasterSummaryBadge?: boolean
  masterSummaryTitleAsField?: boolean
  masterSummaryMode?: MasterSummaryMode
  showResolvedMasterHeroFields?: boolean
  hideRoleHeroFields?: boolean
  showEmptyRoleHeroState?: boolean
  roleHeroCardTitle?: string
  
  /** Image slot configuration for default hero left panel */
  imageSlot?: {
    title?: string
    required?: boolean
    readOnly?: boolean
    dataField?: string
    slots?: ImageSlot[] | ((formData: Record<string, any>) => ImageSlot[])
  }
  
  /** Document slot configuration for default hero left panel */
  documentSlot?: {
    title?: string
    required?: boolean
    acceptedTypes?: string[]
    maxSizeMB?: number
    dataField?: string
    slots?: DocumentSlot[]
    aiBadge?: {
      label?: string
      title?: string
    }
  }
  
  /** Save handler - receives form data */
  onSave: (data: Record<string, any>, mode: FormMode) => Promise<void> | void
  
  /** Cancel/close handler */
  onCancel: () => void

  /** Delete handler - only for view/edit modes */
  onDelete?: () => Promise<void> | void

  /** Activation handler for passive records */
  onActivate?: () => Promise<void> | void

  /** Mode change handler (view -> edit) */
  onModeChange?: (mode: 'create' | 'view' | 'edit') => void

  /** Optional field change observer for parent-driven dynamic forms */
  onFieldChange?: (field: string, value: any, data: Record<string, any>) => void
  
  /** Additional actions in form action area (future: workflow) */
  additionalActions?: ReactNode
  
  /** Form-level error message */
  error?: string | null

  /** Progressive loading stages for snapshot, detail, master, and reference data. */
  loadStages?: FormLoadStage[]
  externalFieldErrors?: Record<string, string>
  onValidationError?: (missingFields: string[]) => void
  
  /** CSS class for container */
  className?: string
  
  /** Enable history tracking for all fields */
  enableHistory?: boolean

  identityGate?: IdentityGateConfig
  identityRoleScope?: Record<string, unknown>
  onIdentityResolved?: (result: IdentityGateResolveResult) => void
  onIdentityGateOpenExistingRole?: (roleRecord: Record<string, any>, result: IdentityGateResolveResult) => void
  onIdentityGateCancelDuplicate?: () => void
}

const DOCUMENTS_FORM_TAB_ID = '__documents__'

/** FieldHistoryIndicator Component */
function FieldHistoryIndicator({ history }: { history?: HistoryEntry[] }) {
  const [showTooltip, setShowTooltip] = useState(false)
  
  if (!history || history.length === 0) return null
  
  return (
    <div className="relative">
      <button
        type="button"
        title="Geçmiş değerleri göster"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="rounded-md p-1 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
      >
        <History size={14} />
      </button>
      
      {showTooltip && (
        <div className="absolute left-full ml-2 top-0 z-50 w-64 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
            <Clock size={14} className="text-gray-500" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Geçmiş Değerler</span>
          </div>
          <div className="space-y-2">
            {history.map((entry, idx) => (
              <div key={idx} className="text-xs">
                <span className="text-gray-500">{new Date(entry.date).toLocaleString('tr-TR')}</span>
                <span className="mx-1 text-gray-400">→</span>
                <span className="text-gray-900 dark:text-gray-100 font-medium">&quot;{formatHistoryValue(entry.value)}&quot;</span>
                {entry.user && (
                  <span className="block text-gray-400 mt-0.5">Değiştiren: {entry.user}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function formatHistoryValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Boş'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function MasterSummaryHero({
  result,
  locked,
  sourceData = {},
  readOnly = false,
  showBadge = true,
  titleAsField = false,
  mode = 'default',
  onFieldChange,
}: {
  result: IdentityGateResolveResult | null
  locked: boolean
  sourceData?: Record<string, any>
  readOnly?: boolean
  showBadge?: boolean
  titleAsField?: boolean
  mode?: MasterSummaryMode
  onFieldChange?: (field: string, value: any) => void
}) {
  const kind = result?.entityKind
  const master = result?.masterRecord || null
  const prefill = { ...(result?.prefill || {}), ...sourceData }
  const effectiveMode = mode === 'entityIdentity'
    ? kind === 'organization' ? 'organizationIdentity' : 'personIdentity'
    : mode
  const Icon = kind === 'organization' ? Building2 : UserRound
  const title = kind === 'organization'
    ? readFirst(master, prefill, ['legal_name', 'ticari_unvan', 'trade_name', 'display_name', 'short_name', 'kisa_unvan'])
    : readFirst(master, prefill, ['full_name', 'display_name', 'ad_soyad'])
      || [readFirst(master, prefill, ['first_name', 'ad']), readFirst(master, prefill, ['last_name', 'soyad'])].filter(Boolean).join(' ')

  const items = kind === 'organization'
    ? effectiveMode === 'organizationIdentity'
      ? [
          { label: 'Ticari Unvan', value: readFirst(master, prefill, ['legal_name', 'trade_name', 'ticari_unvan', 'display_name']), fieldKeys: ['ticari_unvan', 'legal_name', 'trade_name'] },
          { label: 'Kısa Ünvan', value: readFirst(master, prefill, ['short_name', 'kisa_unvan']), fieldKeys: ['kisa_unvan', 'short_name'] },
          { label: 'VKN', value: readFirst(master, prefill, ['tax_number', 'vkn_tckn', 'tax_id', 'identity_number']), fieldKeys: ['vkn_tckn', 'tax_number', 'tax_id', 'identity_number'] },
          { label: 'Vergi Dairesi', value: readFirst(master, prefill, ['tax_office', 'vergi_dairesi']), fieldKeys: ['vergi_dairesi', 'tax_office'] },
          { label: 'Şirket Türü', value: readFirst(master, prefill, ['organization_type', 'company_type', 'sirket_turu']), fieldKeys: ['sirket_turu', 'company_type', 'organization_type'], inputType: 'select' as const, options: [
            { value: 'anonim', label: 'Sermaye Şirketi - Anonim' },
            { value: 'limited', label: 'Sermaye Şirketi - Limited' },
            { value: 'komandit', label: 'Sermaye Şirketi - Komandit' },
            { value: 'kolektif', label: 'Şahıs Şirketi - Kolektif' },
            { value: 'adi_komandit', label: 'Şahıs Şirketi - Adi Komandit' },
            { value: 'adi_sirket', label: 'Şahıs Şirketi - Adi Şirket' },
          ] },
          { label: 'Kuruluş Tarihi', value: readFirst(master, prefill, ['foundation_date', 'kurulus_tarihi']), fieldKeys: ['kurulus_tarihi', 'foundation_date'], inputType: 'date' as const },
        ]
      : compactSummaryItems([
          { label: 'Kısa Ünvan', value: readFirst(master, prefill, ['short_name', 'kisa_unvan']) },
          { label: 'Vergi Dairesi', value: readFirst(master, prefill, ['tax_office', 'vergi_dairesi']) },
          { label: 'Telefon', value: readFirst(master, prefill, ['phone', 'telefon', 'phone_1']) },
          { label: 'E-posta', value: readFirst(master, prefill, ['email', 'email_1']) },
          { label: 'Adres', value: formatAddress(master, prefill) },
        ])
    : effectiveMode === 'personIdentity'
      ? [
          { label: 'Ad', value: readFirst(master, prefill, ['first_name', 'ad']), fieldKeys: ['first_name', 'ad'] },
          { label: 'Soyad', value: readFirst(master, prefill, ['last_name', 'soyad']), fieldKeys: ['last_name', 'soyad'] },
          { label: 'Doğum Tarihi', value: readFirst(master, prefill, ['birth_date', 'dogum_tarihi']), fieldKeys: ['birth_date', 'dogum_tarihi'], inputType: 'date' as const },
          { label: 'Doğum Yeri', value: readFirst(master, prefill, ['birth_place', 'dogum_yeri']), fieldKeys: ['birth_place', 'dogum_yeri'] },
          { label: 'Cinsiyet', value: readFirst(master, prefill, ['gender', 'cinsiyet']), fieldKeys: ['gender', 'cinsiyet'], inputType: 'select' as const, options: [{ value: 'erkek', label: 'Erkek' }, { value: 'kadin', label: 'Kadın' }] },
          { label: 'Mesleği', value: readFirst(master, prefill, ['occupation', 'profession', 'meslek']), fieldKeys: ['occupation', 'profession', 'meslek'] },
          { label: 'Kan Grubu', value: readFirst(master, prefill, ['blood_type', 'kan_grubu']), fieldKeys: ['blood_type', 'kan_grubu'], inputType: 'select' as const, options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'].map(value => ({ value, label: value })) },
        ]
    : compactSummaryItems([
        ...(titleAsField ? [{ label: 'Ad Soyad', value: title }] : []),
        { label: 'Uyruk', value: readFirst(master, prefill, ['nationality', 'uyruk', 'nationality_country']) },
        { label: 'Dogum', value: readFirst(master, prefill, ['birth_date', 'dogum_tarihi']) },
        { label: 'Telefon', value: readFirst(master, prefill, ['phone', 'cep_telefonu', 'telefon', 'phone_1']) },
        { label: 'E-posta', value: readFirst(master, prefill, ['email', 'email_1']) },
        { label: 'Adres', value: formatAddress(master, prefill) },
      ])

  if (locked) {
    return (
      <div className="col-span-2 lg:col-span-3 rounded-xl border border-dashed border-gray-300 bg-white/60 p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
        Master ozeti, kimlik eslestirmesi tamamlandiktan sonra burada gosterilecek.
      </div>
    )
  }

  if (!result) return null

  return (
    <div className="col-span-2 lg:col-span-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white p-2 text-emerald-700 shadow-sm dark:bg-gray-900 dark:text-emerald-300">
            <Icon size={18} />
          </div>
          {!titleAsField && effectiveMode !== 'organizationIdentity' && <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              {title || (kind === 'organization' ? 'Tuzel kisi master kaydi' : 'Gercek kisi master kaydi')}
            </h4>
          </div>}
        </div>
        {showBadge && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-gray-900 dark:text-emerald-300">
          Temel Bilgiler
        </span>}
      </div>
      {items.length > 0 && (
        <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {items.map(item => (
            <div key={item.label} className="rounded-lg border border-emerald-100 bg-white px-3 py-2 dark:border-emerald-900/50 dark:bg-gray-900">
              <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{item.label}</div>
              <MasterSummaryItemValue
                item={item}
                sourceData={sourceData}
                readOnly={readOnly}
                onFieldChange={onFieldChange}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function compactSummaryItems(items: MasterSummaryItem[]) {
  return items.filter(item => hasValue(item.value))
}

function readFirst(master: Record<string, any> | null, prefill: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    if (hasValue(prefill[key])) return prefill[key]
    if (hasValue(master?.[key])) return master?.[key]
  }
  return ''
}

function formatAddress(master: Record<string, any> | null, prefill: Record<string, any>) {
  const address = readFirst(master, prefill, ['address', 'adres'])
  const city = readFirst(master, prefill, ['city', 'il'])
  const district = readFirst(master, prefill, ['district', 'ilce'])
  return [address, district, city].filter(Boolean).join(', ')
}

function formatSummaryValue(value: unknown, item?: MasterSummaryItem) {
  if (item?.inputType === 'select' && item.options?.length) {
    const normalized = normalizeSummarySelectValue(value, item.options)
    return item.options.find(option => option.value === normalized)?.label || String(value || '')
  }
  if (isDateLikeValue(value)) return formatDateForDisplay(value)
  if (Array.isArray(value)) return value.length ? `${value.length} kayit` : ''
  if (value && typeof value === 'object') return 'Kayitli'
  return String(value || '')
}

function MasterSummaryItemValue({
  item,
  sourceData,
  readOnly,
  onFieldChange,
}: {
  item: MasterSummaryItem
  sourceData: Record<string, any>
  readOnly: boolean
  onFieldChange?: (field: string, value: any) => void
}) {
  const fieldName = item.fieldKeys ? pickEditableFieldName(sourceData, item.fieldKeys) : null
  const canEdit = !!fieldName && !!onFieldChange && !readOnly
  const inputClass = "mt-1 w-full rounded-md border border-emerald-100 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-emerald-900/50 dark:bg-gray-950 dark:text-white"

  if (!canEdit) {
    return <div className="mt-0.5 truncate text-sm text-gray-900 dark:text-white">{formatSummaryValue(item.value, item)}</div>
  }

  if (item.inputType === 'select') {
    const selectValue = normalizeSummarySelectValue(item.value, item.options)
    return (
      <select
        value={selectValue}
        onChange={(event) => onFieldChange(fieldName, event.target.value)}
        className={inputClass}
      >
        <option value="">Seçiniz</option>
        {item.options?.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    )
  }

  return (
    <input
      type="text"
      value={item.inputType === 'date' ? formatDateForDisplay(item.value) : String(item.value || '')}
      placeholder={item.inputType === 'date' ? 'gg.aa.yyyy' : undefined}
      onChange={(event) => onFieldChange(fieldName, item.inputType === 'date' ? normalizeDateDisplayInput(event.target.value) : event.target.value)}
      className={inputClass}
    />
  )
}

function normalizeSummarySelectValue(value: unknown, options: MasterSummaryItem['options']) {
  const text = String(value || '')
  if (!text || !options?.length) return text
  const exact = options.find(option => option.value === text)
  if (exact) return exact.value
  const lowerText = text.toLocaleLowerCase('tr-TR')
  const byValue = options.find(option => option.value.toLocaleLowerCase('tr-TR') === lowerText)
  if (byValue) return byValue.value
  const byLabel = options.find(option => option.label.toLocaleLowerCase('tr-TR') === lowerText)
  return byLabel?.value || text
}

function pickEditableFieldName(sourceData: Record<string, any>, fieldKeys: string[]) {
  return fieldKeys.find(key => Object.prototype.hasOwnProperty.call(sourceData, key)) || fieldKeys[0]
}

function isDateLikeValue(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)
}

function formatDateForDisplay(value: unknown) {
  const text = String(value || '').trim()
  if (!text) return ''
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`
  return text
}

function normalizeDateDisplayInput(value: string) {
  const text = value.trim()
  const displayMatch = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (displayMatch) return `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}`
  return text
}

function formatGender(value: unknown) {
  const normalized = String(value || '').toLocaleLowerCase('tr-TR')
  if (normalized === 'erkek') return 'Erkek'
  if (normalized === 'kadin' || normalized === 'kadın') return 'Kadın'
  return String(value || '')
}

function isMasterIdentityHeroField(field: FormField) {
  if (field.type === 'section') return false
  return MASTER_IDENTITY_FIELD_NAMES.has(field.name)
}

function FormLoadStages({ stages }: { stages?: FormLoadStage[] }) {
  const visibleStages = (stages || []).filter(stage => stage.status !== 'idle' && stage.status !== 'skipped')
  if (!visibleStages.length) return null

  return (
    <div className="m-4 rounded-lg border border-sky-100 bg-sky-50/70 p-3 dark:border-sky-900/50 dark:bg-sky-950/20">
      <div className="flex flex-wrap items-center gap-2">
        {visibleStages.map(stage => (
          <div
            key={stage.key}
            className={cn(
              "inline-flex min-h-8 items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
              stage.status === 'ready' && "border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900/70 dark:bg-gray-900 dark:text-emerald-300",
              stage.status === 'loading' && "border-sky-200 bg-white text-sky-700 dark:border-sky-900/70 dark:bg-gray-900 dark:text-sky-300",
              stage.status === 'error' && "border-red-200 bg-white text-red-700 dark:border-red-900/70 dark:bg-gray-900 dark:text-red-300",
            )}
            title={stage.description}
          >
            {stage.status === 'ready' ? (
              <CheckCircle2 size={14} />
            ) : stage.status === 'loading' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : stage.status === 'error' ? (
              <AlertCircle size={14} />
            ) : (
              <Circle size={14} />
            )}
            <span>{stage.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildIdentityResultFromExistingData(
  config: IdentityGateConfig | undefined,
  source: Record<string, any>
): IdentityGateResolveResult | null {
  if (!config?.enabled) return null
  const master = source.master && typeof source.master === 'object'
    ? source.master
    : source.masterRecord && typeof source.masterRecord === 'object'
      ? source.masterRecord
      : null
  const entityKind = source.master_entity_kind === 'organization' || source.organization_id
    ? 'organization'
    : 'person'
  const masterRecord = master || extractMasterLikeRecord(entityKind, source)

  if (!source.person_id && !source.organization_id && !master) return null

  return {
    state: 'ready_for_edit',
    entityKind,
    masterFound: !!master || !!source.person_id || !!source.organization_id,
    masterRecord,
    roleFound: true,
    roleRecord: source.role && typeof source.role === 'object' ? source.role : source,
    prefill: masterRecord,
    message: 'Kayit master kimlik ile bagli.',
  }
}

function extractMasterLikeRecord(kind: 'person' | 'organization', source: Record<string, any>) {
  if (kind === 'organization') {
    return {
      id: source.organization_id || source.master_record_id || null,
      legal_name: source.legal_name || source.trade_name || source.ticari_unvan || source.display_name || '',
      short_name: source.short_name || source.kisa_unvan || '',
      country: source.country || source.ulke || 'TR',
      tax_number: source.tax_number || source.vkn_tckn || source.identity_number || source.tckn_vkn || '',
      registration_number: source.registration_number || source.ticaret_sicil_no || source.mersis_no || '',
      tax_office: source.tax_office || source.vergi_dairesi || '',
      phone: source.phone || source.telefon || '',
      email: source.email || '',
      address: source.address || source.adres || '',
      city: source.city || source.il || '',
      district: source.district || source.ilce || '',
    }
  }

  return {
    id: source.person_id || source.master_record_id || null,
    first_name: source.first_name || source.ad || '',
    last_name: source.last_name || source.soyad || '',
    full_name: source.full_name || source.display_name || [source.ad, source.soyad].filter(Boolean).join(' '),
    nationality: source.nationality || source.uyruk || source.nationality_country || 'TR',
    national_id: source.national_id || source.tc_kimlik || '',
    passport_no: source.passport_no || source.pasaport_no || '',
    birth_date: source.birth_date || source.dogum_tarihi || '',
    birth_place: source.birth_place || source.dogum_yeri || '',
    gender: source.gender || source.cinsiyet || '',
    phone: source.phone || source.cep_telefonu || source.telefon || '',
    email: source.email || '',
    address: source.address || source.adres || '',
    city: source.city || source.il || '',
    district: source.district || source.ilce || '',
  }
}

type MasterSummaryItem = {
  label: string
  value: unknown
  fieldKeys?: string[]
  inputType?: 'text' | 'date' | 'select'
  options?: { value: string; label: string }[]
}

type MasterSummaryMode = 'default' | 'personIdentity' | 'organizationIdentity' | 'entityIdentity'

const MASTER_IDENTITY_FIELD_NAMES = new Set([
  'ad',
  'soyad',
  'first_name',
  'last_name',
  'full_name',
  'display_name',
  'person_or_entity_type',
  'person_kind',
  'partner_type',
  'stakeholder_type',
  'trade_name',
  'legal_name',
  'ticari_unvan',
  'kisa_unvan',
  'short_name',
  'uyruk',
  'nationality',
  'nationality_country',
  'tc_kimlik',
  'national_id',
  'pasaport_no',
  'passport_no',
  'identity_number',
  'tax_id',
  'vkn_tckn',
  'tax_number',
  'ticaret_sicil_no',
  'registration_number',
  'mersis_no',
  'dogum_tarihi',
  'birth_date',
  'dogum_yeri',
  'birth_place',
  'cinsiyet',
  'gender',
  'occupation',
  'profession',
  'meslek',
  'blood_type',
  'kan_grubu',
  'vergi_dairesi',
  'tax_office',
  'sirket_turu',
  'company_type',
  'foundation_date',
  'kurulus_tarihi',
  'telefon',
  'phone',
  'cep_telefonu',
  'email',
  'adres',
  'address',
  'il',
  'city',
  'ilce',
  'district',
  'telefonlar',
  'epostalar',
])

function buildChangedPayload(nextData: Record<string, any>, previousData: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(nextData).filter(([key, value]) => !areFormValuesEqual(value, previousData[key]))
  )
}

function areFormValuesEqual(nextValue: unknown, previousValue: unknown) {
  return stableStringifyForDiff(nextValue) === stableStringifyForDiff(previousValue)
}

function stableStringifyForDiff(value: unknown): string {
  return JSON.stringify(normalizeForDiff(value))
}

function normalizeForDiff(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalizeForDiff)
  if (!value || typeof value !== 'object') return value === undefined ? null : value

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([key, item]) =>
      item !== undefined &&
      typeof item !== 'function' &&
      key !== 'file' &&
      key !== 'uploadedAt' &&
      key !== 'uploaded_at'
    )
    .sort(([a], [b]) => a.localeCompare(b))

  return Object.fromEntries(entries.map(([key, item]) => [key, normalizeForDiff(item)]))
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function normalizeStoredImages(value: unknown): SlotImage[] {
  const images = Array.isArray(value) ? value : value ? [value] : []

  return images
    .filter((image): image is Record<string, any> => !!image && typeof image === 'object')
    .map(image => ({
      slotId: image.slotId || image.slot_id || 'photo',
      previewUrl: image.previewUrl || image.preview_url || image.url || image.signedUrl || image.signed_url,
      name: image.name || image.file_name || image.fileName || 'Görsel',
      size: Number(image.size || 0),
      uploadedAt: image.uploadedAt ? new Date(image.uploadedAt) : undefined,
    }))
}

function serializeImageForStorage(image: SlotImage) {
  return {
    slotId: image.slotId,
    name: image.name,
    size: image.size || image.file?.size || 0,
    uploadedAt: image.uploadedAt?.toISOString?.() || new Date().toISOString(),
    url: image.previewUrl,
  }
}

function normalizeStoredDocuments(value: unknown, fallbackSlotId = 'cv'): SlotDocument[] {
  const docs = Array.isArray(value) ? value : value ? [value] : []

  return docs
    .filter((doc): doc is Record<string, any> => !!doc && typeof doc === 'object')
    .map(doc => {
      const url = doc.url || doc.previewUrl || doc.preview_url || doc.signedUrl || doc.signed_url || doc.file_url || doc.download_url
      const inferredType = doc.type || doc.mime_type || doc.mimeType || doc.file_type || inferDocumentMimeFromUrl(url) || 'application/octet-stream'
      return {
        slotId: doc.slotId || doc.slot_id || fallbackSlotId,
        documentId: doc.documentId || doc.document_id,
        documentLinkId: doc.documentLinkId || doc.document_link_id || doc.link_id,
        storagePath: doc.storagePath || doc.storage_path,
        name: doc.name || doc.file_name || doc.fileName || doc.document_title || doc.title || (inferredType === 'application/pdf' ? 'Belge.pdf' : 'Belge'),
        size: Number(doc.size || doc.file_size || 0),
        type: inferredType,
        uploadedAt: doc.uploadedAt || doc.uploaded_at ? new Date(doc.uploadedAt || doc.uploaded_at) : undefined,
        updatedAt: doc.updatedAt || doc.updated_at ? new Date(doc.updatedAt || doc.updated_at) : undefined,
        deletedAt: doc.deletedAt || doc.deleted_at ? new Date(doc.deletedAt || doc.deleted_at) : undefined,
        replacedAt: doc.replacedAt || doc.replaced_at ? new Date(doc.replacedAt || doc.replaced_at) : undefined,
        status: doc.status,
        version: Number(doc.version || 0) || undefined,
        slotTitle: doc.slotTitle || doc.slot_title,
        isDeleted: Boolean(doc.isDeleted || doc.is_deleted),
        url,
        thumbnailUrl: doc.thumbnailUrl || doc.thumbnail_url || doc.preview_thumb_url || doc.preview_image_url,
      }
    })
}

function inferDocumentMimeFromUrl(value?: string) {
  const match = value?.match(/^data:([^;,]+)[;,]/i)
  return match?.[1]?.toLowerCase() || ''
}

function serializeDocumentForStorage(doc: SlotDocument) {
  const url = doc.url || doc.previewUrl
  const thumbnailUrl = doc.thumbnailUrl && isPersistableThumbnailUrl(doc.thumbnailUrl) ? doc.thumbnailUrl : undefined
  return {
    slotId: doc.slotId,
    storagePath: doc.storagePath,
    documentId: doc.documentId,
    documentLinkId: doc.documentLinkId,
    name: doc.name,
    size: doc.size,
    type: doc.type,
    uploadedAt: serializeDocumentDate(doc.uploadedAt) || new Date().toISOString(),
    updatedAt: serializeDocumentDate(doc.updatedAt),
    deletedAt: serializeDocumentDate(doc.deletedAt),
    replacedAt: serializeDocumentDate(doc.replacedAt),
    status: doc.status,
    version: doc.version,
    slotTitle: doc.slotTitle,
    isDeleted: doc.isDeleted,
    url: doc.storagePath || !url || url.startsWith('blob:') || url.startsWith('data:') ? undefined : url,
    thumbnailUrl
  }
}

function serializeDocumentDate(value?: Date | string) {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function getDocumentSaveTimestamp(doc: SlotDocument) {
  const value = doc.updatedAt || doc.uploadedAt || doc.replacedAt || doc.deletedAt
  if (!value) return 0
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function isActiveStoredDocument(doc: SlotDocument) {
  return !doc.isDeleted && doc.status !== 'deleted' && doc.status !== 'archived'
}

function getLatestActiveStoredDocument(documents: SlotDocument[], slotId: string) {
  return documents
    .filter(document => document.slotId === slotId && isActiveStoredDocument(document))
    .sort((a, b) => (b.version || 0) - (a.version || 0) || getDocumentSaveTimestamp(b) - getDocumentSaveTimestamp(a))[0]
}

function isPersistableThumbnailUrl(value: string) {
  if (!value.startsWith('data:')) return true
  return value.startsWith('data:image/svg+xml')
}

async function uploadDocumentFile(document: SlotDocument) {
  if (!document.file) return document

  const body = new FormData()
  body.append('file', document.file)
  body.append('slotId', document.slotId)

  const response = await fetch('/api/uploads/documents', {
    method: 'POST',
    body,
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(result.error || 'Belge yüklenemedi')
  }

  return {
    ...document,
    storagePath: result.storagePath,
    url: result.url,
    previewUrl: result.url,
    thumbnailUrl: document.type?.startsWith('image/') ? result.url : document.thumbnailUrl,
    name: document.name || result.name || document.file.name,
    size: document.size || result.size || document.file.size,
    type: document.type || result.type || document.file.type,
  }
}

function getDocumentSlotStorageField(slot: DocumentSlot) {
  if (slot.storageField) return slot.storageField
  if (slot.id === 'cv') return 'cv_belgesi'
  if (slot.id === 'diploma') return 'diploma_belgesi'
  return undefined
}

const SGK_PROVINCE_CODES: Record<string, string> = {
  '001': 'Adana',
  '002': 'Adıyaman',
  '003': 'Afyonkarahisar',
  '004': 'Ağrı',
  '005': 'Amasya',
  '006': 'Ankara',
  '007': 'Antalya',
  '008': 'Artvin',
  '009': 'Aydın',
  '010': 'Balıkesir',
  '011': 'Bilecik',
  '012': 'Bingöl',
  '013': 'Bitlis',
  '014': 'Bolu',
  '015': 'Burdur',
  '016': 'Bursa',
  '017': 'Çanakkale',
  '018': 'Çankırı',
  '019': 'Çorum',
  '020': 'Denizli',
  '021': 'Diyarbakır',
  '022': 'Edirne',
  '023': 'Elazığ',
  '024': 'Erzincan',
  '025': 'Erzurum',
  '026': 'Eskişehir',
  '027': 'Gaziantep',
  '028': 'Giresun',
  '029': 'Gümüşhane',
  '030': 'Hakkari',
  '031': 'Hatay',
  '032': 'Isparta',
  '033': 'Mersin',
  '034': 'İstanbul',
  '035': 'İzmir',
  '036': 'Kars',
  '037': 'Kastamonu',
  '038': 'Kayseri',
  '039': 'Kırklareli',
  '040': 'Kırşehir',
  '041': 'Kocaeli',
  '042': 'Konya',
  '043': 'Kütahya',
  '044': 'Malatya',
  '045': 'Manisa',
  '046': 'Kahramanmaraş',
  '047': 'Mardin',
  '048': 'Muğla',
  '049': 'Muş',
  '050': 'Nevşehir',
  '051': 'Niğde',
  '052': 'Ordu',
  '053': 'Rize',
  '054': 'Sakarya',
  '055': 'Samsun',
  '056': 'Siirt',
  '057': 'Sinop',
  '058': 'Sivas',
  '059': 'Tekirdağ',
  '060': 'Tokat',
  '061': 'Trabzon',
  '062': 'Tunceli',
  '063': 'Şanlıurfa',
  '064': 'Uşak',
  '065': 'Van',
  '066': 'Yozgat',
  '067': 'Zonguldak',
  '068': 'Aksaray',
  '069': 'Bayburt',
  '070': 'Karaman',
  '071': 'Kırıkkale',
  '072': 'Batman',
  '073': 'Şırnak',
  '074': 'Bartın',
  '075': 'Ardahan',
  '076': 'Iğdır',
  '077': 'Yalova',
  '078': 'Karabük',
  '079': 'Kilis',
  '080': 'Osmaniye',
  '081': 'Düzce',
}

function parseSgkWorkplaceNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 26)
  if (digits.length < 19) return { digits, provinceLabel: '', branchLabel: '' }

  const oldBranch = digits.slice(5, 7)
  const newBranch = digits.slice(7, 9)
  const provinceCode = digits.slice(16, 19)
  const provinceName = SGK_PROVINCE_CODES[provinceCode]

  return {
    digits,
    provinceLabel: provinceName ? `${provinceCode} - ${provinceName}` : provinceCode,
    branchLabel: `Eski ${oldBranch} / Yeni ${newBranch}`,
  }
}

function SearchableSelectField({
  field,
  value,
  disabled,
  className,
  onChange,
}: {
  field: FormField
  value: string
  disabled: boolean
  className: string
  onChange: (value: string) => void
}) {
  const selectedLabel = field.options?.find(option => option.value === value)?.label || value || ''
  const [query, setQuery] = useState(selectedLabel)
  const [open, setOpen] = useState(false)
  const options = field.options || []
  const filteredOptions = options
    .filter(option => {
      const q = query.toLocaleLowerCase('tr-TR')
      return option.label.toLocaleLowerCase('tr-TR').includes(q) || option.value.toLocaleLowerCase('tr-TR').includes(q)
    })
    .slice(0, 80)

  useEffect(() => {
    setQuery(selectedLabel)
  }, [selectedLabel])

  const commitIfExactMatch = (text: string) => {
    const normalized = text.trim().toLocaleLowerCase('tr-TR')
    const exact = options.find(option =>
      option.label.toLocaleLowerCase('tr-TR') === normalized ||
      option.value.toLocaleLowerCase('tr-TR') === normalized
    )
    if (exact) {
      setQuery(exact.label)
      onChange(exact.value)
      return
    }
    setQuery(selectedLabel)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={(event) => {
          event.currentTarget.select()
          setOpen(true)
        }}
        onBlur={() => {
          commitIfExactMatch(query)
          window.setTimeout(() => setOpen(false), 120)
        }}
        placeholder={field.placeholder || 'Yazarak arayın'}
        readOnly={disabled}
        className={className}
      />
      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {filteredOptions.length > 0 ? filteredOptions.map((opt, index) => (
            <button
              key={`${opt.value}-${index}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery(opt.label)
                onChange(opt.value)
                setOpen(false)
              }}
              className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-blue-50 dark:text-gray-100 dark:hover:bg-blue-950/40"
            >
              {opt.label}
            </button>
          )) : (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Sonuç bulunamadı</div>
          )}
        </div>
      )}
    </div>
  )
}

const CV_DOCUMENT_ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

function matchesCondition(condition: FieldCondition | undefined, data: Record<string, any>): boolean {
  if (!condition) return true
  const value = data[condition.field]
  if (condition.operator === 'equals') return value === condition.value
  if (condition.operator === 'notEquals') return value !== condition.value
  if (condition.operator === 'exists') return value !== undefined && value !== null && value !== ''
  if (condition.operator === 'notExists') return value === undefined || value === null || value === ''
  if (condition.operator === 'empty') return value === undefined || value === null || value === ''
  if (condition.operator === 'notEmpty') return value !== undefined && value !== null && value !== ''
  if (condition.operator === 'includes') return Array.isArray(value) && value.includes(condition.value)
  if ('equals' in condition) return value === condition.equals
  if ('notEquals' in condition) return value !== condition.notEquals
  if (condition.includes) return condition.includes.includes(value)
  return true
}

function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  return value !== undefined && value !== null && value !== ''
}

function fieldName(field: FormField) {
  return field.name || field.key || ''
}

function hasDraftValue(row: Record<string, any>, fields: FormField[]) {
  return fields.some(field => hasValue(row[fieldName(field)]))
}

function stripDraftMarker(row: Record<string, any>) {
  const { __draft, ...clean } = row
  return clean
}

function finalizeListValue(value: unknown, fields: FormField[]) {
  if (!Array.isArray(value)) return []
  return value
    .filter((row): row is Record<string, any> => !!row && typeof row === 'object')
    .filter(row => !row.__draft || hasDraftValue(row, fields))
    .map(stripDraftMarker)
}

function flattenFields(fields: FormField[]): FormField[] {
  return fields.flatMap(field => [
    field,
    ...(field.listConfig?.fields ? flattenFields(field.listConfig.fields) : [])
  ])
}

function isLongSelectField(field: FormField) {
  return field.type === 'select' && (field.options?.length || 0) >= 12
}

function getListCellValue(row: Record<string, any>, item: FormField) {
  const name = fieldName(item)
  const value = row[name]
  if (value) return value

  if (name === 'ad_soyad') {
    return [row.ad, row.soyad].filter(Boolean).join(' ')
  }

  if (name === 'akrabalik_bicimi') {
    return row.yakinlik
  }

  return value
}

function ListField({
  field,
  value,
  onChange,
  readOnly,
  disabled,
}: {
  field: FormField
  value: any[]
  onChange: (value: any[]) => void
  readOnly: boolean
  disabled: boolean
}) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fields = field.listConfig?.fields || []
  const allRows = Array.isArray(value) ? value.filter((row): row is Record<string, any> => !!row && typeof row === 'object') : []
  const rows = allRows.filter(row => !row.__draft)
  const draft = allRows.find(row => row.__draft) || {}
  const maxItems = field.listConfig?.maxItems
  const maxItemsReached = typeof maxItems === 'number' && rows.length >= maxItems

  const inputClass = cn(
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900",
    "[-webkit-text-fill-color:#111827] [color-scheme:light]",
    "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
    "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-900 disabled:[-webkit-text-fill-color:#111827]",
    "dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:[-webkit-text-fill-color:#ffffff] dark:[color-scheme:dark]",
    "dark:disabled:bg-gray-800 dark:disabled:text-gray-100 dark:disabled:[-webkit-text-fill-color:#f3f4f6]"
  )

  const setDraftValue = (name: string, nextValue: any) => {
    const nextDraft = {
      ...draft,
      [name]: nextValue,
      ...(name === 'devam_ediyor' && nextValue ? { mezuniyet_tarihi: '' } : {})
    }
    onChange(hasDraftValue(nextDraft, fields) ? [...rows, { ...nextDraft, __draft: true }] : rows)
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const formatDraftValue = (item: FormField, value: string) => {
    if (item.type === 'tel') return formatPhoneInput(value)
    if (item.type === 'email') return normalizeEmailInput(value)
    return value
  }

  const addRow = () => {
    if (maxItemsReached) return

    const nextErrors: Record<string, string> = {}
    fields.forEach(item => {
      const name = fieldName(item)
      if (item.required && !draft[name]) {
        nextErrors[item.name] = `${item.label} zorunludur`
      } else if (item.pattern && draft[name]) {
        const regex = new RegExp(`^(?:${item.pattern})$`)
        if (!regex.test(String(draft[name]))) {
          nextErrors[item.name] = `${item.label} formatı geçersiz`
        }
      }
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onChange([...rows, stripDraftMarker(draft)])
  }

  const removeRow = (index: number) => {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index))
  }

  const renderDraftInput = (item: FormField) => {
    const name = fieldName(item)
    const itemDisabled = disabled || readOnly || (item.disabledWhen ? matchesCondition(item.disabledWhen, draft) : false)

    if (item.type === 'checkbox') {
      return (
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
                checked={!!draft[name]}
                onChange={(event) => setDraftValue(name, event.target.checked)}
                disabled={itemDisabled}
                className="h-4 w-4 rounded border-gray-400 bg-white text-blue-600 accent-blue-600 focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:accent-blue-500"
              />
          {item.label}
        </label>
      )
    }

    if (item.type === 'select') {
      return (
        <select
          value={draft[name] || ''}
          onChange={(event) => setDraftValue(name, event.target.value)}
          disabled={itemDisabled}
          className={inputClass}
        >
          <option value="">Seçiniz</option>
          {item.options?.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      )
    }

    if (item.type === 'document') {
      return (
        <label className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
          <Upload size={16} />
          <input
            type="file"
            className="hidden"
            disabled={itemDisabled}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              setDraftValue(name, {
                name: file.name,
                size: file.size,
                type: file.type,
              })
            }}
          />
        </label>
      )
    }

    if (item.type === 'date') {
      return (
        <input
          type="date"
          value={draft[name] || ''}
          onChange={(event) => setDraftValue(name, event.target.value)}
          disabled={itemDisabled}
          className={inputClass}
        />
      )
    }

    return (
      <input
        type={item.type === 'email' ? 'email' : item.type === 'tel' ? 'tel' : 'text'}
        value={draft[name] || ''}
        onChange={(event) => setDraftValue(name, formatDraftValue(item, event.target.value))}
        placeholder={item.placeholder}
        inputMode={item.inputMode}
        maxLength={item.maxLength}
        pattern={item.pattern}
        disabled={itemDisabled}
        className={inputClass}
      />
    )
  }

  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
          {field.listConfig?.emptyText || 'Henüz kayıt eklenmedi.'}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="grid flex-1 grid-cols-1 gap-1 text-sm text-gray-700 dark:text-gray-300 md:grid-cols-2">
                {fields.filter(item => item.type !== 'checkbox').map(item => (
                  <div key={fieldName(item)}>
                    <span className="text-xs text-gray-500">{item.label}: </span>
                    <span>{getListCellValue(row, item) || '-'}</span>
                  </div>
                ))}
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && (
        <div className={cn("rounded-lg border border-gray-200 dark:border-gray-700 p-2", disabled && "opacity-50")}>
          {maxItemsReached && (
            <div className="mb-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              En fazla {maxItems} kayıt eklenebilir.
            </div>
          )}
          <div className="flex flex-wrap items-end gap-2">
            {fields.map(item => (
              <div key={fieldName(item)} className={cn(item.type === 'document' ? 'w-10' : 'min-w-36 flex-1')}>
                {item.type !== 'checkbox' && (
                  <label className={cn("mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400", item.type === 'document' && "sr-only")}>
                    {item.label}
                    {item.required && <span className="ml-1 text-red-500">*</span>}
                  </label>
                )}
                {renderDraftInput(item)}
                {errors[fieldName(item)] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[fieldName(item)]}</p>}
              </div>
            ))}
            <button
              type="button"
              onClick={addRow}
              disabled={disabled || maxItemsReached}
              className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              title={field.listConfig?.addLabel || 'Listeye Ekle'}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const WORK_TYPE_OPTIONS = [
  { value: 'tam_zamanli', label: 'Tam Zamanlı' },
  { value: 'yari_zamanli', label: 'Yarı Zamanlı' },
  { value: 'vardiyali', label: 'Vardiyalı' },
  { value: 'proje_bazli', label: 'Proje Bazlı' },
  { value: 'uzaktan', label: 'Uzaktan' },
]

const CONTRACT_TYPE_OPTIONS = [
  { value: 'disaridan', label: 'Dışarıdan' },
  { value: 'sozlesmeli', label: 'Sözleşmeli' },
  { value: 'stajyer', label: 'Stajyer' },
  { value: 'deneme_sureli', label: 'Deneme Süreli' },
  { value: 'belirsiz_sureli', label: 'Belirsiz Süreli' },
  { value: 'belirli_sureli', label: 'Belirli Süreli' },
]

function optionLabel(options: Array<{ value: string; label: string }>, value: unknown) {
  return options.find(option => option.value === value)?.label || String(value || '-')
}

function WorkLifecycleField({
  formData,
  onChange,
  readOnly,
}: {
  formData: Record<string, any>
  onChange: (field: string, value: any) => void
  readOnly: boolean
}) {
  const [modal, setModal] = useState<'hire' | 'exit' | null>(null)
  const [draft, setDraft] = useState<Record<string, any>>({})
  const [modalErrors, setModalErrors] = useState<Record<string, string>>({})
  const [companies, setCompanies] = useState<Array<{ id: string; label: string }>>([])
  const [units, setUnits] = useState<Array<{ id: string; label: string }>>([])
  const [positions, setPositions] = useState<Array<{ id: string; label: string; birim_id?: string | null }>>([])
  const isHired = !!formData.sgk_giris
  const isExited = !!formData.isten_ayrilis
  const companyLabel = companies.find(company => company.id === formData.sirket_id)?.label || formData.sirket_id || '-'
  const unitLabel = units.find(unit => unit.id === formData.birim_id)?.label || formData.birim_id || '-'
  const positionLabel = positions.find(position => position.id === formData.kadro_id)?.label || formData.gorev || '-'
  const filteredPositions = draft.birim_id ? positions.filter(position => !position.birim_id || position.birim_id === draft.birim_id) : positions

  useEffect(() => {
    let cancelled = false

    async function fetchReferences() {
      try {
        const [companyPayload, organizationPayload] = await Promise.all([
          companyService.list(),
          organizationService.list(),
        ])
        if (cancelled) return

        setCompanies((companyPayload.data || []).map((company: Record<string, any>) => ({
          id: company.id,
          label: company.kisa_unvan || company.ticari_unvan || company.sirket_kodu || company.id,
        })))
        setUnits((organizationPayload.birimler || []).map((unit: Record<string, any>) => ({
          id: unit.id,
          label: unit.ad || unit.name || unit.id,
        })))
        setPositions((organizationPayload.kadrolar || []).map((position: Record<string, any>) => ({
          id: position.id,
          label: position.unvan || position.title || position.name || position.id,
          birim_id: position.birim_id || null,
        })))
      } catch {
        if (cancelled) return
        setCompanies([])
        setUnits([])
        setPositions([])
      }
    }

    fetchReferences()
    return () => {
      cancelled = true
    }
  }, [])

  const openModal = (nextModal: 'hire' | 'exit') => {
    setDraft(nextModal === 'hire'
      ? {
          sgk_giris: formData.sgk_giris || '',
          sirket_id: formData.sirket_id || (companies.length === 1 ? companies[0].id : ''),
          birim_id: formData.birim_id || '',
          kadro_id: formData.kadro_id || '',
          gorev: formData.gorev || '',
          calisma_tipi: formData.calisma_tipi || 'tam_zamanli',
          is_akdi_bicimi: formData.is_akdi_bicimi || 'sozlesmeli',
          ise_giris_belgeleri: formData.ise_giris_belgeleri || [],
        }
      : {
          isten_ayrilis: formData.isten_ayrilis || '',
          isten_cikis_belgeleri: formData.isten_cikis_belgeleri || [],
        })
    setModal(nextModal)
  }

  const closeModal = () => {
    setModal(null)
    setDraft({})
    setModalErrors({})
  }

  const saveModal = () => {
    if (modal === 'hire') {
      if (!draft.sgk_giris) {
        setModalErrors({ sgk_giris: 'İşe başlangıç tarihi zorunludur' })
        return
      }

      onChange('sgk_giris', draft.sgk_giris || '')
      onChange('sirket_id', draft.sirket_id || '')
      onChange('birim_id', draft.birim_id || '')
      onChange('kadro_id', draft.kadro_id || '')
      onChange('gorev', draft.gorev || '')
      onChange('calisma_tipi', draft.calisma_tipi || '')
      onChange('is_akdi_bicimi', draft.is_akdi_bicimi || '')
      onChange('ise_giris_belgeleri', draft.ise_giris_belgeleri || [])
      onChange('calisma_durumu', 'gorevde')
    }

    if (modal === 'exit') {
      onChange('isten_ayrilis', draft.isten_ayrilis || '')
      onChange('isten_cikis_belgeleri', draft.isten_cikis_belgeleri || [])
      onChange('calisma_durumu', draft.isten_ayrilis ? 'ayrilmis' : 'gorevde')
    }

    closeModal()
  }

  const addDocument = async (field: string, file?: File) => {
    if (!file) return
    const url = await readFileAsDataUrl(file)
    setDraft(prev => ({
      ...prev,
      [field]: [
        ...(prev[field] || []),
        { name: file.name, size: file.size, type: file.type, url, uploadedAt: new Date().toISOString() }
      ]
    }))
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="flex flex-wrap gap-2">
        {!isHired && (
          <button
            type="button"
            onClick={() => openModal('hire')}
            disabled={readOnly}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Briefcase size={16} />
            İşe Giriş
          </button>
        )}

        <button
          type="button"
          onClick={() => openModal('exit')}
          disabled={readOnly || !isHired || isExited}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <LogOut size={16} />
          İşten Çıkış
        </button>
      </div>

      {isHired && (
        <div className="grid grid-cols-1 gap-2 text-sm text-gray-700 dark:text-gray-300 md:grid-cols-2">
          <div><span className="text-gray-500">İşe Başlangıç:</span> {formData.sgk_giris}</div>
          <div><span className="text-gray-500">Şirket:</span> {companyLabel}</div>
          <div><span className="text-gray-500">Birim:</span> {unitLabel}</div>
          <div><span className="text-gray-500">Görev:</span> {positionLabel}</div>
          <div><span className="text-gray-500">Çalışma Türü:</span> {optionLabel(WORK_TYPE_OPTIONS, formData.calisma_tipi)}</div>
          <div><span className="text-gray-500">İş Akdi Biçimi:</span> {optionLabel(CONTRACT_TYPE_OPTIONS, formData.is_akdi_bicimi)}</div>
        </div>
      )}

      {isExited && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          İşten çıkış tarihi: {formData.isten_ayrilis}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-gray-900">
            <div className="border-b border-gray-200 p-4 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {modal === 'hire' ? 'İşe Giriş' : 'İşten Çıkış'}
              </h3>
            </div>
            <div className="space-y-4 p-4">
              {modal === 'hire' ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">İşe Başlangıç Tarihi *</label>
                    <input type="date" value={draft.sgk_giris || ''} onChange={(e) => {
                      setDraft(prev => ({ ...prev, sgk_giris: e.target.value }))
                      if (modalErrors.sgk_giris) setModalErrors({})
                    }} className={cn("w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 dark:bg-gray-900 dark:text-white", modalErrors.sgk_giris ? "border-red-300 dark:border-red-700" : "border-gray-300 dark:border-gray-700")} />
                    {modalErrors.sgk_giris && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{modalErrors.sgk_giris}</p>}
                  </div>
                  <select value={draft.sirket_id || ''} onChange={(e) => setDraft(prev => ({ ...prev, sirket_id: e.target.value }))} disabled={companies.length === 0} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800">
                    <option value="">{companies.length ? 'Şirket seçiniz' : 'Şirket bulunamadı'}</option>
                    {companies.map(company => <option key={company.id} value={company.id}>{company.label}</option>)}
                  </select>
                  <select value={draft.birim_id || ''} onChange={(e) => setDraft(prev => ({ ...prev, birim_id: e.target.value, kadro_id: '', gorev: '' }))} disabled={units.length === 0} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800">
                    <option value="">{units.length ? 'Birim seçiniz' : 'Teşkilat birimi yok'}</option>
                    {units.map(unit => <option key={unit.id} value={unit.id}>{unit.label}</option>)}
                  </select>
                  <select value={draft.kadro_id || ''} onChange={(e) => {
                    const position = positions.find(item => item.id === e.target.value)
                    setDraft(prev => ({ ...prev, kadro_id: e.target.value, gorev: position?.label || '' }))
                  }} disabled={filteredPositions.length === 0} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-800">
                    <option value="">{filteredPositions.length ? 'Görev / kadro seçiniz' : 'Kadro kaydı yok'}</option>
                    {filteredPositions.map(position => <option key={position.id} value={position.id}>{position.label}</option>)}
                  </select>
                  <select value={draft.calisma_tipi || ''} onChange={(e) => setDraft(prev => ({ ...prev, calisma_tipi: e.target.value }))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                    {WORK_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <select value={draft.is_akdi_bicimi || ''} onChange={(e) => setDraft(prev => ({ ...prev, is_akdi_bicimi: e.target.value }))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                    {CONTRACT_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">
                    <Upload size={16} />
                    Belge Yükle
                    <input type="file" className="hidden" onChange={(event) => addDocument('ise_giris_belgeleri', event.target.files?.[0])} />
                  </label>
                </>
              ) : (
                <>
                  <input type="date" value={draft.isten_ayrilis || ''} onChange={(e) => setDraft(prev => ({ ...prev, isten_ayrilis: e.target.value }))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" />
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">
                    <Upload size={16} />
                    Belge Yükle
                    <input type="file" className="hidden" onChange={(event) => addDocument('isten_cikis_belgeleri', event.target.files?.[0])} />
                  </label>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 p-4 dark:border-gray-700">
              <button type="button" onClick={closeModal} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">İptal</button>
              <button type="button" onClick={saveModal} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function EntityForm({
  mode: initialMode,
  entityName,
  entityNameSingular,
  heroFields,
  tabs,
  data,
  loading = false,
  saving = false,
  deleting = false,
  canEdit = true,
  canCreate = true,
  access,
  moduleDependencies = access?.missingDependencies || [],
  heroLeftPanel,
  showHeroHeader = true,
  showMasterSummaryBadge = true,
  masterSummaryTitleAsField = false,
  masterSummaryMode = 'default',
  showResolvedMasterHeroFields = false,
  hideRoleHeroFields = false,
  showEmptyRoleHeroState = true,
  roleHeroCardTitle,
  imageSlot = { title: 'Fotoğraf', required: false },
  documentSlot,
  onSave,
  onCancel,
  onDelete,
  onActivate,
  onModeChange,
  onFieldChange,
  additionalActions,
  error,
  loadStages,
  externalFieldErrors,
  onValidationError,
  className,
  enableHistory = false,
  identityGate,
  identityRoleScope,
  onIdentityResolved,
  onIdentityGateOpenExistingRole,
  onIdentityGateCancelDuplicate
}: EntityFormProps) {
  // Internal mode state
  const [mode, setMode] = useState<FormMode>(initialMode)
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '')
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [identityGateResult, setIdentityGateResult] = useState<IdentityGateResolveResult | null>(null)
  const [cvExtractStatus, setCvExtractStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' })
  const [turkeyProvinces, setTurkeyProvinces] = useState<TurkeyProvince[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // STANDARD FORM LAYOUT: Image and Document slots
  const resolvedImageSlots = typeof imageSlot.slots === 'function' ? imageSlot.slots(formData) : imageSlot.slots
  const imageSlots: ImageSlot[] = resolvedImageSlots || [
    { id: 'photo', title: imageSlot.title || 'Foto?raf', required: imageSlot.required ?? false },
  ]
  const imageDataField = imageSlot.dataField || 'fotograf_url'
  const primaryImageSlotId = imageSlots[0]?.id || 'photo'
  const [images, setImages] = useState<SlotImage[]>([])
  
  const hasDocumentSlot = !!documentSlot
  const effectiveDocumentSlot = useMemo(() => documentSlot || { title: 'CV', required: false }, [documentSlot])
  const documentSlots: DocumentSlot[] = useMemo(() => effectiveDocumentSlot.slots || [
      {
        id: 'cv',
        title: effectiveDocumentSlot.title || 'CV',
        required: effectiveDocumentSlot.required ?? false,
        acceptedTypes: effectiveDocumentSlot.acceptedTypes || CV_DOCUMENT_ACCEPTED_TYPES,
        maxSizeMB: effectiveDocumentSlot.maxSizeMB || 20
      },
    ], [effectiveDocumentSlot])
  const documentDataField = effectiveDocumentSlot.dataField || 'cv_belgesi'
  const [documents, setDocuments] = useState<SlotDocument[]>([])
  const visibleTabs = useMemo(() => tabs.filter(tab =>
    tab.fields.length === 0 || tab.fields.some(field => matchesCondition(field.visibleWhen, formData))
  ), [tabs, formData])
  const formTabs = useMemo(() => hasDocumentSlot
      ? [
          ...visibleTabs,
          {
            id: DOCUMENTS_FORM_TAB_ID,
            label: 'Belgeler',
            icon: <FileText size={16} />,
            fields: [],
          },
        ]
      : visibleTabs,
    [hasDocumentSlot, visibleTabs]
  )

  useEffect(() => {
    if (imageSlot.dataField) {
      setImages(normalizeStoredImages(data?.[imageDataField]))
    } else if (data?.fotograf_url) {
      setImages([{ slotId: 'photo', previewUrl: data.fotograf_url, name: 'Foto?raf' }])
    } else if (Array.isArray(data?.photo_logo) && data.photo_logo.length > 0) {
      setImages(normalizeStoredImages(data.photo_logo).map((image, index) => ({
        ...image,
        slotId: index === 0 ? primaryImageSlotId : image.slotId,
      })))
    } else {
      setImages([])
    }
  }, [data, imageDataField, imageSlot.dataField, primaryImageSlotId])

  useEffect(() => {
    if (!hasDocumentSlot) {
      setDocuments([])
      return
    }

    if (effectiveDocumentSlot.dataField) {
      setDocuments(normalizeStoredDocuments(data?.[documentDataField]))
      return
    }

    setDocuments(documentSlots.flatMap(slot => {
      const storageField = getDocumentSlotStorageField(slot)
      return storageField ? normalizeStoredDocuments(data?.[storageField], slot.id) : []
    }))
  }, [data, documentDataField, documentSlots, effectiveDocumentSlot.dataField, hasDocumentSlot])

  // Sync with external mode changes
  useEffect(() => {
    setMode(initialMode)
    if (initialMode !== 'create') {
      setIdentityGateResult(null)
    }
  }, [initialMode])

  // Initialize form data
  useEffect(() => {
    if (data && (mode === 'view' || mode === 'edit' || mode === 'passive')) {
      setFormData(data)
    } else if (mode === 'create') {
      // Initialize with defaults
      const defaults: Record<string, any> = {}
      heroFields.forEach(f => {
        if (f.defaultValue !== undefined) {
          defaults[f.name] = f.defaultValue
        } else if (f.type === 'select' && f.options?.length === 1 && f.options[0]?.value) {
          defaults[f.name] = f.options[0].value
        } else if (f.type === 'checkbox') {
          defaults[f.name] = false
        } else if (f.type === 'list') {
          defaults[f.name] = []
        }
      })
      tabs.forEach(tab => {
        tab.fields.forEach(f => {
          if (f.defaultValue !== undefined) {
            defaults[f.name] = f.defaultValue
          } else if (f.type === 'select' && f.options?.length === 1 && f.options[0]?.value) {
            defaults[f.name] = f.options[0].value
          } else if (f.type === 'checkbox') {
            defaults[f.name] = false
          } else if (f.type === 'list') {
            defaults[f.name] = []
          }
        })
      })
      setFormData(defaults)
      setIdentityGateResult(null)
    }
  // Keep form values stable across parent re-renders such as validation toasts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, mode])

  useEffect(() => {
    if (mode !== 'create') return

    const defaults: Record<string, any> = {}
    const applyDefault = (field: FormField) => {
      if (formData[field.name] !== undefined && formData[field.name] !== '') return
      if (field.defaultValue !== undefined) {
        defaults[field.name] = field.defaultValue
      } else if (field.type === 'select' && field.options?.length === 1 && field.options[0]?.value) {
        defaults[field.name] = field.options[0].value
      }
    }

    heroFields.forEach(applyDefault)
    tabs.forEach(tab => tab.fields.forEach(applyDefault))

    if (Object.keys(defaults).length > 0) {
      setFormData(prev => ({ ...defaults, ...prev }))
    }
  }, [formData, heroFields, mode, tabs])

  useEffect(() => {
    let cancelled = false

    fetch('/api/reference/turkey-locations')
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        if (!cancelled && Array.isArray(payload?.provinces)) {
          setTurkeyProvinces(payload.provinces)
        }
      })
      .catch(() => {
        if (!cancelled) setTurkeyProvinces([])
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Reset active tab when mode changes
  useEffect(() => {
    if (formTabs.length > 0 && !formTabs.find(t => t.id === activeTab)) {
      setActiveTab(formTabs[0].id)
    }
  }, [formTabs, activeTab])

  useEffect(() => {
    if (externalFieldErrors && Object.keys(externalFieldErrors).length > 0) {
      setFieldErrors(externalFieldErrors)
    }
  }, [externalFieldErrors])

  const effectiveStatusData = data ? { ...data, ...formData } : formData
  const isPassive = mode === 'passive' || isSoftDeletedRecord(effectiveStatusData)
  const isReadOnly = mode === 'view' || mode === 'passive'
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const effectiveCanCreate = access?.canInsert ?? canCreate
  const effectiveCanEdit = access?.canEdit ?? canEdit
  const effectiveCanPassivate = access?.canPassivate ?? canEdit
  const effectiveCanApprove = access?.canApprove ?? false
  const canActivateRecord = isPassive && effectiveCanPassivate && !!onActivate
  const canPassivateRecord = !isPassive && effectiveCanPassivate && !!onDelete
  const slotLoaderMode = isReadOnly ? 'view' : isCreate ? 'insert' : 'update'
  const isIdentityGateEnabled = !!identityGate?.enabled
  const effectiveIdentityGateResult = identityGateResult || buildIdentityResultFromExistingData(identityGate, formData)
  const isIdentityGateReady = !isIdentityGateEnabled || !isCreate || effectiveIdentityGateResult?.state === 'ready_for_insert' || effectiveIdentityGateResult?.state === 'ready_for_edit'
  const isIdentityGateLocked = isIdentityGateEnabled && isCreate && !isIdentityGateReady
  const shouldHideResolvedMasterHeroFields = isIdentityGateEnabled && !!effectiveIdentityGateResult?.masterFound && !showResolvedMasterHeroFields
  const roleHeroFields = hideRoleHeroFields
    ? []
    : shouldHideResolvedMasterHeroFields
      ? heroFields.filter(field => !isMasterIdentityHeroField(field))
      : heroFields
  const allFormFields = [
    ...flattenFields(roleHeroFields),
    ...visibleTabs.flatMap(tab => flattenFields(tab.fields))
  ]

  const isFieldRequired = (field: FormField, sourceData = formData) => {
    if (field.required) return true
    if (field.requiredWhen && matchesCondition(field.requiredWhen, sourceData)) return true
    if (!field.requiredGroup) return false

    return allFormFields
      .filter(candidate => candidate.requiredGroup === field.requiredGroup)
      .some(candidate => matchesCondition(candidate.visibleWhen, sourceData) && hasValue(sourceData[candidate.name]))
  }

  const getFieldValidationState = (field: FormField) => {
    if (isReadOnly || field.type === 'section' || !matchesCondition(field.visibleWhen, formData)) {
      return { status: 'neutral' as const, label: '' }
    }

    const value = formData[field.name]
    const isRequired = isFieldRequired(field)
    const error = fieldErrors[field.name]

    if (error) {
      return {
        status: 'invalid' as const,
        label: error.includes('format') || error.includes('olmalıdır') ? 'Geçersiz Format' : 'Zorunlu Alan',
      }
    }

    if (isRequired && !hasValue(value)) {
      return { status: 'invalid' as const, label: 'Zorunlu Alan' }
    }

    if (field.pattern && hasValue(value)) {
      const regex = new RegExp(`^(?:${field.pattern})$`)
      return regex.test(String(value))
        ? { status: 'valid' as const, label: '' }
        : { status: 'invalid' as const, label: 'Geçersiz Format' }
    }

    if (isRequired && hasValue(value)) {
      return { status: 'valid' as const, label: '' }
    }

    return { status: 'neutral' as const, label: '' }
  }

  const getTabValidationStatus = (tab: FormTab) => {
    // Tab color reflects only the actual fields rendered on that tab.
    // Nested list draft fields have their own add-row validation and should not
    // make a tab red before the user starts adding a row.
    const states = tab.fields.map(getFieldValidationState)
    if (states.some(state => state.status === 'invalid')) return 'invalid'
    if (states.some(state => state.status === 'valid')) return 'valid'
    return 'neutral'
  }

  const handleModeChange = (newMode: 'view' | 'edit') => {
    if (newMode === 'edit' && isPassive) return
    setMode(newMode)
    onModeChange?.(newMode)
    setFieldErrors({})
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      if (isCountryField(field)) {
        const previousCountry = normalizeCountryId(prev[field] || prev.country || prev.ulke)
        const nextCountry = normalizeCountryId(value)
        const next = {
          ...prev,
          [field]: value,
          ...(previousCountry !== nextCountry ? { il: '', ilce: '', city: '', district: '' } : {}),
        }
        onFieldChange?.(field, value, next)
        return next
      }

      if (field === 'sgk_is_yeri_sicil_no') {
        const parsed = parseSgkWorkplaceNumber(String(value || ''))
        const next = {
          ...prev,
          [field]: parsed.digits,
          sgk_il: parsed.provinceLabel,
          sgk_sube: parsed.branchLabel,
        }
        onFieldChange?.(field, parsed.digits, next)
        return next
      }

      const next = applyLegalEntityBankDerivations(prev, field, value)
      onFieldChange?.(field, value, next)
      return next
    })
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleIdentityResolved = (result: IdentityGateResolveResult) => {
    const resolvedImages = normalizeStoredImages(
      result.prefill[imageDataField] ||
      result.prefill.photo_logo ||
      result.prefill.fotograf_url ||
      []
    )
    const nextImages = imageSlot.dataField
      ? resolvedImages
      : resolvedImages.map((image, index) => ({
          ...image,
          slotId: index === 0 ? primaryImageSlotId : image.slotId,
        }))
    const nextDocuments = hasDocumentSlot
      ? normalizeStoredDocuments(
          result.prefill[documentDataField] ||
          result.prefill.partner_documents ||
          result.prefill.authority_documents ||
          result.prefill.stakeholder_documents ||
          result.prefill.cv_belgesi ||
          []
        )
      : []

    setIdentityGateResult(result)
    setFormData(prev => ({
      ...prev,
      ...result.prefill,
      master_entity_kind: result.entityKind,
      master_record_id: result.masterRecord?.id || null,
      identity_gate_state: result.state,
    }))
    if (nextImages.length) setImages(nextImages)
    if (nextDocuments.length) setDocuments(nextDocuments)
    onIdentityResolved?.(result)
  }

  const finalizeFormDataForSave = (sourceData: Record<string, any>) => {
    const next = { ...sourceData }
    allFormFields.forEach(field => {
      if (field.type === 'list') {
        next[field.name] = finalizeListValue(next[field.name], field.listConfig?.fields || [])
      }
    })

    if (hasDocumentSlot) {
      if (effectiveDocumentSlot.dataField) {
        next[documentDataField] = documents.map(serializeDocumentForStorage)
      } else {
        documentSlots.forEach(slot => {
          const storageField = getDocumentSlotStorageField(slot)
          if (!storageField) return
          const slotDocument = getLatestActiveStoredDocument(documents, slot.id)
          next[storageField] = slotDocument ? serializeDocumentForStorage(slotDocument) : null
        })
      }
    }

    return normalizeLegalEntityBankData(next)
  }

  const resetIdentityGate = () => {
    setIdentityGateResult(null)
  }

  const handleFormattedFieldChange = (field: FormField, value: string) => {
    if (field.name === 'tc_kimlik' || field.name === 'vkn_tckn' || field.name === 'sgk_is_yeri_sicil_no') {
      handleChange(field.name, value.replace(/\D/g, '').slice(0, field.maxLength || 11))
      return
    }

    if (field.name === 'electronic_notification_address') {
      const digits = value.replace(/\D/g, '').slice(0, 15)
      handleChange(field.name, digits.replace(/(\d{5})(?=\d)/g, '$1-'))
      return
    }

    if (field.type === 'tel') {
      handleChange(field.name, formatPhoneInput(value))
      return
    }

    if (field.type === 'email') {
      handleChange(field.name, normalizeEmailInput(value))
      return
    }

    handleChange(field.name, value)
  }

  const handleImagesChange = async (nextImages: SlotImage[]) => {
    setImages(nextImages)

    if (imageSlot.dataField) {
      const hydratedImages = await Promise.all(nextImages.map(async image => {
        if (!image.file) return image
        return {
          ...image,
          previewUrl: await readFileAsDataUrl(image.file),
          name: image.name || image.file.name,
          size: image.size || image.file.size,
        }
      }))
      setImages(hydratedImages)
      handleChange(imageDataField, hydratedImages.map(serializeImageForStorage))
      return
    }

    const photo = nextImages.find(image => image.slotId === 'photo')
    if (!photo) {
      handleChange('fotograf_url', '')
      return
    }

    if (photo.file) {
      const dataUrl = await readFileAsDataUrl(photo.file)
      handleChange('fotograf_url', dataUrl)
      setImages(current => current.map(image =>
        image.slotId === photo.slotId ? { ...image, previewUrl: dataUrl } : image
      ))
      return
    }

    handleChange('fotograf_url', photo.previewUrl || '')
  }

  const handleDocumentsChange = async (nextDocuments: SlotDocument[]) => {
    if (!hasDocumentSlot) return

    const hydratedDocuments = await Promise.all(nextDocuments.map(async document => {
      if (!document.file || document.storagePath) return document
      return uploadDocumentFile(document)
    }))

    setDocuments(hydratedDocuments)

    if (effectiveDocumentSlot.dataField) {
      handleChange(documentDataField, hydratedDocuments.map(serializeDocumentForStorage))
      return
    }

    documentSlots.forEach(slot => {
      const storageField = getDocumentSlotStorageField(slot)
      if (!storageField) return
      const slotDocument = getLatestActiveStoredDocument(hydratedDocuments, slot.id)
      handleChange(storageField, slotDocument ? serializeDocumentForStorage(slotDocument) : null)
    })

    const cvDocument = getLatestActiveStoredDocument(hydratedDocuments, 'cv')
    if (cvDocument?.file) {
      await extractCvData(cvDocument.file)
    } else if (!cvDocument) {
      setCvExtractStatus({ type: 'idle', message: '' })
    }
  }

  const extractCvData = async (file: File) => {
    setCvExtractStatus({ type: 'loading', message: 'CV okunuyor...' })

    try {
      const body = new FormData()
      body.append('file', file)

      const response = await fetch('/api/ai/cv-extract', {
        method: 'POST',
        body,
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.error || 'CV çözümleme başarısız')
      }

      const appliedCount = applyCvExtractedData(result.data || {})
      setCvExtractStatus({
        type: appliedCount > 0 ? 'success' : 'error',
        message: appliedCount > 0
          ? `CV'den ${appliedCount} alan dolduruldu`
          : 'CV okundu ama forma aktarılacak net bilgi bulunamadı',
      })
    } catch (error) {
      setCvExtractStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'CV çözümleme başarısız',
      })
    }
  }

  const applyCvExtractedData = (extracted: Record<string, any>) => {
    const normalized = normalizeCvExtractedData(extracted)
    const entriesToApply = Object.entries(normalized).filter(([key, value]) =>
      isEmptyFormValue(formData[key]) && !isEmptyFormValue(value)
    )

    if (entriesToApply.length > 0) {
      setFormData(prev => ({ ...prev, ...Object.fromEntries(entriesToApply) }))
    }

    return entriesToApply.length
  }

  const normalizeCvExtractedData = (extracted: Record<string, any>) => {
    const next: Record<string, any> = { ...extracted }

    if (next.cep_telefonu) {
      next.cep_telefonu = formatPhoneInput(String(next.cep_telefonu))
      next.telefonlar = [{ etiket: 'Cep', numara: next.cep_telefonu }]
    }

    if (next.email) {
      next.email = normalizeEmailInput(String(next.email))
      next.epostalar = [{ etiket: 'Kişisel', adres: next.email }]
    }

    return next
  }

  const isEmptyFormValue = (value: any) => {
    if (Array.isArray(value)) return value.length === 0
    return value === undefined || value === null || value === ''
  }

  const validate = (sourceData = formData): boolean => {
    const errors: Record<string, string> = {}

    if (isIdentityGateLocked) {
      errors.identity_gate = 'Devam etmek için önce Temel Kimlik Sorgulama/Oluşturma alanını eşleştirin.'
      setFieldErrors(errors)
      onValidationError?.([errors.identity_gate])
      return false
    }
    
    const validateFields = (fields: FormField[]) => {
      fields.forEach(field => {
        if (field.type === 'section' || !matchesCondition(field.visibleWhen, sourceData)) return
        if (isFieldRequired(field, sourceData) && !hasValue(sourceData[field.name])) {
          errors[field.name] = `${field.errorLabel || field.label} zorunludur`
          return
        }

        if (field.pattern && hasValue(sourceData[field.name])) {
          const regex = new RegExp(`^(?:${field.pattern})$`)
          if (!regex.test(String(sourceData[field.name]))) {
            errors[field.name] = field.name === 'tc_kimlik'
              ? 'TC Kimlik No 11 haneli sayı olmalıdır'
              : `${field.errorLabel || field.label} formatı geçersiz`
          }
        }
      })
    }

    validateFields(heroFields)
    visibleTabs.forEach(tab => validateFields(tab.fields))

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      onValidationError?.(Object.values(errors).map(error => error.replace(' zorunludur', '')))
    }
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (isPassive && !isCreate) return
    if (isIdentityGateLocked) {
      setFieldErrors(prev => ({
        ...prev,
        identity_gate: 'Devam etmek için önce Temel Kimlik Sorgulama/Oluşturma alanını eşleştirin.',
      }))
      onValidationError?.(['Devam etmek için önce Temel Kimlik Sorgulama/Oluşturma alanını eşleştirin.'])
      return
    }
    const finalizedData = finalizeFormDataForSave(formData)
    setFormData(finalizedData)
    if (!validate(finalizedData)) return
    const payload = isEdit && data ? buildChangedPayload(finalizedData, data) : finalizedData
    if (isEdit && Object.keys(payload).length === 0) {
      handleModeChange('view')
      return
    }
    
    try {
      await onSave(payload, mode)
      if (isCreate) {
        setFormData({})
      }
    } catch (err: any) {
      // Error handled by parent
    }
  }

  const handleDelete = async () => {
    if ((!onDelete && !onActivate) || isCreate) return
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (isCreate) return
    if (canActivateRecord) {
      await onActivate()
    } else if (onDelete) {
      await onDelete()
    }
    setShowDeleteConfirm(false)
  }

  const renderField = (field: FormField, showHistoryIcon = false) => {
    if (!matchesCondition(field.visibleWhen, formData)) return null
    const value = formData[field.name] ?? ''
    const error = fieldErrors[field.name]
    const isRequired = isFieldRequired(field)
    const validationState = getFieldValidationState(field)
    const colSpanClass = field.colSpan === 3
      ? 'col-span-2 lg:col-span-3'
      : field.colSpan === 2
        ? 'col-span-2 md:col-span-2'
        : field.compact
          ? 'col-span-1'
          : 'col-span-2 md:col-span-1'
    const fieldDisabled = isReadOnly || isIdentityGateLocked || (field.disabledWhen ? matchesCondition(field.disabledWhen, formData) : false)
    const automationState = getFieldAutomationState(field, formData)

    if (field.type === 'section') {
      return (
        <div key={field.name} className={cn("border-t border-gray-200 pt-4 dark:border-gray-700", colSpanClass || 'md:col-span-2 lg:col-span-3')}>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{field.label}</h4>
        </div>
      )
    }

    const baseInputClass = cn(
      "w-full bg-white text-gray-900 dark:bg-gray-900 dark:text-white border rounded-lg px-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500",
      "transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20",
      validationState.status === 'invalid'
        ? "border-red-400 dark:border-red-700 focus:border-red-500 focus:ring-red-500/20"
        : validationState.status === 'valid'
          ? "border-emerald-500 dark:border-emerald-600 focus:border-emerald-500 focus:ring-emerald-500/20"
          : "border-gray-300 dark:border-gray-700 focus:border-blue-500",
      fieldDisabled && "bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-gray-100 cursor-not-allowed"
    )

    const renderInput = () => {
          if (field.render) {
            return field.render({
              value,
              onChange: (val) => handleChange(field.name, val),
              readOnly: fieldDisabled,
              data: formData,
              mode,
            })
          }

      if (isCountryField(field.name) && field.type === 'select' && (!field.options || field.options.length === 0)) {
        return (
          <select
            value={value || 'TR'}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disabled={fieldDisabled}
            className={cn(baseInputClass, fieldDisabled && "appearance-none")}
          >
            {COUNTRY_OPTIONS.map(country => (
              <option key={country.value} value={country.value}>{country.label}</option>
            ))}
          </select>
        )
      }

      if (isCityField(field.name)) {
        const selectedCountry = normalizeCountryId(formData.ulke || formData.country || 'TR')
        if (selectedCountry !== 'TR') {
          return (
            <input
              type="text"
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              disabled={fieldDisabled}
              className={baseInputClass}
              placeholder="Şehir / bölge"
            />
          )
        }

        return (
          <select
            value={value}
            onChange={(e) => {
              handleChange(field.name, e.target.value)
              handleChange(field.name === 'city' ? 'district' : 'ilce', '')
            }}
            disabled={fieldDisabled}
            className={cn(baseInputClass, fieldDisabled && "appearance-none")}
          >
            <option value="">Seçiniz</option>
            {turkeyProvinces.map(province => (
              <option key={province.id} value={province.name}>{province.name}</option>
            ))}
          </select>
        )
      }

      if (isDistrictField(field.name)) {
        const selectedCountry = normalizeCountryId(formData.ulke || formData.country || 'TR')
        if (selectedCountry !== 'TR') {
          return (
            <input
              type="text"
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              disabled={fieldDisabled}
              className={baseInputClass}
              placeholder="İlçe / semt"
            />
          )
        }

        const cityField = field.name === 'district' ? 'city' : 'il'
        const selectedProvince = turkeyProvinces.find(province => province.name === formData[cityField])

        return (
          <select
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disabled={fieldDisabled || !selectedProvince}
            className={cn(baseInputClass, (fieldDisabled || !selectedProvince) && "appearance-none")}
          >
            <option value="">{selectedProvince ? 'Seçiniz' : 'Önce il seçiniz'}</option>
            {selectedProvince?.districts.map(district => (
              <option key={district.id} value={district.name}>{district.name}</option>
            ))}
          </select>
        )
      }

      switch (field.type) {
        case 'checkbox':
          const checkboxHasStatusLabel = ['engellilik', 'hukumluluk'].includes(field.name)
          return (
            <label className="flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              <input
                type="checkbox"
                checked={!!formData[field.name]}
                onChange={(e) => handleChange(field.name, e.target.checked)}
                disabled={fieldDisabled}
                className="h-4 w-4 rounded border-gray-400 bg-white text-blue-600 accent-blue-600 focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:accent-blue-500"
              />
              {checkboxHasStatusLabel ? (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {formData[field.name] ? 'Var' : 'Yok'}
                </span>
              ) : (
                field.placeholder || field.label
              )}
            </label>
          )
        case 'iban':
          return (
            <IBANInput
              value={value}
              onChange={(nextValue) => handleChange(field.name, nextValue)}
              disabled={fieldDisabled}
              className={error ? "border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500/20" : undefined}
            />
          )
        case 'list':
          return (
            <ListField
              field={field}
              value={formData[field.name] || []}
              onChange={(nextValue) => handleChange(field.name, nextValue)}
              readOnly={fieldDisabled}
              disabled={fieldDisabled || (field.disabledWhen ? matchesCondition(field.disabledWhen, formData) : false)}
            />
          )
        case 'workLifecycle':
          return (
            <WorkLifecycleField
              formData={formData}
              onChange={handleChange}
              readOnly={fieldDisabled}
            />
          )
        case 'textarea':
          return (
            <textarea
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
              readOnly={fieldDisabled}
              className={baseInputClass}
            />
          )
        case 'select':
          if (field.searchable || isLongSelectField(field)) {
            return (
              <SearchableSelectField
                field={field}
                value={value}
                disabled={fieldDisabled}
                className={baseInputClass}
                onChange={(nextValue) => handleChange(field.name, nextValue)}
              />
            )
          }

          return (
            <select
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              disabled={fieldDisabled}
              className={cn(baseInputClass, fieldDisabled && "appearance-none")}
            >
              <option value="">Seçiniz</option>
              {field.options?.map((opt, index) => (
                <option key={`${opt.value}-${index}`} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )
        case 'date':
          return (
            <input
              type="date"
              value={value ? value.split('T')[0] : ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
              readOnly={fieldDisabled}
              className={baseInputClass}
            />
          )
        case 'number':
          return (
            <input
              type="number"
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              readOnly={fieldDisabled}
              className={baseInputClass}
            />
          )
        case 'email':
          return (
            <input
              type="email"
              value={value}
              onChange={(e) => handleFormattedFieldChange(field, e.target.value)}
              placeholder={field.placeholder}
              readOnly={fieldDisabled}
              className={baseInputClass}
            />
          )
        case 'tel':
          return (
            <input
              type="tel"
              value={value}
              onChange={(e) => handleFormattedFieldChange(field, e.target.value)}
              placeholder={field.placeholder}
              readOnly={fieldDisabled}
              className={baseInputClass}
            />
          )
        default:
          return (
            <input
              type="text"
              value={value}
              onChange={(e) => handleFormattedFieldChange(field, e.target.value)}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              inputMode={field.inputMode}
              pattern={field.pattern}
              readOnly={fieldDisabled}
              className={baseInputClass}
            />
          )
      }
    }

    return (
      <div key={field.name} className={cn("relative space-y-1", colSpanClass)}>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {field.label}
          </label>
          {(showHistoryIcon || enableHistory) && field.history && field.history.length > 0 && (
            <FieldHistoryIndicator history={field.history} />
          )}
          {automationState && (
            <AutomationBadge
              status={automationState.status}
              title={automationState.title}
              idleLabel={automationState.idleLabel}
              workingLabel={automationState.workingLabel}
              doneLabel={automationState.doneLabel}
              noDataLabel={automationState.noDataLabel}
            />
          )}
        </div>
        {validationState.label && (
          <span className="pointer-events-none absolute right-2 top-7 z-10 rounded border border-red-300 bg-white px-1.5 py-0.5 text-[10px] font-medium leading-none text-red-600 dark:border-red-700 dark:bg-gray-900 dark:text-red-400">
            {validationState.label}
          </span>
        )}
        {renderInput()}
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  return (
    <div className={cn("bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden", className)}>
      <Modal
        open={showDeleteConfirm}
        onClose={() => !deleting && setShowDeleteConfirm(false)}
        title={`${entityNameSingular} ${canActivateRecord ? 'Aktive Et' : 'Pasife Al'}`}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Vazgec
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                canActivateRecord ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
              )}
            >
              {deleting ? <Loader2 className="animate-spin" size={16} /> : canActivateRecord ? <RotateCcw size={16} /> : <Trash2 size={16} />}
              {canActivateRecord ? 'Aktive Et' : 'Pasife Al'}
            </button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          {canActivateRecord ? (
            <p>Bu kayit tekrar aktif hale getirilecek ve aktif kayit listelerinde gorunecektir.</p>
          ) : (
            <>
              <p>
                Bu kayit sistemden silinmeyecek, sadece pasife alinacaktir.
              </p>
              <p>
                Kayitla iliskili baska master kart verileri veya hareketler olabilir; bu nedenle gecmis veri korunur.
              </p>
            </>
          )}
        </div>
      </Modal>

      {/* Global Error */}
      {error && (
        <div className="m-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <FormLoadStages stages={loadStages} />

      {moduleDependencies.length > 0 && (
        <div className="m-4 space-y-2">
          {moduleDependencies.map(dependency => (
            <ModuleDependencyNotice key={dependency.module} dependency={dependency} />
          ))}
        </div>
      )}

      {/* Hero Section - Two Column Layout */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50/50 to-transparent dark:from-gray-800/30">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
          
          {/* Left Panel - STANDARD FORM LAYOUT: Photo (expected) + CV (optional) */}
          <div className="lg:col-span-1">
            {heroLeftPanel || (
              <div className="flex flex-col gap-4">
                {/* Image Slot - Expected but not required */}
                <div className="flex flex-col gap-1.5">
                  <ImageSlotUploader
                    slots={imageSlots}
                    images={images}
                    onChange={handleImagesChange}
                    readOnly={isReadOnly || isIdentityGateLocked || !!imageSlot.readOnly}
                    mode={slotLoaderMode}
                  />
                </div>
                
                {hasDocumentSlot && (
                  <div className="flex flex-col gap-1.5">
                    <DocumentSlotUploader
                      slots={documentSlots}
                      documents={documents}
                      onChange={handleDocumentsChange}
                      readOnly={isReadOnly || isIdentityGateLocked}
                      mode={slotLoaderMode}
                      aiBadge={effectiveDocumentSlot.aiBadge}
                    />
                    {!effectiveDocumentSlot.dataField && cvExtractStatus.type !== 'idle' && (
                      <p className={cn(
                        "text-xs",
                        cvExtractStatus.type === 'loading' && "text-gray-500 dark:text-gray-400",
                        cvExtractStatus.type === 'success' && "text-emerald-600 dark:text-emerald-400",
                        cvExtractStatus.type === 'error' && "text-amber-600 dark:text-amber-400"
                      )}>
                        {cvExtractStatus.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Fields + Actions */}
          <div className="lg:col-span-3 flex flex-col">
            {/* Section Title */}
            {showHeroHeader && <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Temel Bilgiler
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {isCreate ? 'Yeni kayıt oluşturun' : isEdit ? 'Bilgileri güncelleyin' : 'Kayıt detayları'}
              </p>
            </div>}

            {/* Required Fields Grid */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
              {identityGate?.enabled && (
                <MasterIdentityGate
                  config={identityGate}
                  mode={mode === 'passive' ? 'view' : mode}
                  formData={formData}
                  roleScope={identityRoleScope}
                  onResolved={handleIdentityResolved}
                  onReset={resetIdentityGate}
                  onOpenExistingRole={onIdentityGateOpenExistingRole}
                  onCancelDuplicate={onIdentityGateCancelDuplicate || onCancel}
                />
              )}
              {identityGate?.enabled && (
                <MasterSummaryHero
                  result={effectiveIdentityGateResult}
                  locked={isIdentityGateLocked}
                  sourceData={formData}
                  readOnly={isReadOnly}
                  showBadge={showMasterSummaryBadge}
                  titleAsField={masterSummaryTitleAsField}
                  mode={masterSummaryMode}
                  onFieldChange={handleChange}
                />
              )}
              {isIdentityGateLocked && fieldErrors.identity_gate && (
                <div className="col-span-2 lg:col-span-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  {fieldErrors.identity_gate}
                </div>
              )}
              {roleHeroFields.length > 0 ? (
                roleHeroCardTitle ? (
                  <div className="col-span-2 lg:col-span-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{roleHeroCardTitle}</div>
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {roleHeroFields.map(field => renderField(field, enableHistory))}
                    </div>
                  </div>
                ) : roleHeroFields.map(field => renderField(field, enableHistory))
              ) : showEmptyRoleHeroState ? (
                <div className="col-span-2 lg:col-span-3 rounded-lg border border-dashed border-gray-200 bg-white/70 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
                  Bu formda hero alaninda manuel girilecek rol alani yok. Rol detaylari sekmelerde yonetilir.
                </div>
              ) : null}
            </div>

            {/* Form Action Area - Bottom Right */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
              {/* Future: Workflow Actions (Approve, Reject, etc.) */}
              {additionalActions}
              
              {/* View Mode: Edit Button */}
              {!isCreate && (canActivateRecord || canPassivateRecord) && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    canActivateRecord
                      ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                      : "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
                  )}
                >
                  {deleting ? <Loader2 className="animate-spin" size={16} /> : canActivateRecord ? <RotateCcw size={16} /> : <Trash2 size={16} />}
                  {canActivateRecord ? 'Aktive Et' : 'Pasife Al'}
                </button>
              )}
              {isReadOnly && effectiveCanEdit && !isPassive && (
                <button
                  onClick={() => handleModeChange('edit')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Edit3 size={16} />
                  Düzenle
                </button>
              )}

              {/* Edit/Create Mode: Cancel & Save */}
              {(isEdit || isCreate) && (
                <>
                  <button
                    onClick={() => isCreate ? onCancel() : handleModeChange('view')}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-lg transition-colors text-sm font-medium"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || isIdentityGateLocked || (isCreate && !effectiveCanCreate) || (isEdit && !effectiveCanEdit)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {isCreate ? 'Oluştur' : 'Güncelle'}
                  </button>
                </>
              )}
              {isReadOnly && effectiveCanApprove && (
                <span className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-900/60 dark:text-emerald-300">
                  Onay yetkisi var
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {formTabs.length > 0 && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex overflow-x-auto">
            {formTabs.map(tab => (
              <button
                key={tab.id}
                disabled={isIdentityGateLocked}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2",
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200",
                  tab.id !== DOCUMENTS_FORM_TAB_ID && getTabValidationStatus(tab) === 'invalid' && "text-red-600 dark:text-red-400",
                  tab.id !== DOCUMENTS_FORM_TAB_ID && getTabValidationStatus(tab) === 'valid' && "text-emerald-600 dark:text-emerald-400",
                  isIdentityGateLocked && "cursor-not-allowed opacity-50"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {(formTabs.length > 0 || isIdentityGateLocked) && (
        <div className="p-6">
          {isIdentityGateLocked && (
            <div className="mb-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
              Devam etmek için önce Temel Kimlik Sorgulama/Oluşturma alanını eşleştirin.
            </div>
          )}
          {formTabs.map(tab => (
            <div
              key={tab.id}
              className={cn(
                tab.id === DOCUMENTS_FORM_TAB_ID ? "block" : "grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4",
                activeTab !== tab.id && "hidden"
              )}
            >
              {tab.id === DOCUMENTS_FORM_TAB_ID ? (
                <DocumentSlotUploader
                  slots={documentSlots}
                  documents={documents}
                  onChange={handleDocumentsChange}
                  readOnly={isReadOnly || isIdentityGateLocked}
                  mode={slotLoaderMode}
                  aiBadge={effectiveDocumentSlot.aiBadge}
                  defaultTab="documents"
                  className="items-stretch"
                />
              ) : (
                tab.fields.map(field => renderField(field, enableHistory))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function getFieldAutomationState(field: FormField, data: Record<string, any>): (FieldAutomationConfig & { status: AutomationBadgeStatus }) | null {
  const automation = field.automation || getDefaultFieldAutomation(field)
  if (!automation) return null

  if (typeof automation.status === 'function') {
    return { ...automation, status: automation.status(data, field) }
  }

  if (automation.status) {
    return { ...automation, status: automation.status }
  }

  if (field.type === 'iban' || field.name === 'beneficiary_iban' || field.name === 'beneficiary_iban_or_account_no') {
    return { ...automation, status: getIbanAutomationStatus(data[field.name]) }
  }

  const sourceFields = automation.sourceFields?.length ? automation.sourceFields : [field.name]
  const targetFields = automation.targetFields || []
  const hasSourceValue = sourceFields.some(sourceField => hasNonEmptyValue(data[sourceField]))
  if (!hasSourceValue) return { ...automation, status: 'idle' }
  if (targetFields.length === 0) return { ...automation, status: 'working' }
  return {
    ...automation,
    status: targetFields.some(targetField => hasNonEmptyValue(data[targetField])) ? 'done' : 'no_data',
  }
}

function getDefaultFieldAutomation(field: FormField): FieldAutomationConfig | null {
  if (field.type !== 'iban' && field.name !== 'beneficiary_iban' && field.name !== 'beneficiary_iban_or_account_no') return null
  return {
    sourceFields: [field.name],
    targetFields: ['beneficiary_bank_name', 'beneficiary_bank_code', 'beneficiary_account_no', 'beneficiary_swift_bic'],
    title: 'IBAN girilince banka, hesap ve SWIFT alanlari otomatik doldurulur.',
    idleLabel: 'Veri bekliyor',
    workingLabel: 'Çözülüyor',
    doneLabel: 'OK',
    noDataLabel: 'Veri yok',
  }
}

function getIbanAutomationStatus(value: any): AutomationBadgeStatus {
  const clean = String(value || '').replace(/\s/g, '').toUpperCase()
  if (!clean) return 'idle'
  const details = resolveTurkishIban(clean)
  if (details && details.bankName !== 'Bilinmeyen Banka') return 'done'
  if (clean.length < 10) return 'working'
  return 'no_data'
}

function hasNonEmptyValue(value: any) {
  if (Array.isArray(value)) return value.length > 0
  return String(value ?? '').trim().length > 0
}

function isCountryField(field: string) {
  return ['ulke', 'country', 'nationality_country', 'uyruk', 'nationality'].includes(field)
}

function applyLegalEntityBankDerivations(prev: Record<string, any>, field: string, value: any) {
  const next = { ...prev, [field]: value }

  if (field === 'ticari_unvan' || field === 'legal_name' || field === 'trade_name') {
    const previousName = pickText(prev.ticari_unvan, prev.legal_name, prev.trade_name)
    if (shouldRefreshDerivedValue(prev.beneficiary_full_name, previousName)) {
      next.beneficiary_full_name = String(value || '')
    }
  }

  if (field === 'adres' || field === 'address') {
    const previousAddress = pickText(prev.adres, prev.address)
    if (shouldRefreshDerivedValue(prev.beneficiary_address, previousAddress)) {
      next.beneficiary_address = String(value || '')
    }
  }

  if (field === 'beneficiary_iban' || field === 'beneficiary_iban_or_account_no') {
    const oldDetails = resolveTurkishIban(String(prev.beneficiary_iban || prev.beneficiary_iban_or_account_no || ''))
    const updated = applyIbanDerivedBankFields(next, value, oldDetails)

    if (field === 'beneficiary_iban_or_account_no') {
      const cleanValue = String(value || '').replace(/\s/g, '').toUpperCase()
      if (cleanValue.startsWith('TR')) {
        updated.beneficiary_iban = value
      } else if (shouldRefreshDerivedValue(updated.beneficiary_account_no, prev.beneficiary_iban_or_account_no)) {
        updated.beneficiary_account_no = value
      }
    } else {
      updated.beneficiary_iban_or_account_no = value || next.beneficiary_account_no || ''
    }

    return updated
  }

  if (field === 'beneficiary_account_no' && !next.beneficiary_iban) {
    next.beneficiary_iban_or_account_no = value
  }

  return next
}

function normalizeLegalEntityBankData(source: Record<string, any>) {
  const next = applyIbanDerivedBankFields({ ...source }, source.beneficiary_iban || source.beneficiary_iban_or_account_no)

  if (!String(next.beneficiary_full_name || '').trim()) {
    next.beneficiary_full_name = pickText(next.ticari_unvan, next.legal_name, next.trade_name)
  }

  if (!String(next.beneficiary_address || '').trim()) {
    next.beneficiary_address = pickText(next.adres, next.address)
  }

  if (!String(next.beneficiary_iban_or_account_no || '').trim()) {
    next.beneficiary_iban_or_account_no = next.beneficiary_iban || next.beneficiary_account_no || ''
  }

  return next
}

function applyIbanDerivedBankFields(
  source: Record<string, any>,
  ibanValue: any,
  previousDetails = resolveTurkishIban(String(source.beneficiary_iban || source.beneficiary_iban_or_account_no || ''))
) {
  const next = { ...source }
  const rawIban = String(ibanValue || '')
  const cleanIban = rawIban.replace(/\s/g, '').toUpperCase()
  const details = resolveTurkishIban(rawIban)

  if (!details) {
    if (/^TR\d{2}\d{5}/.test(cleanIban) && shouldRefreshDerivedValue(next.beneficiary_bank_code, previousDetails?.bankCode)) {
      next.beneficiary_bank_code = cleanIban.substring(4, 9)
    }
    return next
  }

  if (shouldRefreshDerivedValue(next.beneficiary_account_no, previousDetails?.accountNo)) {
    next.beneficiary_account_no = details.accountNo
  }
  if (shouldRefreshDerivedValue(next.beneficiary_bank_code, previousDetails?.bankCode)) {
    next.beneficiary_bank_code = details.bankCode
  }
  if (details.bankName !== 'Bilinmeyen Banka' && shouldRefreshDerivedValue(next.beneficiary_bank_name, previousDetails?.bankName)) {
    next.beneficiary_bank_name = details.bankName
  }
  if (details.swiftCode && shouldRefreshDerivedValue(next.beneficiary_swift_bic, previousDetails?.swiftCode)) {
    next.beneficiary_swift_bic = details.swiftCode
  }

  return next
}

function shouldRefreshDerivedValue(currentValue: any, previousDerivedValue: any) {
  const current = String(currentValue || '').trim()
  const previous = String(previousDerivedValue || '').trim()
  return !current || (!!previous && current === previous)
}

function pickText(...values: any[]) {
  return String(values.find(value => String(value || '').trim()) || '').trim()
}

function isCityField(field: string) {
  return field === 'il' || field === 'city'
}

function isDistrictField(field: string) {
  return field === 'ilce' || field === 'district'
}

export default EntityForm
