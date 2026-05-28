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

import { useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react'
import { Save, Loader2, Edit3, History, Clock, Plus, Trash2, Upload, Briefcase, LogOut, Building2, UserRound, FileText, RotateCcw, CheckCircle2, Circle, AlertCircle, ChevronDown, Info } from 'lucide-react'
import { cn, formatPhoneInput, normalizeEmailInput, resolveTurkishIban } from '@/lib/utils'
import { ImageSlotUploader, ImageSlot, SlotImage } from './ImageSlotUploader'
import { DocumentSlotUploader, DocumentSlot, SlotDocument } from './DocumentSlotUploader'
import { IBANInput } from './IBANInput'
import { MasterIdentityGate } from './MasterIdentityGate'
import { AutomationBadge, type AutomationBadgeStatus } from './AutomationBadge'
import Modal from './Modal'
import { formControlClass, type FormControlState } from './formControlStyles'
import type { IdentityGateConfig, IdentityGateResolveResult } from '@/lib/identity-gate'
import { COUNTRY_OPTIONS, normalizeCountryId } from '@/lib/reference/country-nationalities'
import { isDraftRecord, isSoftDeletedRecord } from '@/lib/forms/entityState'
import { ModuleDependencyNotice, type EntityAccessState, type ModuleDependency } from '@/lib/access/entityAccess'
import { useModules } from '@/lib/security/moduleStore'
import { usePermissions } from '@/lib/security/permissionStore'
import { resolveActionRuntimeAvailability } from '@/lib/visibility/actionVisibility'

/** Historical value entry */
export interface HistoryEntry {
  value: unknown
  date: string
  user?: string
}

type FieldOption = { value: string; label: string }

export interface RemoteFieldOptions {
  endpoint: string
  queryParam?: string
  minQueryLength?: number
  limit?: number
  preload?: boolean
}

/** Form field configuration */
export interface FormField {
  name: string
  key?: string
  label: string
  errorLabel?: string
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'textarea' | 'number' | 'checkbox' | 'section' | 'list' | 'iban' | 'document' | 'workLifecycle' | 'custom'
  required?: boolean
  readOnly?: boolean
  options?: FieldOption[]
  remoteOptions?: RemoteFieldOptions
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
  /** Locks manual edits when this field is governed by a lifecycle or registration operation. */
  controlledByOperation?: FormFieldOperationControl
  /** Registry-sourced field control metadata for future policy/action guide integrations. */
  fieldControl?: unknown
  helpText?: string
  lockReason?: string
  suggestedOperation?: unknown
  /** Hide the field label when the rendered control already provides its own structure. */
  hideLabel?: boolean
  /** Custom render function */
  render?: (props: {
    value: any
    onChange: (val: any) => void
    readOnly: boolean
    data: Record<string, any>
    mode: FormMode
    className: string
    validationState: { status: FormControlState; label: string }
  }) => ReactNode
}

export type FormFieldOperationCategory = 'lifecycle' | 'registration' | 'update' | 'other'

export interface FormFieldOperationControl {
  category: FormFieldOperationCategory
  operations?: string[]
  message?: string
  lockInModes?: FormMode[]
  allowDraftEdit?: boolean
  operationKey?: string
  wizardKey?: string
  targetPage?: string
  requiredModules?: string[]
  optionalModules?: string[]
  requiredPermissions?: string[]
  fallbackPermissions?: string[]
  requiredRecordStatuses?: string[]
  blockedRecordStatuses?: string[]
  lockExplanation?: string
  helperText?: string
  suggestedOperations?: Array<{
    operationKey: string
    operationLabel: string
    wizardKey?: string
    targetPage?: string
  }>
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

type SgkCodeOption = {
  value: string
  label: string
}

type SgkCodeCategories = Record<string, SgkCodeOption[]>

/** Tab configuration for grouping fields */
export interface FormTab {
  id: string
  label: string
  icon?: ReactNode
  fields: FormField[]
}

/** Form modes */
export type FormMode = 'create' | 'view' | 'edit' | 'passive'

export type FormLoadStageKey =
  | 'snapshot'
  | 'detail'
  | 'master'
  | 'references'
  | 'hero'
  | 'media'
  | 'mediaMetadata'
  | 'profile'
  | 'relationsSummary'
  | 'sectionDetail'
  | 'history'
  | 'fullMedia'
  | 'details'
export type FormLoadStageStatus = 'idle' | 'loading' | 'ready' | 'error' | 'skipped'

export interface FormLoadStage {
  key: FormLoadStageKey
  label: string
  status: FormLoadStageStatus
  description?: string
}

export type FormOperationActionGroupKey = 'lifecycle' | 'registration' | 'update' | 'other' | string
export type FormOperationActionTone = 'primary' | 'neutral' | 'danger' | 'success'
export type FormOperationKind = 'lifecycle' | 'official_update' | 'basic_update' | 'general'
export type FormOperationCrudIntent = 'create_delete' | 'official_update' | 'update' | 'general'
export type FormOperationDisplayMode = 'dropdown_button' | 'single_button' | 'inline_buttons' | 'action_card' | 'dropdown_card'
export type FormOperationActionState = 'completed' | 'active' | 'upcoming'

export interface FormOperationProgress {
  completedActionKeys?: string[]
  activeActionKey?: string | null
  activeActionKeys?: string[]
}

export interface FormOperationAction {
  key: string
  label: string
  icon?: ReactNode
  onClick: () => void
  hidden?: boolean
  disabled?: boolean
  disabledReason?: string
  tone?: FormOperationActionTone
  dataTourId?: string
  state?: FormOperationActionState
}

export interface FormOperationActionGroup {
  key: FormOperationActionGroupKey
  title?: string
  icon?: ReactNode
  operationKind?: FormOperationKind
  crudIntent?: FormOperationCrudIntent
  displayMode?: FormOperationDisplayMode
  description?: string
  dataTourId?: string
  progress?: FormOperationProgress
  actions: FormOperationAction[]
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

  /** Optional tab id to activate from parent-driven workflows */
  initialActiveTabId?: string
  
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
  masterSummaryTitle?: string
  masterSummaryBadgeLabel?: string
  masterSummaryReadOnly?: boolean
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

  /** Active tab observer for parent-driven lazy section hydration. */
  onActiveTabChange?: (tabId: string) => void

  /** Optional field change observer for parent-driven dynamic forms */
  onFieldChange?: (field: string, value: any, data: Record<string, any>) => void

  /** Structured form operations grouped by business intent. */
  operationActions?: FormOperationActionGroup[]
  
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

function RecordStatusBadge({ status }: { status?: unknown }) {
  const normalized = String(status || 'draft').trim().toLocaleLowerCase('tr-TR')
  const config: Record<string, { label: string; className: string }> = {
    draft: {
      label: 'Taslak',
      className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
    },
    taslak: {
      label: 'Taslak',
      className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
    },
    active: {
      label: 'Aktif',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
    },
    aktif: {
      label: 'Aktif',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
    },
    suspended: {
      label: 'Askıda',
      className: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300',
    },
    'askıda': {
      label: 'Askıda',
      className: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300',
    },
    expired: {
      label: 'Süresi Dolmuş',
      className: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300',
    },
    'süresi dolmuş': {
      label: 'Süresi Dolmuş',
      className: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300',
    },
    terminated: {
      label: 'Sona Erdi',
      className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
    },
    'sonlandırıldı': {
      label: 'Sona Erdi',
      className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
    },
    'sona erdi': {
      label: 'Sona Erdi',
      className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300',
    },
    passive: {
      label: 'Pasif',
      className: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
    },
    pasif: {
      label: 'Pasif',
      className: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
    },
  }
  const selected = config[normalized] || config.draft

  return (
    <span
      data-tour-id="record-lifecycle"
      className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', selected.className)}
    >
      Durum: {selected.label}
    </span>
  )
}

function MasterSummaryHero({
  result,
  locked,
  sourceData = {},
  readOnly = false,
  showBadge = true,
  titleLabel,
  badgeLabel = 'Temel Bilgiler',
  titleAsField = false,
  mode = 'default',
  requiredFields = [],
  fieldErrors = {},
  turkeyProvinces = [],
  onFieldChange,
}: {
  result: IdentityGateResolveResult | null
  locked: boolean
  sourceData?: Record<string, any>
  readOnly?: boolean
  showBadge?: boolean
  titleLabel?: string
  badgeLabel?: string
  titleAsField?: boolean
  mode?: MasterSummaryMode
  requiredFields?: FormField[]
  fieldErrors?: Record<string, string>
  turkeyProvinces?: TurkeyProvince[]
  onFieldChange?: (field: string, value: any, fieldKeys?: string[]) => void
}) {
  const kind = result?.entityKind
  const master = result?.masterRecord || null
  const prefill = { ...(result?.prefill || {}), ...sourceData }
  const effectiveMode = mode === 'entityIdentity'
    ? kind === 'organization' ? 'organizationIdentity' : 'personIdentity'
    : mode
  const Icon = kind === 'organization' ? Building2 : UserRound
  const title = kind === 'organization'
    ? readFirst(master, prefill, ['legal_name', 'trade_name', 'display_name', 'short_name'])
    : readFirst(master, prefill, ['full_name', 'display_name'])
      || [readFirst(master, prefill, ['first_name']), readFirst(master, prefill, ['last_name'])].filter(Boolean).join(' ')
  const summaryField = (...names: string[]) => requiredFields.find(field => names.includes(field.name))
  const taxOfficeField = summaryField('tax_office')
  const countryField = summaryField('country')

  const items = kind === 'organization'
    ? effectiveMode === 'organizationIdentity'
      ? [
          { label: 'Ticari Unvan', value: readFirst(master, prefill, ['legal_name', 'trade_name', 'display_name']), fieldKeys: ['trade_name', 'legal_name'] },
          { label: 'Kısa Ünvan', value: readFirst(master, prefill, ['short_name']), fieldKeys: ['short_name'] },
          { label: 'Vergi Dairesi', value: readFirst(master, prefill, ['tax_office']), fieldKeys: ['tax_office'], inputType: 'select' as const, searchable: taxOfficeField?.searchable, options: taxOfficeField?.options || [] },
          { label: 'Şirket Türü', value: readFirst(master, prefill, ['organization_type', 'company_type']), fieldKeys: ['company_type', 'organization_type'], inputType: 'select' as const, options: [
            { value: 'anonim', label: 'Sermaye Şirketi - Anonim' },
            { value: 'limited', label: 'Sermaye Şirketi - Limited' },
            { value: 'komandit', label: 'Sermaye Şirketi - Komandit' },
            { value: 'kolektif', label: 'Şahıs Şirketi - Kolektif' },
            { value: 'adi_komandit', label: 'Şahıs Şirketi - Adi Komandit' },
            { value: 'adi_sirket', label: 'Şahıs Şirketi - Adi Şirket' },
          ] },
          { label: 'Kuruluş Tarihi', value: readFirst(master, prefill, ['foundation_date']), fieldKeys: ['foundation_date'], inputType: 'date' as const },
          { label: 'Telefon', value: readFirst(master, prefill, ['phone']), fieldKeys: ['phone'] },
          { label: 'E-posta', value: readFirst(master, prefill, ['email']), fieldKeys: ['email'] },
          { label: 'Web Sitesi', value: readFirst(master, prefill, ['website']), fieldKeys: ['website'] },
          { label: 'Ülke', value: readFirst(master, prefill, ['country']), fieldKeys: ['country'], inputType: 'select' as const, options: countryField?.options?.length ? countryField.options : COUNTRY_OPTIONS },
          { label: 'İl', value: readFirst(master, prefill, ['city']), fieldKeys: ['city'] },
          { label: 'İlçe', value: readFirst(master, prefill, ['district']), fieldKeys: ['district'] },
          { label: 'Adres', value: readFirst(master, prefill, ['address']), fieldKeys: ['address'], inputType: 'textarea' as const },
        ]
      : compactSummaryItems([
          { label: 'Kısa Ünvan', value: readFirst(master, prefill, ['short_name']) },
          { label: 'Vergi Dairesi', value: readFirst(master, prefill, ['tax_office']) },
          { label: 'Telefon', value: readFirst(master, prefill, ['phone']) },
          { label: 'E-posta', value: readFirst(master, prefill, ['email']) },
          { label: 'Adres', value: formatAddress(master, prefill) },
        ])
    : effectiveMode === 'personIdentity'
      ? [
          { label: 'Ad', value: readFirst(master, prefill, ['first_name']), fieldKeys: ['first_name'] },
          { label: 'Soyad', value: readFirst(master, prefill, ['last_name']), fieldKeys: ['last_name'] },
          { label: 'Doğum Tarihi', value: readFirst(master, prefill, ['birth_date']), fieldKeys: ['birth_date'], inputType: 'date' as const },
          { label: 'Doğum Yeri', value: readFirst(master, prefill, ['birth_place']), fieldKeys: ['birth_place'] },
          { label: 'Cinsiyet', value: readFirst(master, prefill, ['gender']), fieldKeys: ['gender'], inputType: 'select' as const, options: [{ value: 'male', label: 'Erkek' }, { value: 'female', label: 'Kadın' }] },
          { label: 'Mesleği', value: readFirst(master, prefill, ['occupation']), fieldKeys: ['occupation'] },
        ]
    : compactSummaryItems([
        ...(titleAsField ? [{ label: 'Ad Soyad', value: title }] : []),
        { label: 'Uyruk', value: readFirst(master, prefill, ['nationality']) },
        { label: 'Dogum', value: readFirst(master, prefill, ['birth_date']) },
        { label: 'Telefon', value: readFirst(master, prefill, ['phone', 'mobile_phone']) },
        { label: 'E-posta', value: readFirst(master, prefill, ['email']) },
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

  const fallbackTitle = kind === 'organization' ? 'Tuzel kisi master kaydi' : 'Gercek kisi master kaydi'
  const showRecordTitle = !titleAsField && effectiveMode !== 'organizationIdentity'

  return (
    <div className="col-span-2 lg:col-span-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-lg bg-white p-2 text-emerald-700 shadow-sm dark:bg-gray-900 dark:text-emerald-300">
            <Icon size={18} />
          </div>
          {(titleLabel || showRecordTitle) && (
            <div className="min-w-0 flex-1">
              {titleLabel && (
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {titleLabel}
                </h4>
              )}
              {showRecordTitle && (
                titleLabel ? (
                  <p className="mt-0.5 truncate text-xs font-medium leading-5 text-gray-500 dark:text-gray-400">
                    {title || fallbackTitle}
                  </p>
                ) : (
                  <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {title || fallbackTitle}
                  </h4>
                )
              )}
            </div>
          )}
        </div>
        {showBadge && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-gray-900 dark:text-emerald-300">
          {badgeLabel}
        </span>}
      </div>
      {items.length > 0 && (
        <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {items.map(item => {
            const validationState = getMasterSummaryValidationState(item, sourceData, requiredFields, fieldErrors, readOnly)
            return (
            <div
              key={item.label}
              data-tour-field={item.fieldKeys?.[0]}
              className={cn(
                "rounded-lg border bg-white px-3 py-2 dark:bg-gray-900",
                validationState.status === 'invalid'
                  ? "border-red-200 dark:border-red-900/60"
                  : validationState.status === 'valid'
                    ? "border-emerald-200 dark:border-emerald-900/60"
                    : "border-emerald-100 dark:border-emerald-900/50"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className={cn(
                  "text-[13px] font-medium leading-5",
                  validationState.status === 'invalid'
                    ? "text-red-700 dark:text-red-400"
                    : validationState.status === 'valid'
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-gray-500 dark:text-gray-400"
                )}>
                  {item.label}
                </div>
                {validationState.label && (
                  <span className={cn(
                    "shrink-0 rounded border bg-white px-1.5 py-0.5 text-[10px] font-medium leading-none dark:bg-gray-900",
                    validationState.status === 'valid'
                      ? "border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400"
                      : "border-red-300 text-red-600 dark:border-red-700 dark:text-red-400"
                  )}>
                    {validationState.label}
                  </span>
                )}
              </div>
              <MasterSummaryItemValue
                item={item}
                sourceData={sourceData}
                readOnly={readOnly}
                turkeyProvinces={turkeyProvinces}
                onFieldChange={onFieldChange}
                validationState={validationState}
              />
            </div>
          )})}
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
  const address = readFirst(master, prefill, ['address'])
  const city = readFirst(master, prefill, ['city'])
  const district = readFirst(master, prefill, ['district'])
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
  turkeyProvinces = [],
  onFieldChange,
  validationState,
}: {
  item: MasterSummaryItem
  sourceData: Record<string, any>
  readOnly: boolean
  turkeyProvinces?: TurkeyProvince[]
  onFieldChange?: (field: string, value: any, fieldKeys?: string[]) => void
  validationState: { status: FormControlState; label: string }
}) {
  const fieldName = item.fieldKeys ? pickEditableFieldName(sourceData, item.fieldKeys) : null
  const canEdit = !!fieldName && !!onFieldChange && !readOnly
  const inputClass = formControlClass({ state: readOnly ? 'neutral' : validationState.status, rounded: 'md', size: 'field', className: 'mt-1' })
  const editableFieldName = fieldName || item.fieldKeys?.[0] || item.label
  const isCitySummaryField = item.fieldKeys?.includes('city')
  const isDistrictSummaryField = item.fieldKeys?.includes('district')
  const selectedCountry = normalizeCountryId(sourceData.country || 'TR')

  if (!canEdit) {
    return <div className="mt-0.5 truncate text-[13px] leading-5 text-gray-900 dark:text-white">{formatSummaryValue(item.value, item)}</div>
  }

  if (isCitySummaryField && selectedCountry === 'TR') {
    const selectedProvince = findTurkeyProvince(turkeyProvinces, item.value)
    const cityValue = selectedProvince?.name || String(item.value || '')

    return (
      <select
        value={cityValue}
        onChange={(event) => {
          const nextProvince = findTurkeyProvince(turkeyProvinces, event.target.value)
          const nextCity = nextProvince?.name || event.target.value
          const keepDistrict = nextProvince?.districts.some(district =>
            normalizeTurkeyLocationName(district.name) === normalizeTurkeyLocationName(sourceData.district)
          )
          onFieldChange(editableFieldName, nextCity, item.fieldKeys)
          if (!keepDistrict) onFieldChange('district', '', ['district'])
        }}
        className={inputClass}
      >
        <option value="">İl seçiniz</option>
        {cityValue && !selectedProvince && <option value={cityValue}>{cityValue}</option>}
        {turkeyProvinces.map(province => (
          <option key={province.id} value={province.name}>{province.name}</option>
        ))}
      </select>
    )
  }

  if (isDistrictSummaryField && selectedCountry === 'TR') {
    const selectedProvince = findTurkeyProvince(turkeyProvinces, sourceData.city)
    const selectedDistrict = selectedProvince?.districts.find(district =>
      normalizeTurkeyLocationName(district.name) === normalizeTurkeyLocationName(item.value)
    )
    const districtValue = selectedDistrict?.name || String(item.value || '')

    return (
      <select
        value={districtValue}
        onChange={(event) => onFieldChange(editableFieldName, event.target.value, item.fieldKeys)}
        disabled={!selectedProvince}
        className={cn(inputClass, !selectedProvince && "appearance-none")}
      >
        <option value="">{selectedProvince ? 'İlçe seçiniz' : 'Önce il seçiniz'}</option>
        {districtValue && selectedProvince && !selectedDistrict && <option value={districtValue}>{districtValue}</option>}
        {selectedProvince?.districts.map(district => (
          <option key={district.id} value={district.name}>{district.name}</option>
        ))}
      </select>
    )
  }

  if (item.inputType === 'select') {
    const selectValue = normalizeSummarySelectValue(item.value, item.options)
    if (item.searchable) {
      return (
        <SearchableSelectField
          field={{ name: editableFieldName, label: item.label, type: 'select', searchable: true, options: item.options || [] }}
          value={selectValue}
          disabled={readOnly}
          className={inputClass}
          onChange={(nextValue) => onFieldChange(editableFieldName, nextValue, item.fieldKeys)}
        />
      )
    }

    return (
      <select
        value={selectValue}
        onChange={(event) => onFieldChange(editableFieldName, event.target.value, item.fieldKeys)}
        className={inputClass}
      >
        <option value="">Seçiniz</option>
        {item.options?.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    )
  }

  if (item.inputType === 'textarea') {
    return (
      <textarea
        value={String(item.value || '')}
        onChange={(event) => onFieldChange(editableFieldName, event.target.value, item.fieldKeys)}
        rows={2}
        className={inputClass}
      />
    )
  }

  return (
    <input
      type="text"
      value={item.inputType === 'date' ? formatDateForDisplay(item.value) : String(item.value || '')}
      placeholder={item.inputType === 'date' ? 'gg.aa.yyyy' : undefined}
      onChange={(event) => onFieldChange(editableFieldName, item.inputType === 'date' ? normalizeDateDisplayInput(event.target.value) : event.target.value, item.fieldKeys)}
      className={inputClass}
    />
  )
}

function getMasterSummaryValidationState(
  item: MasterSummaryItem,
  sourceData: Record<string, any>,
  requiredFields: FormField[],
  fieldErrors: Record<string, string>,
  readOnly: boolean
): { status: FormControlState; label: string } {
  if (readOnly || !item.fieldKeys?.length) return { status: 'neutral', label: '' }

  const error = item.fieldKeys.map(key => fieldErrors[key]).find(Boolean)
  if (error) {
    return {
      status: 'invalid',
      label: error.includes('format') || error.includes('olmalıdır') ? 'Geçersiz Format' : 'Zorunlu Alan',
    }
  }

  const backingField = requiredFields.find(field =>
    item.fieldKeys?.includes(field.name) && matchesCondition(field.visibleWhen, sourceData)
  )
  const required = !!backingField && (backingField.required || !!(backingField.requiredWhen && matchesCondition(backingField.requiredWhen, sourceData)))

  if (!required) return { status: 'neutral', label: '' }

  const filled = item.fieldKeys.some(key => hasValue(sourceData[key])) || hasValue(item.value)
  return filled
    ? { status: 'valid', label: 'Tamam' }
    : { status: 'invalid', label: 'Zorunlu Alan' }
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
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return text
  const displayMatch = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (displayMatch) return `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}`
  const digits = text.replace(/\D/g, '').slice(0, 8)
  if (!digits) return ''
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length < 8) return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
  return `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`
}

function formatGender(value: unknown) {
  const normalized = String(value || '').toLocaleLowerCase('tr-TR')
  if (normalized === 'male') return 'Erkek'
  if (normalized === 'female' || normalized === 'kadın') return 'Kadın'
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

function SectionLoadIcon({ stage }: { stage?: FormLoadStage }) {
  if (!stage || stage.status === 'idle' || stage.status === 'skipped') return null

  return (
    <div
      className={cn(
        "pointer-events-none absolute right-2 top-2 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border bg-white/95 shadow-sm dark:bg-gray-900/95",
        stage.status === 'ready' && "border-emerald-200 text-emerald-600 dark:border-emerald-900/70 dark:text-emerald-300",
        stage.status === 'loading' && "border-sky-200 text-sky-600 dark:border-sky-900/70 dark:text-sky-300",
        stage.status === 'error' && "border-red-200 text-red-600 dark:border-red-900/70 dark:text-red-300",
      )}
      title={stage.description || stage.label}
      aria-label={stage.label}
    >
      {stage.status === 'ready' ? (
        <CheckCircle2 size={15} />
      ) : stage.status === 'loading' ? (
        <Loader2 size={15} className="animate-spin" />
      ) : stage.status === 'error' ? (
        <AlertCircle size={15} />
      ) : (
        <Circle size={15} />
      )}
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
      legal_name: source.legal_name || source.trade_name || source.display_name || '',
      short_name: source.short_name || '',
      country: source.country || 'TR',
      tax_number: source.tax_number || '',
      registration_number: source.registration_number || source.trade_registry_number || source.mersis_number || '',
      tax_office: source.tax_office || '',
      phone: source.phone || '',
      email: source.email || '',
      address: source.address || '',
      city: source.city || '',
      district: source.district || '',
    }
  }

  return {
    id: source.person_id || source.master_record_id || null,
    first_name: source.first_name || '',
    last_name: source.last_name || '',
    full_name: source.full_name || source.display_name || [source.first_name, source.last_name].filter(Boolean).join(' '),
    nationality: source.nationality || 'TR',
    national_id: source.national_id || '',
    passport_no: source.passport_no || '',
    birth_date: source.birth_date || '',
    birth_place: source.birth_place || '',
    gender: source.gender || '',
    phone: source.phone || source.mobile_phone || '',
    email: source.email || '',
    address: source.address || '',
    city: source.city || '',
    district: source.district || '',
  }
}

type MasterSummaryItem = {
  label: string
  value: unknown
  fieldKeys?: string[]
  inputType?: 'text' | 'date' | 'select' | 'textarea'
  searchable?: boolean
  options?: FieldOption[]
}

type MasterSummaryMode = 'default' | 'personIdentity' | 'organizationIdentity' | 'entityIdentity'

const MASTER_IDENTITY_FIELD_NAMES = new Set([
  'last_name',
  'first_name',
  'full_name',
  'display_name',
  'person_or_entity_type',
  'person_kind',
  'partner_type',
  'stakeholder_type',
  'trade_name',
  'legal_name',
  'short_name',
  'nationality',
  'national_id',
  'passport_no',
  'tax_number',
  'trade_registry_number',
  'registration_number',
  'mersis_number',
  'birth_date',
  'birth_place',
  'gender',
  'occupation',
  'tax_office',
  'company_type',
  'foundation_date',
  'phone',
  'mobile_phone',
  'email',
  'address',
  'city',
  'district',
  'phones',
  'emails',
])

function readIdentityResultValue(result: IdentityGateResolveResult, field: string) {
  const prefill = result.prefill || {}
  if (hasValue(prefill[field])) return prefill[field]
  if (hasValue(result.masterRecord?.[field])) return result.masterRecord?.[field]
  return undefined
}

function mergeIdentityResultIntoFormData(
  currentData: Record<string, any>,
  result: IdentityGateResolveResult
) {
  const next = { ...currentData }

  Object.entries(result.prefill || {}).forEach(([key, value]) => {
    if (hasValue(value) || !hasValue(next[key])) {
      next[key] = value
    }
  })

  MASTER_IDENTITY_FIELD_NAMES.forEach(field => {
    if (hasValue(next[field])) return
    const value = readIdentityResultValue(result, field)
    if (hasValue(value)) next[field] = value
  })

  return {
    ...next,
    master_entity_kind: result.entityKind,
    master_record_id: result.masterRecord?.id || null,
    identity_gate_state: result.state,
  }
}

function enrichFormDataWithIdentityResult(
  sourceData: Record<string, any>,
  result: IdentityGateResolveResult | null
) {
  if (!result) return sourceData

  const next = { ...sourceData }
  Object.entries(result.prefill || {}).forEach(([key, value]) => {
    if (!hasValue(next[key]) && hasValue(value)) {
      next[key] = value
    }
  })

  MASTER_IDENTITY_FIELD_NAMES.forEach(field => {
    if (hasValue(next[field])) return
    const value = readIdentityResultValue(result, field)
    if (hasValue(value)) next[field] = value
  })

  if (!hasValue(next.master_entity_kind)) next.master_entity_kind = result.entityKind
  if (!hasValue(next.master_record_id) && hasValue(result.masterRecord?.id)) next.master_record_id = result.masterRecord?.id
  if (!hasValue(next.identity_gate_state)) next.identity_gate_state = result.state

  return next
}

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

type ImageVariantResult = {
  previewUrl: string
  thumbnailUrl?: string
  previewSize?: number
}

async function createImageVariantsOnServer(
  file: File,
  options: { maxDimension: number; thumbnailDimension?: number; quality?: number; thumbnailQuality?: number; transparentBackground?: boolean }
): Promise<ImageVariantResult> {
  const body = new FormData()
  body.append('file', file)
  body.append('maxDimension', String(options.maxDimension))
  body.append('thumbnailDimension', String(options.thumbnailDimension ?? 96))
  body.append('quality', String(options.quality ?? 0.78))
  body.append('thumbnailQuality', String(options.thumbnailQuality ?? 0.72))
  if (options.transparentBackground) body.append('transparentBackground', 'true')

  const response = await fetch('/api/uploads/image-variants', {
    method: 'POST',
    body,
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.previewUrl) {
    throw new Error(result.error || 'Gorsel onizlemesi olusturulamadi')
  }

  return {
    previewUrl: String(result.previewUrl),
    thumbnailUrl: result.thumbnailUrl ? String(result.thumbnailUrl) : undefined,
    previewSize: Number(result.previewSize || 0) || undefined,
  }
}

function avatarImageMaxDimension(slotId?: string) {
  if (!slotId) return 512
  if (['photo', 'photo_logo', 'light_mode_avatar', 'dark_mode_avatar'].includes(slotId)) return 384
  return 512
}

function shouldUseTransparentImageBackground(slotId?: string) {
  return !!slotId && ['light_mode_avatar', 'dark_mode_avatar', 'document_logo', 'original_logo', 'logo_primary'].includes(slotId)
}

function normalizeStoredImages(value: unknown): SlotImage[] {
  const images = Array.isArray(value) ? value : value ? [value] : []

  return images
    .filter((image): image is Record<string, any> => !!image && typeof image === 'object')
    .map(image => ({
      slotId: image.slotId || image.slot_id || 'photo',
      previewUrl: image.previewUrl || image.preview_url || image.url || image.signedUrl || image.signed_url || image.thumbnailUrl || image.thumbnail_url || image.preview_thumb_url || image.preview_image_url,
      thumbnailUrl: image.thumbnailUrl || image.thumbnail_url || image.preview_thumb_url || image.preview_image_url,
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
    previewUrl: image.previewUrl,
    thumbnailUrl: image.thumbnailUrl,
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
        thumbnailPath: doc.thumbnailPath || doc.thumbnail_path || doc.preview_thumb_path || doc.preview_image_path,
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
    thumbnailUrl,
    thumbnailPath: doc.thumbnailPath
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
  if (value.startsWith('data:image/svg+xml')) return false
  if (!value.startsWith('data:')) return true
  return false
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
    thumbnailUrl: result.thumbnailUrl || (document.type?.startsWith('image/') ? result.url : document.thumbnailUrl),
    thumbnailPath: result.thumbnailPath || document.thumbnailPath,
    name: document.name || result.name || document.file.name,
    size: document.size || result.size || document.file.size,
    type: document.type || result.type || document.file.type,
  }
}

function getDocumentSlotStorageField(slot: DocumentSlot) {
  if (slot.storageField) return slot.storageField
  if (slot.id === 'cv') return 'cv_document'
  if (slot.id === 'diploma') return 'diploma_document'
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
  const staticOptions = field.options || []
  const remoteConfig = field.remoteOptions
  const hasRemoteOptions = !!remoteConfig?.endpoint
  const [remoteOptions, setRemoteOptions] = useState<FieldOption[]>([])
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [remoteError, setRemoteError] = useState<string | null>(null)
  const loadedOptions = useMemo(() => mergeFieldOptions(staticOptions, remoteOptions), [staticOptions, remoteOptions])
  const selectedLabel = loadedOptions.find(option => option.value === value)?.label || value || ''
  const [query, setQuery] = useState(selectedLabel)
  const [open, setOpen] = useState(false)
  const commitOptions = useMemo(() => (
    value && !loadedOptions.some(option => option.value === value)
      ? [{ value, label: selectedLabel }, ...loadedOptions]
      : loadedOptions
  ), [loadedOptions, selectedLabel, value])
  const filteredOptions = hasRemoteOptions
    ? remoteOptions.slice(0, 80)
    : commitOptions
        .filter(option => {
          const q = normalizeSearchableEnumText(query)
          return normalizeSearchableEnumText(option.label).includes(q) || normalizeSearchableEnumText(option.value).includes(q)
        })
        .slice(0, 80)
  const minQueryLength = remoteConfig?.minQueryLength ?? 0
  const showMinimumHint = hasRemoteOptions && !remoteConfig?.preload && query.trim().length < minQueryLength

  useEffect(() => {
    setQuery(selectedLabel)
  }, [selectedLabel])

  useEffect(() => {
    if (!hasRemoteOptions || disabled || !open || !remoteConfig?.endpoint) return
    const trimmedQuery = query.trim()
    if (!remoteConfig.preload && trimmedQuery.length < minQueryLength) {
      setRemoteOptions([])
      setRemoteLoading(false)
      setRemoteError(null)
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      const url = new URL(remoteConfig.endpoint, window.location.origin)
      url.searchParams.set(remoteConfig.queryParam || 'q', trimmedQuery)
      if (remoteConfig.limit) url.searchParams.set('limit', String(remoteConfig.limit))

      setRemoteLoading(true)
      setRemoteError(null)
      fetch(url.toString(), { signal: controller.signal })
        .then(response => {
          if (!response.ok) throw new Error('Seçenekler alınamadı')
          return response.json()
        })
        .then(payload => {
          setRemoteOptions(parseRemoteOptionsPayload(payload))
        })
        .catch(error => {
          if (controller.signal.aborted) return
          setRemoteOptions([])
          setRemoteError(error instanceof Error ? error.message : 'Seçenekler alınamadı')
        })
        .finally(() => {
          if (!controller.signal.aborted) setRemoteLoading(false)
        })
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [
    disabled,
    hasRemoteOptions,
    minQueryLength,
    open,
    query,
    remoteConfig?.endpoint,
    remoteConfig?.limit,
    remoteConfig?.preload,
    remoteConfig?.queryParam,
  ])

  const commitIfExactMatch = (text: string) => {
    const normalized = normalizeSearchableEnumText(text)
    if (!normalized) {
      setQuery('')
      onChange('')
      return
    }

    const exact = commitOptions.find(option =>
      normalizeSearchableEnumText(option.label) === normalized ||
      normalizeSearchableEnumText(option.value) === normalized
    )
    if (exact) {
      setQuery(exact.label)
      onChange(exact.value)
      return
    }

    const prefixMatches = commitOptions.filter(option =>
      normalizeSearchableEnumText(option.label).startsWith(normalized) ||
      normalizeSearchableEnumText(option.value).startsWith(normalized)
    )
    if (normalized && prefixMatches.length === 1) {
      setQuery(prefixMatches[0].label)
      onChange(prefixMatches[0].value)
      return
    }

    if (hasRemoteOptions) {
      setQuery(text)
      onChange(text)
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
        <div className="absolute left-0 top-full z-[80] mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
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
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              {showMinimumHint
                ? `Aramak için en az ${minQueryLength} karakter yazın`
                : remoteLoading
                  ? 'Aranıyor...'
                  : remoteError || 'Sonuç bulunamadı'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function mergeFieldOptions(...optionGroups: FieldOption[][]): FieldOption[] {
  const merged: FieldOption[] = []
  const seen = new Set<string>()

  optionGroups.flat().forEach(option => {
    const cleanOption = asFieldOption(option)
    if (!cleanOption) return
    const key = `${cleanOption.value}\u0000${cleanOption.label}`
    if (seen.has(key)) return
    seen.add(key)
    merged.push(cleanOption)
  })

  return merged
}

function parseRemoteOptionsPayload(payload: unknown): FieldOption[] {
  const candidate = payload as {
    data?: unknown[]
    options?: unknown[]
    offices?: unknown[]
    provinces?: unknown[]
    districts?: unknown[]
  } | null
  const source = Array.isArray(candidate?.options)
    ? candidate.options
    : Array.isArray(candidate?.data)
      ? candidate.data
    : Array.isArray(candidate?.districts)
      ? candidate.districts
      : Array.isArray(candidate?.provinces)
        ? candidate.provinces
        : Array.isArray(candidate?.offices)
          ? candidate.offices
          : []

  return source.map(asFieldOption).filter((option): option is FieldOption => !!option)
}

function asFieldOption(option: unknown): FieldOption | null {
  if (!option || typeof option !== 'object') return null
  const candidate = option as { value?: unknown; label?: unknown; name?: unknown; code?: unknown; id?: unknown; short_name?: unknown; trade_name?: unknown; display_name?: unknown; tax_number?: unknown }
  const name = candidate.name ?? candidate.short_name ?? candidate.trade_name ?? candidate.display_name
  const labelBase = String(candidate.label ?? name ?? '').trim()
  const value = String(candidate.value ?? candidate.id ?? candidate.name ?? labelBase).trim()
  const taxNumber = String(candidate.tax_number ?? '').trim()
  const label = !candidate.label && taxNumber && labelBase ? `${labelBase} — ${taxNumber}` : labelBase
  if (!value || !label) return null
  const code = String(candidate.code ?? '').trim()
  return {
    value,
    label: !candidate.label && code ? `${code} - ${label}` : label,
  }
}

function normalizeSearchableEnumText(value: unknown) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\u0131/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

  if (name === 'full_name') {
    const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ')
    if (fullName) return fullName
  }

  if (!hasValue(value)) return value

  if (item.type === 'select' && item.options?.length) {
    const normalized = normalizeSummarySelectValue(value, item.options)
    return item.options.find(option => option.value === normalized)?.label || String(value)
  }

  if (item.type === 'date') {
    return formatDateForDisplay(value)
  }

  if (item.type === 'document' && value && typeof value === 'object') {
    const documentValue = value as Record<string, any>
    return documentValue.name || documentValue.fileName || documentValue.file_name || documentValue.title || 'Belge'
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

  const getDraftValidationState = (item: FormField): FormControlState => {
    const name = fieldName(item)
    const itemDisabled = disabled || readOnly || (item.disabledWhen ? matchesCondition(item.disabledWhen, draft) : false)
    if (itemDisabled || item.type === 'section' || !matchesCondition(item.visibleWhen, draft)) return 'neutral'
    if (errors[name]) return 'invalid'

    const value = draft[name]
    const required = item.required || !!(item.requiredWhen && matchesCondition(item.requiredWhen, draft))
    if (required && !hasValue(value)) return 'invalid'

    if (item.pattern && hasValue(value)) {
      const regex = new RegExp(`^(?:${item.pattern})$`)
      return regex.test(String(value)) ? (required ? 'valid' : 'neutral') : 'invalid'
    }

    if (required && hasValue(value)) return 'valid'
    return 'neutral'
  }

  const draftInputClass = (item: FormField) => formControlClass({
    state: getDraftValidationState(item),
    surface: item.type === 'select' ? 'enum' : 'default',
  })

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
          className={draftInputClass(item)}
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
          className={draftInputClass(item)}
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
        className={draftInputClass(item)}
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

function WorkLifecycleField({
  formData,
  onChange,
  readOnly,
}: {
  formData: Record<string, any>
  onChange: (field: string, value: any) => void
  readOnly: boolean
}) {
  const isHired = !!formData.sgk_entry_date
  const isExited = !!formData.exit_date
  const [inlineHireDate, setInlineHireDate] = useState(formData.sgk_entry_date || '')
  const [inlineExitDate, setInlineExitDate] = useState(formData.exit_date || '')
  const [hireMode, setHireMode] = useState(formData.sgk_entry_method || 'servis')
  const [exitMode, setExitMode] = useState(formData.sgk_exit_method || 'servis')
  const [inlineError, setInlineError] = useState('')
  const [sgkCodeCategories, setSgkCodeCategories] = useState<SgkCodeCategories>({})

  useEffect(() => {
    setInlineHireDate(formData.sgk_entry_date || '')
    setInlineExitDate(formData.exit_date || '')
    setHireMode(formData.sgk_entry_method || 'servis')
    setExitMode(formData.sgk_exit_method || 'servis')
  }, [formData.sgk_entry_date, formData.exit_date, formData.sgk_entry_method, formData.sgk_exit_method])

  useEffect(() => {
    let active = true
    const categories = [
      'insuranceBranches',
      'dutyCodes',
      'occupationCodes',
      'csgbBusinessLines',
      'educationCodes',
      'exitReasons',
      'documentTypes',
    ]

    Promise.all(categories.map(category =>
      fetch(`/api/reference/sgk-codes?category=${encodeURIComponent(category)}`)
        .then(response => response.ok ? response.json() : null)
        .catch(() => null)
    ))
      .then(payloads => {
        if (!active) return
        const nextCategories = payloads.reduce<SgkCodeCategories>((accumulator, payload) => ({
          ...accumulator,
          ...(payload?.categories || {}),
        }), {})
        setSgkCodeCategories(nextCategories)
      })
      .catch(() => {
        if (active) setSgkCodeCategories({})
      })

    return () => {
      active = false
    }
  }, [])

  const updateHireMode = (mode: string) => {
    setHireMode(mode)
    onChange('sgk_entry_method', mode)
  }

  const updateExitMode = (mode: string) => {
    setExitMode(mode)
    onChange('sgk_exit_method', mode)
  }

  const activateInlineHire = () => {
    if (!inlineHireDate) {
      setInlineError('İşe giriş tarihi zorunludur')
      return
    }

    setInlineError('')
    onChange('sgk_entry_method', hireMode)
    onChange('sgk_entry_date', inlineHireDate)
    onChange('work_status', 'active')
  }

  const activateInlineExit = () => {
    if (!inlineExitDate) {
      setInlineError('İşten çıkış tarihi zorunludur')
      return
    }

    setInlineError('')
    onChange('sgk_exit_method', exitMode)
    onChange('exit_date', inlineExitDate)
    onChange('work_status', 'terminated')
  }

  const inputClass = formControlClass({ className: 'min-h-10' })
  const compactInputClass = formControlClass({ rounded: 'md', size: 'sm', className: 'min-h-9' })
  const actionReadOnly = readOnly
  const hireReadOnly = actionReadOnly || isHired
  const exitReadOnly = actionReadOnly || !isHired || isExited

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              İşe Giriş
            </label>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-800">
              {[
                ['servis', 'SGK Servisi'],
                ['web', 'Webden Yapıldı'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateHireMode(value)}
                  disabled={hireReadOnly}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed",
                    hireMode === value ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="date"
              value={inlineHireDate ? String(inlineHireDate).split('T')[0] : ''}
              onChange={(event) => {
                setInlineHireDate(event.target.value)
                if (inlineError) setInlineError('')
              }}
              readOnly={hireReadOnly}
              className={cn(inputClass, "flex-1")}
            />
            <button
              type="button"
              onClick={activateInlineHire}
              disabled={hireReadOnly}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isHired ? <CheckCircle2 size={16} /> : <Briefcase size={16} />}
              {isHired ? 'Giriş Yapıldı' : hireMode === 'servis' ? 'SGK Girişi Yap' : 'Giriş Yap'}
            </button>
          </div>

          {hireMode === 'servis' ? (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <SgkCodeField label="Sigorta kolu" field="sgk_entry_insurance_branch" value={formData.sgk_entry_insurance_branch || '0'} onChange={onChange} readOnly={hireReadOnly} className={compactInputClass} options={sgkCodeCategories.insuranceBranches} />
              <SgkCodeField label="Görev kodu" field="sgk_entry_duty_code" value={formData.sgk_entry_duty_code || '2'} onChange={onChange} readOnly={hireReadOnly} className={compactInputClass} options={sgkCodeCategories.dutyCodes} />
              <SgkCodeField label="Meslek kodu" field="sgk_entry_occupation_code" value={formData.sgk_entry_occupation_code || ''} onChange={onChange} readOnly={hireReadOnly} className={compactInputClass} options={sgkCodeCategories.occupationCodes} />
              <SgkCodeField label="ÇSGB iş kolu" field="sgk_entry_csgb_business_line" value={formData.sgk_entry_csgb_business_line || ''} onChange={onChange} readOnly={hireReadOnly} className={compactInputClass} options={sgkCodeCategories.csgbBusinessLines} />
              <SgkSelectField label="Engelli" field="sgk_entry_has_disability" value={formData.sgk_entry_has_disability || 'H'} onChange={onChange} readOnly={hireReadOnly} className={compactInputClass} options={SGK_YES_NO_OPTIONS} />
              <SgkSelectField label="Eski hükümlü" field="sgk_entry_has_prior_conviction" value={formData.sgk_entry_has_prior_conviction || 'H'} onChange={onChange} readOnly={hireReadOnly} className={compactInputClass} options={SGK_YES_NO_OPTIONS} />
              <SgkCodeField label="Öğrenim kodu" field="sgk_entry_education_code" value={formData.sgk_entry_education_code || ''} onChange={onChange} readOnly={hireReadOnly} className={compactInputClass} options={sgkCodeCategories.educationCodes} />
              <SgkTextField label="Mezuniyet yılı" field="sgk_entry_graduation_year" value={formData.sgk_entry_graduation_year || ''} onChange={onChange} readOnly={hireReadOnly} className={compactInputClass} />
              <SgkTextField label="Kısmi gün" field="sgk_entry_partial_day_count" value={formData.sgk_entry_partial_day_count || ''} onChange={onChange} readOnly={hireReadOnly} className={compactInputClass} />
              <SgkTextField label="Referans kodu" field="sgk_entry_reference_no" value={formData.sgk_entry_reference_no || ''} onChange={onChange} readOnly={actionReadOnly} className={compactInputClass} />
              <div className="sm:col-span-2">
                <SgkTextField label="Mezuniyet bölümü" field="sgk_entry_graduation_department" value={formData.sgk_entry_graduation_department || ''} onChange={onChange} readOnly={hireReadOnly} className={compactInputClass} />
              </div>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <SgkTextField label="Web referans / takip no" field="sgk_entry_reference_no" value={formData.sgk_entry_reference_no || ''} onChange={onChange} readOnly={hireReadOnly} className={compactInputClass} />
              <SgkTextField label="Bildirim yapan" field="sgk_entry_reported_by" value={formData.sgk_entry_reported_by || ''} onChange={onChange} readOnly={hireReadOnly} className={compactInputClass} />
            </div>
          )}
        </div>

        <div className={cn(
          "rounded-lg border p-3",
          isHired ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900" : "border-gray-200 bg-gray-50 opacity-70 dark:border-gray-800 dark:bg-gray-950"
        )}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              İşten Çıkış
            </label>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-800">
              {[
                ['servis', 'SGK Servisi'],
                ['web', 'Webden Yapıldı'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateExitMode(value)}
                  disabled={exitReadOnly}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed",
                    exitMode === value ? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="date"
              value={inlineExitDate ? String(inlineExitDate).split('T')[0] : ''}
              onChange={(event) => {
                setInlineExitDate(event.target.value)
                if (inlineError) setInlineError('')
              }}
              readOnly={exitReadOnly}
              className={cn(inputClass, "flex-1")}
            />
            <button
              type="button"
              onClick={activateInlineExit}
              disabled={exitReadOnly}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isExited ? <CheckCircle2 size={16} /> : <LogOut size={16} />}
              {isExited ? 'Çıkış Yapıldı' : exitMode === 'servis' ? 'SGK Çıkışı Yap' : 'Çıkış Yap'}
            </button>
          </div>

          {exitMode === 'servis' ? (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <SgkCodeField label="Çıkış nedeni" field="sgk_exit_reason" value={formData.sgk_exit_reason || ''} onChange={onChange} readOnly={exitReadOnly} className={compactInputClass} options={sgkCodeCategories.exitReasons} />
              <SgkCodeField label="Meslek kodu" field="sgk_exit_occupation_code" value={formData.sgk_exit_occupation_code || formData.sgk_entry_occupation_code || ''} onChange={onChange} readOnly={exitReadOnly} className={compactInputClass} options={sgkCodeCategories.occupationCodes} />
              <SgkCodeField label="ÇSGB iş kolu" field="sgk_exit_csgb_business_line" value={formData.sgk_exit_csgb_business_line || formData.sgk_entry_csgb_business_line || ''} onChange={onChange} readOnly={exitReadOnly} className={compactInputClass} options={sgkCodeCategories.csgbBusinessLines} />
              <SgkSelectField label="Ücret yüzde usulü" field="sgk_exit_percentage_wage_method" value={formData.sgk_exit_percentage_wage_method || 'H'} onChange={onChange} readOnly={exitReadOnly} className={compactInputClass} options={SGK_YES_NO_OPTIONS} />
              <SgkCodeField label="Önceki belge türü" field="sgk_exit_previous_document_type" value={formData.sgk_exit_previous_document_type || '1'} onChange={onChange} readOnly={exitReadOnly} className={compactInputClass} options={sgkCodeCategories.documentTypes} />
              <SgkTextField label="Önceki hak edilen ücret" field="sgk_exit_previous_earned_wage" value={formData.sgk_exit_previous_earned_wage || ''} onChange={onChange} readOnly={exitReadOnly} className={compactInputClass} />
              <SgkCodeField label="Bu dönem belge türü" field="sgk_exit_current_document_type" value={formData.sgk_exit_current_document_type || '1'} onChange={onChange} readOnly={exitReadOnly} className={compactInputClass} options={sgkCodeCategories.documentTypes} />
              <SgkTextField label="Bu dönem hak edilen ücret" field="sgk_exit_current_earned_wage" value={formData.sgk_exit_current_earned_wage || ''} onChange={onChange} readOnly={exitReadOnly} className={compactInputClass} />
              <SgkTextField label="Referans kodu" field="sgk_exit_reference_no" value={formData.sgk_exit_reference_no || ''} onChange={onChange} readOnly={actionReadOnly} className={compactInputClass} />
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <SgkTextField label="Web referans / takip no" field="sgk_exit_reference_no" value={formData.sgk_exit_reference_no || ''} onChange={onChange} readOnly={exitReadOnly} className={compactInputClass} />
              <SgkTextField label="Bildirim yapan" field="sgk_exit_reported_by" value={formData.sgk_exit_reported_by || ''} onChange={onChange} readOnly={exitReadOnly} className={compactInputClass} />
            </div>
          )}
        </div>
      </div>

      {inlineError && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">{inlineError}</p>
      )}
    </div>
  )
}

const SGK_YES_NO_OPTIONS = [
  { value: 'H', label: 'Hayır' },
  { value: 'E', label: 'Evet' },
]

function SgkCodeField({
  label,
  field,
  value,
  onChange,
  readOnly,
  className,
  options,
}: {
  label: string
  field: string
  value: string
  onChange: (field: string, value: any) => void
  readOnly: boolean
  className: string
  options?: SgkCodeOption[]
}) {
  const datalistId = `sgk-code-${field}`

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      <input
        type="text"
        list={options?.length ? datalistId : undefined}
        value={value}
        onChange={(event) => onChange(field, event.target.value)}
        readOnly={readOnly}
        className={className}
      />
      {options?.length ? (
        <datalist id={datalistId}>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </datalist>
      ) : null}
    </label>
  )
}

function SgkTextField({
  label,
  field,
  value,
  onChange,
  readOnly,
  className,
}: {
  label: string
  field: string
  value: string
  onChange: (field: string, value: any) => void
  readOnly: boolean
  className: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(field, event.target.value)}
        readOnly={readOnly}
        className={className}
      />
    </label>
  )
}

function SgkSelectField({
  label,
  field,
  value,
  onChange,
  readOnly,
  className,
  options,
}: {
  label: string
  field: string
  value: string
  onChange: (field: string, value: any) => void
  readOnly: boolean
  className: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(field, event.target.value)}
        disabled={readOnly}
        className={className}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

const DEFAULT_OPERATION_GROUP_TITLES: Record<string, string> = {
  lifecycle: 'Yaşam Döngüsü',
  official_updates: 'Resmi Değişiklikler',
  registration: 'Resmi Değişiklikler',
  update: 'Resmi Değişiklikler',
  basic_update: 'Güncelle',
  other: 'Diğer İşlemler',
}

const DEFAULT_OPERATION_GROUP_ICONS: Record<string, ReactNode> = {
  lifecycle: <Clock size={15} />,
  official_updates: <FileText size={15} />,
  registration: <FileText size={15} />,
  update: <FileText size={15} />,
  basic_update: <Edit3 size={15} />,
  other: <Briefcase size={15} />,
}

const STANDARD_OPERATION_GROUP_CONFIG: Record<string, Partial<FormOperationActionGroup>> = {
  lifecycle: {
    title: 'Yaşam Döngüsü',
    operationKind: 'lifecycle',
    crudIntent: 'create_delete',
    displayMode: 'dropdown_button',
    dataTourId: 'record-operation-lifecycle',
  },
  official_updates: {
    title: 'Resmi Değişiklikler',
    operationKind: 'official_update',
    crudIntent: 'official_update',
    displayMode: 'dropdown_button',
    dataTourId: 'record-operation-official-updates',
  },
  registration: {
    title: 'Resmi Değişiklikler',
    operationKind: 'official_update',
    crudIntent: 'official_update',
    displayMode: 'dropdown_button',
    dataTourId: 'record-operation-official-updates',
  },
  update: {
    title: 'Resmi Değişiklikler',
    operationKind: 'official_update',
    crudIntent: 'official_update',
    displayMode: 'dropdown_button',
    dataTourId: 'record-operation-official-updates',
  },
  basic_update: {
    title: 'Güncelle',
    operationKind: 'basic_update',
    crudIntent: 'update',
    displayMode: 'single_button',
    dataTourId: 'record-operation-basic-update',
  },
}

const OPERATION_GROUP_ORDER: Record<FormOperationKind, number> = {
  lifecycle: 0,
  official_update: 1,
  basic_update: 2,
  general: 3,
}

const OPERATION_KIND_DEFAULT_CONFIG: Record<FormOperationKind, Partial<FormOperationActionGroup>> = {
  lifecycle: {
    title: 'Yaşam Döngüsü',
    crudIntent: 'create_delete',
    displayMode: 'dropdown_button',
    dataTourId: 'record-operation-lifecycle',
  },
  official_update: {
    title: 'Resmi Değişiklikler',
    crudIntent: 'official_update',
    displayMode: 'dropdown_button',
    dataTourId: 'record-operation-official-updates',
  },
  basic_update: {
    title: 'Güncelle',
    crudIntent: 'update',
    displayMode: 'single_button',
    dataTourId: 'record-operation-basic-update',
  },
  general: {},
}

function normalizeFormOperationGroups(groups?: FormOperationActionGroup[]) {
  return (groups || [])
    .filter(group => !isHistoryOperationGroup(group))
    .map(group => {
      const keyConfig = STANDARD_OPERATION_GROUP_CONFIG[group.key] || {}
      const operationKind = (keyConfig.operationKind || group.operationKind || inferOperationKind(group.key)) as FormOperationKind
      const kindConfig = OPERATION_KIND_DEFAULT_CONFIG[operationKind] || OPERATION_KIND_DEFAULT_CONFIG.general
      const normalizedGroup: FormOperationActionGroup = {
        ...group,
        title: (keyConfig.title || group.title || kindConfig.title) as string | undefined,
        operationKind,
        crudIntent: (keyConfig.crudIntent || group.crudIntent || kindConfig.crudIntent) as FormOperationCrudIntent | undefined,
        displayMode: (group.displayMode || keyConfig.displayMode || kindConfig.displayMode) as FormOperationDisplayMode | undefined,
        dataTourId: group.dataTourId || keyConfig.dataTourId || kindConfig.dataTourId,
        actions: group.actions.filter(action => !action.hidden && !isHistoryOperationAction(action)),
      }

      return {
        ...normalizedGroup,
        actions: resolveOperationActionStates(normalizedGroup),
      }
    })
    .filter(group => group.actions.length > 0)
}

function inferOperationKind(groupKey: FormOperationActionGroupKey): FormOperationKind {
  if (groupKey === 'lifecycle') return 'lifecycle'
  if (groupKey === 'official_updates' || groupKey === 'registration' || groupKey === 'update') return 'official_update'
  if (groupKey === 'basic_update') return 'basic_update'
  return 'general'
}

function resolveOperationActionStates(group: FormOperationActionGroup) {
  if (group.operationKind !== 'lifecycle' || !group.progress) return group.actions

  const completedKeys = new Set(group.progress.completedActionKeys || [])
  const activeKeys = new Set([
    ...(group.progress.activeActionKeys || []),
    group.progress.activeActionKey || '',
  ].filter(Boolean))
  const activeIndexes = group.actions
    .map((action, index) => activeKeys.has(action.key) ? index : -1)
    .filter(index => index >= 0)
  const firstActiveIndex = activeIndexes.length ? Math.min(...activeIndexes) : -1
  const lastActiveIndex = activeIndexes.length ? Math.max(...activeIndexes) : -1

  return group.actions.map((action, index) => ({
    ...action,
    state: action.state || resolveOperationActionState(action, index, completedKeys, activeKeys, firstActiveIndex, lastActiveIndex),
  }))
}

function resolveOperationActionState(
  action: FormOperationAction,
  index: number,
  completedKeys: Set<string>,
  activeKeys: Set<string>,
  firstActiveIndex: number,
  lastActiveIndex: number
): FormOperationActionState | undefined {
  if (completedKeys.has(action.key)) return 'completed'
  if (activeKeys.has(action.key)) return 'active'
  if (firstActiveIndex >= 0 && index < firstActiveIndex) return 'completed'
  if (lastActiveIndex >= 0 && index > lastActiveIndex) return 'upcoming'
  if (completedKeys.size > 0 || activeKeys.size > 0) return 'upcoming'
  return undefined
}

function isHistoryOperationGroup(group: FormOperationActionGroup) {
  return isHistoryOperationText(group.key) || isHistoryOperationText(group.title)
}

function isHistoryOperationAction(action: FormOperationAction) {
  return isHistoryOperationText(action.key) || isHistoryOperationText(action.label)
}

function isHistoryOperationText(value?: string) {
  if (!value) return false
  const normalized = value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_-]+/g, '')
  return normalized.includes('history') || normalized.includes('gecmis')
}

type FormOperationActionsVariant = 'compact' | 'legacy' | 'all'

function FormOperationActions({
  groups,
  mode,
  variant = 'all',
}: {
  groups?: FormOperationActionGroup[]
  mode: FormMode
  variant?: FormOperationActionsVariant
}) {
  const [openGroupKey, setOpenGroupKey] = useState<FormOperationActionGroupKey | null>(null)
  const actionsRef = useRef<HTMLDivElement | null>(null)
  const visibleGroups = useMemo(() => normalizeFormOperationGroups(groups), [groups])

  useEffect(() => {
    if (!openGroupKey) return

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!actionsRef.current || actionsRef.current.contains(event.target as Node)) return
      setOpenGroupKey(null)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenGroupKey(null)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openGroupKey])

  useEffect(() => {
    if (openGroupKey && !visibleGroups.some(group => group.key === openGroupKey)) {
      setOpenGroupKey(null)
    }
  }, [openGroupKey, visibleGroups])

  const compactGroups = useMemo(
    () => mode === 'view' && variant !== 'legacy'
      ? visibleGroups
        .filter(isCompactOperationGroup)
        .sort((first, second) => getOperationGroupOrder(first) - getOperationGroupOrder(second))
      : [],
    [mode, variant, visibleGroups]
  )
  const legacyGroups = useMemo(
    () => variant !== 'compact' ? visibleGroups.filter(group => !isCompactOperationGroup(group)) : [],
    [variant, visibleGroups]
  )

  if (!compactGroups.length && !legacyGroups.length) return null

  return (
    <div ref={actionsRef} className={cn(compactGroups.length ? 'w-full' : 'flex flex-wrap items-center justify-end gap-2')}>
      {compactGroups.length ? (
        <CompactOperationArea
          groups={compactGroups}
          openGroupKey={openGroupKey}
          onOpenChange={(groupKey, nextOpen) => setOpenGroupKey(nextOpen ? groupKey : null)}
        />
      ) : null}
      {legacyGroups.length ? (
        <div className={cn('flex flex-wrap items-center justify-end gap-2', compactGroups.length && 'mt-3')}>
          {legacyGroups.map(group => (
            <FormOperationActionGroupMenu
              key={group.key}
              group={group}
              open={openGroupKey === group.key}
              onOpenChange={(nextOpen) => setOpenGroupKey(nextOpen ? group.key : null)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function isCompactOperationGroup(group: FormOperationActionGroup) {
  return group.displayMode === 'dropdown_button'
    || group.displayMode === 'single_button'
    || group.displayMode === 'dropdown_card'
    || group.displayMode === 'action_card'
}

function getOperationGroupOrder(group: FormOperationActionGroup) {
  return OPERATION_GROUP_ORDER[group.operationKind || 'general'] ?? OPERATION_GROUP_ORDER.general
}

function CompactOperationArea({
  groups,
  openGroupKey,
  onOpenChange,
}: {
  groups: FormOperationActionGroup[]
  openGroupKey: FormOperationActionGroupKey | null
  onOpenChange: (groupKey: FormOperationActionGroupKey, open: boolean) => void
}) {
  return (
    <section
      data-tour-id="record-operation-area"
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <div className="shrink-0 text-sm font-semibold text-gray-900 dark:text-white">
        İşlemler
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {groups.map(group => (
          <CompactOperationControl
            key={group.key}
            group={group}
            open={openGroupKey === group.key}
            onOpenChange={(nextOpen) => onOpenChange(group.key, nextOpen)}
          />
        ))}
      </div>
    </section>
  )
}

function CompactOperationControl({
  group,
  open,
  onOpenChange,
}: {
  group: FormOperationActionGroup
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const title = group.title || DEFAULT_OPERATION_GROUP_TITLES[group.key] || group.key
  const icon = group.icon || DEFAULT_OPERATION_GROUP_ICONS[group.key] || DEFAULT_OPERATION_GROUP_ICONS.other
  const primaryAction = group.actions[0]
  const shouldUseSingleButton = (group.displayMode === 'single_button' || group.displayMode === 'action_card') && group.actions.length === 1
  const buttonLabel = shouldUseSingleButton ? primaryAction?.label || title : title

  if (!primaryAction) return null

  if (shouldUseSingleButton) {
    return (
      <button
        type="button"
        data-tour-id={group.dataTourId || primaryAction.dataTourId}
        title={primaryAction.disabledReason || group.description || title}
        disabled={primaryAction.disabled}
        onClick={() => {
          if (primaryAction.disabled) return
          primaryAction.onClick()
        }}
        className={cn(
          'inline-flex h-9 max-w-full items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          getOperationButtonToneClass(primaryAction.tone, group.operationKind)
        )}
      >
        {primaryAction.icon || icon}
        <span className="min-w-0 truncate">{buttonLabel}</span>
      </button>
    )
  }

  return (
    <div className="relative inline-flex max-w-full">
      <button
        type="button"
        data-tour-id={group.dataTourId}
        title={group.description || title}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => onOpenChange(!open)}
        className="inline-flex h-9 max-w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        {icon}
        <span className="min-w-0 truncate">{title}</span>
        <ChevronDown size={14} className={cn('shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-950"
        >
          {group.actions.map(action => (
            <OperationMenuActionButton
              key={action.key}
              action={action}
              onRun={() => {
                onOpenChange(false)
                action.onClick()
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function getOperationButtonToneClass(tone: FormOperationActionTone = 'primary', kind?: FormOperationKind) {
  if (tone === 'danger') return 'border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:bg-gray-950 dark:text-red-300 dark:hover:bg-red-950/30'
  if (tone === 'success') return 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-gray-950 dark:text-emerald-300 dark:hover:bg-emerald-950/30'
  if (tone === 'neutral' || kind === 'basic_update') return 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-800'
  return 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600'
}

function FormOperationActionGroupMenu({
  group,
  open,
  onOpenChange,
}: {
  group: FormOperationActionGroup
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const title = group.title || DEFAULT_OPERATION_GROUP_TITLES[group.key] || group.key
  const icon = group.icon || DEFAULT_OPERATION_GROUP_ICONS[group.key] || DEFAULT_OPERATION_GROUP_ICONS.other

  return (
    <div className="relative z-50 inline-flex">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => onOpenChange(!open)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        {icon}
        <span>{title}</span>
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {group.actions.map(action => (
            <OperationMenuActionButton
              key={action.key}
              action={action}
              truncateLabel
              onRun={() => {
                onOpenChange(false)
                action.onClick()
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function OperationMenuActionButton({
  action,
  onRun,
  truncateLabel = false,
}: {
  action: FormOperationAction
  onRun: () => void
  truncateLabel?: boolean
}) {
  const disabled = action.state === 'upcoming' || (action.disabled && action.state !== 'completed')
  const icon = action.state === 'completed'
    ? <CheckCircle2 size={16} />
    : action.icon

  return (
      <button
        type="button"
        role="menuitem"
        data-tour-id={action.dataTourId}
        title={action.disabledReason || action.label}
        disabled={disabled}
      onClick={() => {
        if (disabled) return
        onRun()
      }}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
        getOperationMenuActionClass(action)
      )}
    >
      {icon}
      <span className={cn('min-w-0 flex-1', truncateLabel ? 'truncate' : 'whitespace-normal')}>
        {action.label}
        {disabled && action.disabledReason ? (
          <span className="block truncate text-[11px] font-normal text-gray-400 dark:text-gray-500">
            {action.disabledReason}
          </span>
        ) : null}
      </span>
    </button>
  )
}

function getOperationMenuActionClass(action: FormOperationAction) {
  if (action.state === 'completed') {
    return 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30'
  }
  if (action.state === 'upcoming' || action.disabled) {
    return 'cursor-not-allowed text-gray-400 dark:text-gray-500'
  }
  return getOperationActionToneClass(action.tone)
}

function getOperationActionToneClass(tone: FormOperationActionTone = 'primary') {
  switch (tone) {
    case 'danger':
      return 'text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30'
    case 'success':
      return 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30'
    case 'neutral':
      return 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800'
    case 'primary':
    default:
      return 'text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/30'
  }
}

function FieldOperationLockIndicator({ control, recordStatus }: { control: FormFieldOperationControl; recordStatus?: string | null }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const modules = useModules()
  const permissions = usePermissions()
  const message = getFieldOperationLockMessage(control)
  const actions = getFieldOperationActions(control)
  const eligibility = getFieldOperationEligibility(control, modules, permissions, recordStatus)

  useEffect(() => {
    if (!showTooltip) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowTooltip(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showTooltip])

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        aria-label="Alan işlem bilgisi"
        title={message}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(previous => !previous)}
        className="inline-grid h-5 w-5 place-items-center rounded-full text-amber-600 transition-colors hover:bg-amber-50 hover:text-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/30"
      >
        <Info size={14} />
      </button>
      {showTooltip && (
        <div
          role="dialog"
          aria-label="Kilitli alan yardimi"
          className="fixed inset-x-3 bottom-3 z-50 max-h-[70dvh] overflow-y-auto rounded-2xl border border-amber-200 bg-white p-4 text-xs leading-5 text-gray-700 shadow-2xl dark:border-amber-900/60 dark:bg-gray-950 dark:text-gray-200 sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-full sm:mt-1 sm:w-80 sm:-translate-x-1/2 sm:rounded-lg sm:p-3"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="font-semibold text-gray-900 dark:text-gray-100">Bu alan neden kilitli?</div>
            <span className={eligibility.canStart ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200' : 'rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'}>
              {eligibility.canStart ? 'Islem hazir' : 'Kosul gerekiyor'}
            </span>
          </div>
          <p>{message}</p>
          {control.helperText && control.helperText !== message && (
            <p className="mt-2 text-gray-500 dark:text-gray-400">{control.helperText}</p>
          )}
          {eligibility.disabledReason && (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              {eligibility.disabledReason}
            </p>
          )}
          {eligibility.warnings.length ? (
            <div className="mt-2 space-y-1 text-amber-700 dark:text-amber-200">
              {eligibility.warnings.map((warning, index) => <p key={`${warning}-${index}`}>{warning}</p>)}
            </div>
          ) : null}
          {actions.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {actions.map(action => (
                <button
                  key={action.operationKey}
                  type="button"
                  disabled={!eligibility.canStart}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => {
                    if (!eligibility.canStart) return
                    startSuggestedFieldOperation(action)
                    setShowTooltip(false)
                  }}
                  className="min-h-11 rounded-md border border-amber-300 px-3 py-2 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-800 dark:text-amber-100 dark:hover:bg-amber-950/40 sm:min-h-0 sm:px-2.5 sm:py-1"
                >
                  {action.operationLabel}
                </button>
              ))}
            </div>
          ) : null}
          {actions.length ? (
            <button
              type="button"
              onMouseDown={event => event.preventDefault()}
              onClick={() => {
                const action = actions[0]
                window.dispatchEvent(new CustomEvent('eden:open-action-guide', {
                  detail: {
                    query: `${action.operationLabel} nasıl yapılır?`,
                    actionKey: action.operationKey,
                    wizardKey: action.wizardKey,
                  },
                }))
                setShowTooltip(false)
              }}
              className="mt-3 text-[11px] font-semibold text-amber-800 underline-offset-2 hover:underline dark:text-amber-100"
            >
              Bu işlem nasıl yapılır?
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}

function getFieldOperationLockMessage(control: FormFieldOperationControl) {
  if (control.lockExplanation) return control.lockExplanation
  if (control.message) return control.message

  const categoryLabel = control.category === 'lifecycle'
    ? 'yaşam döngüsü işlemleriyle'
    : control.category === 'registration' || control.category === 'update'
      ? 'tescil işlemleriyle'
      : 'ilgili işlemle'
  const operations = control.operations?.filter(Boolean) || []
  const operationText = operations.length ? ` İşlemler: ${operations.join(', ')}.` : ''

  return `Bu alan ${categoryLabel} değiştirilebilir.${operationText}`
}

function getFieldOperationActions(control: FormFieldOperationControl) {
  if (control.suggestedOperations?.length) return control.suggestedOperations
  if (control.operationKey === 'system_update') return []
  if (!control.wizardKey && !control.targetPage) return []
  if (!control.operationKey && !control.wizardKey) return []
  return [{
    operationKey: control.operationKey || control.wizardKey || 'field_operation',
    operationLabel: control.operations?.[0] || 'Ilgili Sihirbazi Ac',
    wizardKey: control.wizardKey,
    targetPage: control.targetPage,
  }]
}

function getFieldOperationEligibility(
  control: FormFieldOperationControl,
  modules: ReturnType<typeof useModules>,
  permissions: ReturnType<typeof usePermissions>,
  recordStatus?: string | null
) {
  const runtimeDecision = control.operationKey
    ? resolveActionRuntimeAvailability(control.operationKey, {
      modules: modules.runtimeModules,
      permissions: Array.from(permissions.permissions),
      recordStatus: recordStatus || undefined,
    })
    : null
  const missingRequiredModule = (control.requiredModules || []).find(moduleKey => !isFormModuleAvailable(modules, moduleKey))
  const optionalWarnings = (control.optionalModules || [])
    .filter(moduleKey => !isFormModuleAvailable(modules, moduleKey))
    .map(moduleKey => getOptionalModuleWarning(moduleKey, control.operationKey))
  const hasPermission = hasFieldOperationPermission(control, permissions)
  const statusReason = getFieldOperationStatusReason(control, recordStatus)
  const disabledReason = runtimeDecision && !runtimeDecision.enabled && runtimeDecision.reason
    ? runtimeDecision.reason
    : missingRequiredModule
    ? getMissingModuleReason(missingRequiredModule, control.operationKey)
    : !hasPermission
      ? 'Bu islem icin yetkiniz bulunmuyor.'
      : statusReason

  return {
    canStart: !disabledReason,
    disabledReason,
    warnings: [...(runtimeDecision?.warnings || []), ...optionalWarnings],
  }
}

function isFormModuleAvailable(modules: ReturnType<typeof useModules>, moduleKey: string) {
  const status = String(modules.getRuntimeStatus(moduleKey))
  return status === 'available' || status === 'enabled' || status === 'beta'
}

function hasFieldOperationPermission(control: FormFieldOperationControl, permissions: ReturnType<typeof usePermissions>) {
  const keys = [...(control.requiredPermissions || []), ...(control.fallbackPermissions || [])]
  if (!keys.length) return true
  return keys.some(key => permissions.can(key))
}

function getFieldOperationStatusReason(control: FormFieldOperationControl, recordStatus?: string | null) {
  const status = normalizeOperationStatus(recordStatus)
  const required = (control.requiredRecordStatuses || []).map(normalizeOperationStatus).filter(Boolean)
  const blocked = (control.blockedRecordStatuses || []).map(normalizeOperationStatus).filter(Boolean)
  if (blocked.length && blocked.includes(status)) return 'Bu kayit durumunda bu islem baslatilamaz.'
  if (!required.length || required.includes(status)) return null
  if (required.includes('active')) return 'Bu islem yalnizca aktif kayitlarda yapilabilir.'
  if (required.includes('draft')) return 'Bu islem yalnizca taslak kayitlarda yapilabilir.'
  return `Bu islem ${required.join(' veya ')} kayitlarda yapilabilir.`
}

function normalizeOperationStatus(value: unknown) {
  const status = String(value || '').trim().toLocaleLowerCase('tr-TR')
  if (['active', 'aktif', 'opened'].includes(status)) return 'active'
  if (['draft', 'taslak'].includes(status)) return 'draft'
  if (['passive', 'pasif'].includes(status)) return 'passive'
  if (['closed', 'kapali', 'kapalı', 'deregistered', 'terkin'].includes(status)) return 'closed'
  if (['liquidation', 'tasfiye'].includes(status)) return 'liquidation'
  return status
}

function getMissingModuleReason(moduleKey: string, operationKey?: string) {
  if (operationKey === 'capital_increase' || operationKey === 'capital_decrease') {
    return 'Sermaye Artirimi ortak bazli pay ve sermaye dagilimi gerektirir. Bu islem icin Ortaklarimiz modulu ve guncel ortaklik dagilimi aktif olmalidir.'
  }
  if (operationKey === 'branch_opening' && moduleKey === 'branches') return 'Bu islem icin Subelerimiz modulu aktif olmalidir.'
  if (operationKey === 'branch_document_update') return 'Sube belgeleri resmi islem kapsaminda yonetilir. Bu islem icin Subelerimiz ve belge yukleme altyapisi aktif olmalidir.'
  if (moduleKey === 'branches') return 'Sube bazli yetki verebilmek icin Subelerimiz modulu aktif olmalidir.'
  if (moduleKey === 'partners') return 'Bu islem icin Ortaklarimiz modulu aktif olmalidir.'
  if (moduleKey === 'facilities') return 'Bu islem icin Tesisler/Lokasyonlar modulu aktif olmalidir.'
  if (moduleKey === 'organization') return 'Bu islem icin Teskilat/Kadro modulu aktif olmalidir.'
  return `Bu islem icin ${moduleKey} modulu aktif olmalidir.`
}

function getOptionalModuleWarning(moduleKey: string, operationKey?: string) {
  if (operationKey === 'branch_opening' && moduleKey === 'facilities') {
    return 'Sube acilisi yapilabilir; ancak Tesisler/Lokasyonlar modulu aktif olmadigi icin fiziksel lokasyon kaydi otomatik olusturulamayacak.'
  }
  if (operationKey === 'branch_opening' && moduleKey === 'organization') {
    return 'Sube acilisi yapilabilir; ancak Teskilat/Kadro modulu aktif olmadigi icin organizasyon birimi otomatik olusturulamayacak.'
  }
  return `${moduleKey} modulu aktif olmadigi icin ilgili otomasyon atlanabilir.`
}

function startSuggestedFieldOperation(action: { operationKey: string; operationLabel: string; wizardKey?: string; targetPage?: string }) {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
  if (action.targetPage && currentPath && !currentPath.startsWith(action.targetPage)) {
    window.location.href = action.targetPage
    return
  }
  window.dispatchEvent(new CustomEvent('eden:action-guide-command', {
    detail: {
      action_type: 'open_wizard',
      action_key: action.operationKey,
      wizard_key: action.wizardKey || action.operationKey,
    },
  }))
}

export function EntityForm({
  mode: initialMode,
  entityName,
  entityNameSingular,
  heroFields,
  tabs,
  initialActiveTabId,
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
  masterSummaryTitle,
  masterSummaryBadgeLabel,
  masterSummaryReadOnly = false,
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
  onActiveTabChange,
  onFieldChange,
  operationActions,
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
  const [activeTab, setActiveTab] = useState(initialActiveTabId || tabs[0]?.id || '')
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [identityGateResult, setIdentityGateResult] = useState<IdentityGateResolveResult | null>(null)
  const [cvExtractStatus, setCvExtractStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' })
  const [turkeyProvinces, setTurkeyProvinces] = useState<TurkeyProvince[]>([])
  const [turkeyDistrictsByProvince, setTurkeyDistrictsByProvince] = useState<Record<string, Array<{ id: number; name: string }>>>({})
  const enrichedTurkeyProvinces = useMemo(() => turkeyProvinces.map(province => ({
    ...province,
    districts: turkeyDistrictsByProvince[normalizeTurkeyLocationName(province.name)] || province.districts || [],
  })), [turkeyDistrictsByProvince, turkeyProvinces])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // STANDARD FORM LAYOUT: Image and Document slots
  const resolvedImageSlots = typeof imageSlot.slots === 'function' ? imageSlot.slots(formData) : imageSlot.slots
  const imageSlots: ImageSlot[] = resolvedImageSlots || [
    { id: 'photo', title: imageSlot.title || 'Fotoğraf', required: imageSlot.required ?? false },
  ]
  const imageDataField = imageSlot.dataField || 'photo_url'
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
  const documentDataField = effectiveDocumentSlot.dataField || 'cv_document'
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
    } else if (data?.photo_url) {
      setImages([{ slotId: 'photo', previewUrl: data.photo_url, name: 'Fotoğraf' }])
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

    fetch('/api/reference/turkey-locations?scope=provinces')
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

  useEffect(() => {
    const selectedCountry = normalizeCountryId(formData.country || 'TR')
    const city = String(formData.city || '').trim()
    const key = normalizeTurkeyLocationName(city)
    if (selectedCountry !== 'TR' || !key || turkeyDistrictsByProvince[key]) return

    let cancelled = false
    fetch(`/api/reference/turkey-locations?province=${encodeURIComponent(city)}&limit=200`)
      .then(response => response.ok ? response.json() : null)
      .then(payload => {
        if (cancelled || !Array.isArray(payload?.districts)) return
        setTurkeyDistrictsByProvince(previous => ({
          ...previous,
          [key]: payload.districts,
        }))
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [formData.city, formData.country, turkeyDistrictsByProvince])

  // Reset active tab when mode changes
  useEffect(() => {
    if (formTabs.length > 0 && !formTabs.find(t => t.id === activeTab)) {
      setActiveTab(formTabs[0].id)
    }
  }, [formTabs, activeTab])

  useEffect(() => {
    if (!initialActiveTabId) return
    if (!formTabs.find(tab => tab.id === initialActiveTabId)) return
    setActiveTab(initialActiveTabId)
  }, [formTabs, initialActiveTabId])

  useEffect(() => {
    if (externalFieldErrors) {
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
  const canHardDeleteRecord = !isCreate && !isPassive && isDraftRecord(effectiveStatusData) && effectiveCanPassivate && !!onDelete
  const canPassivateRecord = !isPassive && !canHardDeleteRecord && effectiveCanPassivate && !!onDelete
  const canDeleteRecord = canHardDeleteRecord || canPassivateRecord
  const deleteActionLabel = canActivateRecord ? 'Aktive Et' : canHardDeleteRecord ? 'Sil' : 'Pasife Al'
  const normalizedOperationActions = useMemo(() => normalizeFormOperationGroups(operationActions), [operationActions])
  const hasBasicUpdateOperationAction = isReadOnly && normalizedOperationActions.some(group =>
    group.operationKind === 'basic_update'
    && isCompactOperationGroup(group)
    && group.actions.length > 0
  )
  const slotLoaderMode = isReadOnly ? 'view' : isCreate ? 'insert' : 'update'
  const getLoadStage = (key: FormLoadStageKey) => loadStages?.find(stage => stage.key === key)
  const mediaLoadStage = getLoadStage('media') || getLoadStage('detail')
  const heroLoadStage = getLoadStage('hero') || getLoadStage('detail')
  const detailsLoadStage = getLoadStage('details') || getLoadStage('detail')
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
  const isOperationControlledLocked = (field: FormField) => {
    if (!field.controlledByOperation) return false
    if (field.controlledByOperation.allowDraftEdit && mode === 'edit' && isDraftRecord(effectiveStatusData)) return false
    const lockInModes = field.controlledByOperation.lockInModes || ['edit']
    return lockInModes.includes(mode)
  }
  const operationLockedFieldNames = new Set(
    allFormFields
      .filter(isOperationControlledLocked)
      .map(field => field.name)
  )

  const isFieldRequired = (field: FormField, sourceData = formData) => {
    if (field.required) return true
    if (field.requiredWhen && matchesCondition(field.requiredWhen, sourceData)) return true
    if (!field.requiredGroup) return false

    return allFormFields
      .filter(candidate => candidate.requiredGroup === field.requiredGroup)
      .some(candidate => matchesCondition(candidate.visibleWhen, sourceData) && hasValue(sourceData[candidate.name]))
  }

  const getFieldValidationState = (field: FormField) => {
    if (isReadOnly || isOperationControlledLocked(field) || field.type === 'section' || !matchesCondition(field.visibleWhen, formData)) {
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
      return { status: 'valid' as const, label: 'Tamam' }
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

  const handleActiveTabChange = (tabId: string) => {
    setActiveTab(tabId)
    onActiveTabChange?.(tabId)
  }

  const handleChange = (field: string, value: any) => {
    if (operationLockedFieldNames.has(field)) return
    setFormData(prev => {
      if (isCountryField(field)) {
        const previousCountry = normalizeCountryId(prev[field] || prev.country || prev.country)
        const nextCountry = normalizeCountryId(value)
        const next = {
          ...prev,
          [field]: value,
          ...(previousCountry !== nextCountry ? { city: '', district: '',} : {}),
        }
        onFieldChange?.(field, value, next)
        return next
      }

      if (field === 'sgk_workplace_registry_no') {
        const parsed = parseSgkWorkplaceNumber(String(value || ''))
        const next = {
          ...prev,
          [field]: parsed.digits,
          sgk_province: parsed.provinceLabel,
          sgk_branch: parsed.branchLabel,
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
      result.prefill.photo_url ||
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
          result.prefill.cv_document ||
          []
        )
      : []

    setIdentityGateResult(result)
    setFormData(prev => mergeIdentityResultIntoFormData(prev, result))
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

    const identityResultForSave = identityGateResult || buildIdentityResultFromExistingData(identityGate, next)
    return normalizeLegalEntityBankData(enrichFormDataWithIdentityResult(next, identityResultForSave))
  }

  const resetIdentityGate = () => {
    setIdentityGateResult(null)
  }

  const handleFormattedFieldChange = (field: FormField, value: string) => {
    if (field.name === 'national_id' || field.name === 'tax_number' || field.name === 'sgk_workplace_registry_no') {
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
      try {
        const hydratedImages = await Promise.all(nextImages.map(async image => {
          if (!image.file) return image
          const variants = await createImageVariantsOnServer(image.file, {
            maxDimension: avatarImageMaxDimension(image.slotId),
            thumbnailDimension: 96,
            quality: 0.78,
            thumbnailQuality: 0.72,
            transparentBackground: shouldUseTransparentImageBackground(image.slotId),
          })
          const { file, ...imageWithoutFile } = image
          return {
            ...imageWithoutFile,
            previewUrl: variants.previewUrl,
            thumbnailUrl: variants.thumbnailUrl,
            name: image.name || file.name,
            size: variants.previewSize || file.size,
          }
        }))
        setImages(hydratedImages)
        handleChange(imageDataField, hydratedImages.map(serializeImageForStorage))
      } catch (error) {
        console.error('Gorsel onizlemesi olusturulamadi:', error)
        alert(error instanceof Error ? error.message : 'Gorsel onizlemesi olusturulamadi')
      }
      return
    }

    const photo = nextImages.find(image => image.slotId === 'photo')
    if (!photo) {
      handleChange('photo_url', '')
      return
    }

    if (photo.file) {
      try {
        const variants = await createImageVariantsOnServer(photo.file, {
          maxDimension: avatarImageMaxDimension(photo.slotId),
          thumbnailDimension: 96,
          quality: 0.78,
          thumbnailQuality: 0.72,
          transparentBackground: shouldUseTransparentImageBackground(photo.slotId),
        })
        handleChange('photo_url', variants.previewUrl)
        setImages(current => current.map(image => {
          if (image.slotId !== photo.slotId) return image
          const { file, ...imageWithoutFile } = image
          return {
            ...imageWithoutFile,
            previewUrl: variants.previewUrl,
            thumbnailUrl: variants.thumbnailUrl,
            size: variants.previewSize || file?.size || image.size,
          }
        }))
      } catch (error) {
        console.error('Gorsel onizlemesi olusturulamadi:', error)
        alert(error instanceof Error ? error.message : 'Gorsel onizlemesi olusturulamadi')
      }
      return
    }

    handleChange('photo_url', photo.previewUrl || '')
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

    if (next.mobile_phone) {
      next.mobile_phone = formatPhoneInput(String(next.mobile_phone))
      next.phones = [{ label: 'Cep', phone: next.mobile_phone }]
    }

    if (next.email) {
      next.email = normalizeEmailInput(String(next.email))
      next.emails = [{ label: 'Kişisel', address: next.email }]
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
      errors.identity_gate = 'Devam etmek için önce Temel Kimlik alanını eşleştirin.'
      setFieldErrors(errors)
      onValidationError?.([errors.identity_gate])
      return false
    }
    
    const validateListField = (field: FormField) => {
      const listFields = field.listConfig?.fields || []
      const rows = finalizeListValue(sourceData[field.name], listFields)
      const rowErrors: string[] = []

      rows.forEach((row, rowIndex) => {
        listFields.forEach(item => {
          if (item.type === 'section' || !matchesCondition(item.visibleWhen, row) || (item.disabledWhen && matchesCondition(item.disabledWhen, row))) return

          const name = fieldName(item)
          const label = item.errorLabel || item.label
          const value = row[name]
          const required = item.required || !!(item.requiredWhen && matchesCondition(item.requiredWhen, row))

          if (required && !hasValue(value)) {
            rowErrors.push(`${rowIndex + 1}. satır ${label} zorunludur`)
            return
          }

          if (item.pattern && hasValue(value)) {
            const regex = new RegExp(`^(?:${item.pattern})$`)
            if (!regex.test(String(value))) {
              rowErrors.push(`${rowIndex + 1}. satır ${label} formatı geçersiz`)
            }
          }
        })
      })

      if (rowErrors.length > 0) {
        const visibleErrors = rowErrors.slice(0, 3).join(', ')
        const suffix = rowErrors.length > 3 ? ` ve ${rowErrors.length - 3} hata daha` : ''
        errors[field.name] = `${field.label}: ${visibleErrors}${suffix}`
      }
    }

    const validateFields = (fields: FormField[]) => {
      fields.forEach(field => {
        if (field.type === 'section' || !matchesCondition(field.visibleWhen, sourceData)) return
        if (isOperationControlledLocked(field)) return
        if (isFieldRequired(field, sourceData) && !hasValue(sourceData[field.name])) {
          errors[field.name] = `${field.errorLabel || field.label} zorunludur`
          return
        }

        if (field.type === 'list') {
          validateListField(field)
          return
        }

        if (field.pattern && hasValue(sourceData[field.name])) {
          const regex = new RegExp(`^(?:${field.pattern})$`)
          if (!regex.test(String(sourceData[field.name]))) {
            errors[field.name] = field.name === 'national_id'
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
        identity_gate: 'Devam etmek için önce Temel Kimlik alanını eşleştirin.',
      }))
      onValidationError?.(['Devam etmek için önce Temel Kimlik alanını eşleştirin.'])
      return
    }
    const finalizedData = finalizeFormDataForSave(formData)
    setFormData(finalizedData)
    if (!validate(finalizedData)) return
    const payload = isEdit && data ? buildChangedPayload(finalizedData, data) : finalizedData
    if (isEdit && data) {
      if (data.version !== undefined && payload.base_version === undefined) payload.base_version = data.version
      if (data.updated_at !== undefined && payload.base_updated_at === undefined) payload.base_updated_at = data.updated_at
    }
    if (isEdit && operationLockedFieldNames.size > 0) {
      operationLockedFieldNames.forEach(fieldName => {
        delete payload[fieldName]
      })
    }
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
      ? 'col-span-1 sm:col-span-2 lg:col-span-3'
      : field.colSpan === 2
        ? 'col-span-1 sm:col-span-2'
        : field.compact
          ? 'col-span-1'
          : 'col-span-1'
    const fieldOperationControl = !isCreate ? field.controlledByOperation : undefined
    const fieldDisabled = isReadOnly
      || !!field.readOnly
      || isIdentityGateLocked
      || isOperationControlledLocked(field)
      || (field.disabledWhen ? matchesCondition(field.disabledWhen, formData) : false)
    const automationState = getFieldAutomationState(field, formData)

    if (field.type === 'section') {
      return (
        <div key={field.name} className={cn("border-t border-gray-200 pt-4 dark:border-gray-700", colSpanClass || 'col-span-1 sm:col-span-2 lg:col-span-3')}>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{field.label}</h4>
        </div>
      )
    }

    const fieldControlState = fieldDisabled ? 'neutral' : validationState.status
    const baseInputClass = formControlClass({ state: fieldControlState, size: 'field' })
    const enumInputClass = formControlClass({ state: fieldControlState, size: 'field', surface: 'enum' })

    const renderInput = () => {
          if (field.render) {
            return field.render({
              value,
              onChange: (val) => handleChange(field.name, val),
              readOnly: fieldDisabled,
              data: formData,
              mode,
              className: baseInputClass,
              validationState,
            })
          }

      if (isCountryField(field.name) && field.type === 'select' && (!field.options || field.options.length === 0)) {
        const normalizedValue = normalizeCountryId(value || 'TR')
        const hasCountryOption = COUNTRY_OPTIONS.some(country => country.value === normalizedValue)
        return (
          <select
            value={hasCountryOption ? normalizedValue : value || 'TR'}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disabled={fieldDisabled}
            className={cn(enumInputClass, fieldDisabled && "appearance-none")}
          >
            {!hasCountryOption && value ? <option value={value}>{value}</option> : null}
            {COUNTRY_OPTIONS.map(country => (
              <option key={country.value} value={country.value}>{country.label}</option>
            ))}
          </select>
        )
      }

      if (isCityField(field.name)) {
        const selectedCountry = normalizeCountryId(formData.country || formData.country || 'TR')
        const selectedProvince = findTurkeyProvince(enrichedTurkeyProvinces, value)
        const cityValue = selectedProvince?.name || value
        if (selectedCountry !== 'TR') {
          return (
            <input
              type="text"
              value={cityValue}
              onChange={(e) => handleChange(field.name, e.target.value)}
              disabled={fieldDisabled}
              className={baseInputClass}
              placeholder="Şehir / bölge"
            />
          )
        }

        return (
          <select
            value={cityValue}
            onChange={(e) => {
              const nextProvince = findTurkeyProvince(enrichedTurkeyProvinces, e.target.value)
              const nextCity = nextProvince?.name || e.target.value
              const keepDistrict = nextProvince?.districts.some(district =>
                normalizeTurkeyLocationName(district.name) === normalizeTurkeyLocationName(formData.district)
              )
              handleChange(field.name, nextCity)
              if (!keepDistrict) handleChange('district', '')
            }}
            disabled={fieldDisabled}
            className={cn(enumInputClass, fieldDisabled && "appearance-none")}
          >
            <option value="">İl seçiniz</option>
            {cityValue && !selectedProvince && <option value={cityValue}>{cityValue}</option>}
            {enrichedTurkeyProvinces.map(province => (
              <option key={province.id} value={province.name}>{province.name}</option>
            ))}
          </select>
        )
      }

      if (isDistrictField(field.name)) {
        const selectedCountry = normalizeCountryId(formData.country || formData.country || 'TR')
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

        const cityField = field.name === 'district' ? 'city' : 'city'
        const selectedProvince = findTurkeyProvince(enrichedTurkeyProvinces, formData[cityField])
        const selectedDistrict = selectedProvince?.districts.find(district =>
          normalizeTurkeyLocationName(district.name) === normalizeTurkeyLocationName(value)
        )
        const districtValue = selectedDistrict?.name || value

        return (
          <select
            value={districtValue}
            onChange={(e) => handleChange(field.name, e.target.value)}
            disabled={fieldDisabled || !selectedProvince}
            className={cn(
              enumInputClass,
              (fieldDisabled || !selectedProvince) && "appearance-none"
            )}
          >
            <option value="">{selectedProvince ? 'İlçe seçiniz' : 'Önce il seçiniz'}</option>
            {districtValue && selectedProvince && !selectedDistrict && <option value={districtValue}>{districtValue}</option>}
            {selectedProvince?.districts.map(district => (
              <option key={district.id} value={district.name}>{district.name}</option>
            ))}
          </select>
        )
      }

      switch (field.type) {
        case 'checkbox':
          return (
            <label className="flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-[13px] leading-5 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              <input
                type="checkbox"
                checked={!!formData[field.name]}
                onChange={(e) => handleChange(field.name, e.target.checked)}
                disabled={fieldDisabled}
                className="h-4 w-4 rounded border-gray-400 bg-white text-blue-600 accent-blue-600 focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-900 dark:accent-blue-500"
              />
              {field.placeholder || field.label}
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
                className={enumInputClass}
                onChange={(nextValue) => handleChange(field.name, nextValue)}
              />
            )
          }

          return (
            <select
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              disabled={fieldDisabled}
              className={cn(enumInputClass, fieldDisabled && "appearance-none")}
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
              type="text"
              value={formatDateForDisplay(value)}
              onChange={(e) => handleChange(field.name, normalizeDateDisplayInput(e.target.value))}
              placeholder={field.placeholder || 'gg.aa.yyyy'}
              inputMode="numeric"
              maxLength={10}
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
      <div
        key={field.name}
        data-tour-field={field.name}
        className={cn("relative space-y-1", colSpanClass)}
      >
        {!field.hideLabel && (
          <div className="flex items-center gap-2">
            <label className={cn(
              "text-[13px] font-medium leading-5",
              validationState.status === 'invalid'
                ? "text-red-700 dark:text-red-400"
                : validationState.status === 'valid'
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-gray-700 dark:text-gray-300"
            )}>
              {field.label}
            </label>
            {(showHistoryIcon || enableHistory) && field.history && field.history.length > 0 && (
              <FieldHistoryIndicator history={field.history} />
            )}
            {fieldOperationControl && (
              <FieldOperationLockIndicator control={fieldOperationControl} recordStatus={String(effectiveStatusData.record_status || effectiveStatusData.company_status || effectiveStatusData.status || '')} />
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
        )}
        {validationState.label && (
          <span className={cn(
            "pointer-events-none absolute right-2 top-7 z-10 rounded border bg-white px-1.5 py-0.5 text-[10px] font-medium leading-none dark:bg-gray-900",
            validationState.status === 'valid'
              ? "border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400"
              : "border-red-300 text-red-600 dark:border-red-700 dark:text-red-400"
          )}>
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
    <div
      data-tour-id="record-forms"
      className={cn("bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden", className)}
    >
      <Modal
        open={showDeleteConfirm}
        onClose={() => !deleting && setShowDeleteConfirm(false)}
        title={`${entityNameSingular} ${deleteActionLabel}`}
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
              {deleteActionLabel}
            </button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
          {canActivateRecord ? (
            <p>Bu kayit tekrar active hale getirilecek ve active kayit listelerinde gorunecektir.</p>
          ) : canHardDeleteRecord ? (
            <>
              <p>
                Bu taslak kayit kalici olarak silinecektir.
              </p>
              <p>
                Taslak kayitlar henuz resmi akis veya gecmis veriye donusmedigi icin silme islemi geri alinamaz.
              </p>
            </>
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

      {moduleDependencies.length > 0 && (
        <div className="m-4 space-y-2">
          {moduleDependencies.map(dependency => (
            <ModuleDependencyNotice key={dependency.module} dependency={dependency} />
          ))}
        </div>
      )}

      {/* Hero Section - Two Column Layout */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-5 p-4 sm:p-6 lg:grid-cols-4 lg:gap-6">
          
          {/* Left Panel - STANDARD FORM LAYOUT: Photo (expected) + CV (optional) */}
          <div data-tour-id="record-form-media" className="relative lg:col-span-1">
            <SectionLoadIcon stage={mediaLoadStage} />
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
          <div data-tour-id="record-form-main" className="relative lg:col-span-3 flex flex-col">
            <SectionLoadIcon stage={heroLoadStage} />
            {/* Section Title */}
            {showHeroHeader && <div className="mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Temel Bilgiler
                </h3>
                {formData.record_status && <RecordStatusBadge status={formData.record_status} />}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {isCreate ? 'Yeni kayıt oluşturun' : isEdit ? 'Bilgileri güncelleyin' : 'Kayıt detayları'}
              </p>
            </div>}
            {!showHeroHeader && formData.record_status && (
              <div className="mb-4">
                <RecordStatusBadge status={formData.record_status} />
              </div>
            )}

            {/* Required Fields Grid */}
            <div data-tour-id="record-form-fields" className="grid grid-cols-1 gap-4 flex-1 sm:grid-cols-2 lg:grid-cols-3">
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
                  readOnly={isReadOnly || masterSummaryReadOnly}
                  showBadge={showMasterSummaryBadge}
                  titleLabel={masterSummaryTitle}
                  badgeLabel={masterSummaryBadgeLabel}
                  titleAsField={masterSummaryTitleAsField}
                  mode={masterSummaryMode}
                  requiredFields={heroFields}
                  fieldErrors={fieldErrors}
                  turkeyProvinces={enrichedTurkeyProvinces}
                  onFieldChange={handleChange}
                />
              )}
              {isIdentityGateLocked && fieldErrors.identity_gate && (
                <div className="col-span-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200 sm:col-span-2 lg:col-span-3">
                  {fieldErrors.identity_gate}
                </div>
              )}
              {roleHeroFields.length > 0 ? (
                roleHeroCardTitle ? (
                  <div className="col-span-1 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:col-span-2 lg:col-span-3">
                    <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{roleHeroCardTitle}</div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {roleHeroFields.map(field => renderField(field, enableHistory))}
                    </div>
                  </div>
                ) : roleHeroFields.map(field => renderField(field, enableHistory))
              ) : showEmptyRoleHeroState ? (
                <div className="col-span-1 rounded-lg border border-dashed border-gray-200 bg-white/70 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400 sm:col-span-2 lg:col-span-3">
                  Bu formda hero alaninda manuel girilecek rol alani yok. Rol detaylari sekmelerde yonetilir.
                </div>
              ) : null}
            </div>

            {/* Form Action Area */}
            <div data-tour-id="record-form-command-area" className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-gray-200 bg-white/95 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:backdrop-blur-0">
              <FormOperationActions groups={normalizedOperationActions} mode={mode} variant="compact" />

              <div className="mt-3 flex flex-wrap items-center justify-stretch gap-2 sm:justify-end">
                <FormOperationActions groups={normalizedOperationActions} mode={mode} variant="legacy" />

                {additionalActions}

                {/* View Mode: Edit Button */}
                {!isCreate && (canActivateRecord || canDeleteRecord) && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className={cn(
                      "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none",
                      canActivateRecord
                        ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                        : "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30"
                    )}
                  >
                    {deleting ? <Loader2 className="animate-spin" size={16} /> : canActivateRecord ? <RotateCcw size={16} /> : <Trash2 size={16} />}
                    {deleteActionLabel}
                  </button>
                )}
                {isReadOnly && effectiveCanEdit && !isPassive && !hasBasicUpdateOperationAction && (
                  <button
                    data-tour-id="record-form-edit-button"
                    onClick={() => handleModeChange('edit')}
                    className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:flex-none"
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
                      className="min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 sm:flex-none"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || isIdentityGateLocked || (isCreate && !effectiveCanCreate) || (isEdit && !effectiveCanEdit)}
                      className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 sm:flex-none"
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
      </div>

      {formTabs.length > 0 && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div data-tour-id="record-form-tabs" className="flex gap-2 overflow-x-auto px-4 py-3">
            {formTabs.map(tab => (
              <button
                key={tab.id}
                data-tour-id={tab.id === 'lifecycle' ? 'record-lifecycle-tab' : tab.id === 'organization_banka' ? 'record-bank-tab' : undefined}
                disabled={isIdentityGateLocked}
                onClick={() => handleActiveTabChange(tab.id)}
                className={cn(
                  "inline-flex min-h-11 max-w-full shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:text-gray-200",
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
        <div data-tour-id="record-form-tab-content" className="relative p-4 sm:p-6">
          <SectionLoadIcon stage={detailsLoadStage} />
          {isIdentityGateLocked && (
            <div className="mb-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
              Devam etmek için önce Temel Kimlik alanını eşleştirin.
            </div>
          )}
          {formTabs.map(tab => (
            <div
              key={tab.id}
              className={cn(
                tab.id === DOCUMENTS_FORM_TAB_ID ? "block" : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
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
  return ['country', 'country', 'nationality_country', 'nationality', 'nationality'].includes(field)
}

function applyLegalEntityBankDerivations(prev: Record<string, any>, field: string, value: any) {
  const next = { ...prev, [field]: value }

  if (field === 'trade_name' || field === 'legal_name' || field === 'trade_name') {
    const previousName = pickText(prev.trade_name, prev.legal_name, prev.trade_name)
    if (shouldRefreshDerivedValue(prev.beneficiary_full_name, previousName)) {
      next.beneficiary_full_name = String(value || '')
    }
  }

  if (field === 'address' || field === 'address') {
    const previousAddress = pickText(prev.address, prev.address)
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
    next.beneficiary_full_name = pickText(next.trade_name, next.legal_name, next.trade_name)
  }

  if (!String(next.beneficiary_address || '').trim()) {
    next.beneficiary_address = pickText(next.address, next.address)
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
  return field === 'city' || field === 'city'
}

function isDistrictField(field: string) {
  return field === 'district' || field === 'district'
}

function findTurkeyProvince(provinces: TurkeyProvince[], value?: unknown) {
  const normalizedValue = normalizeTurkeyLocationName(value)
  if (!normalizedValue) return undefined
  return provinces.find(province => normalizeTurkeyLocationName(province.name) === normalizedValue)
}

function normalizeTurkeyLocationName(value?: unknown) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR')
}

export default EntityForm
