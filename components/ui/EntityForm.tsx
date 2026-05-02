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

import { useState, useEffect, ReactNode, useCallback } from 'react'
import { Save, Loader2, Edit3, History, Clock, Plus, Trash2, Upload, Briefcase, LogOut } from 'lucide-react'
import { cn, formatPhoneInput, normalizeEmailInput } from '@/lib/utils'
import { ImageSlotUploader, ImageSlot, SlotImage } from './ImageSlotUploader'
import { DocumentSlotUploader, DocumentSlot, SlotDocument } from './DocumentSlotUploader'
import { IBANInput } from './IBANInput'

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
  placeholder?: string
  maxLength?: number
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'url' | 'search' | 'decimal'
  pattern?: string
  colSpan?: 1 | 2 | 3
  compact?: boolean
  visibleWhen?: any
  disabledWhen?: any
  requiredWhen?: FieldCondition
  requiredGroup?: string
  listConfig?: {
    addLabel?: string
    emptyText?: string
    fields: FormField[]
  }
  /** History entries for this field */
  history?: HistoryEntry[]
  /** Custom render function */
  render?: (props: { value: any; onChange: (val: any) => void; readOnly: boolean }) => ReactNode
}

interface FieldCondition {
  field: string
  operator?: 'equals' | 'notEquals' | 'exists' | 'notExists' | 'includes'
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
export type FormMode = 'create' | 'view' | 'edit'

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
  
  /** Custom hero left panel content (Photo, Documents, etc.) - overrides default */
  heroLeftPanel?: ReactNode
  
  /** Image slot configuration for default hero left panel */
  imageSlot?: {
    title?: string
    required?: boolean
  }
  
  /** Document slot configuration for default hero left panel */
  documentSlot?: {
    title?: string
    required?: boolean
    acceptedTypes?: string[]
    maxSizeMB?: number
  }
  
  /** Save handler - receives form data */
  onSave: (data: Record<string, any>, mode: FormMode) => Promise<void> | void
  
  /** Cancel/close handler */
  onCancel: () => void

  /** Delete handler - only for view/edit modes */
  onDelete?: () => Promise<void> | void
  
  /** Mode change handler (view -> edit) */
  onModeChange?: (mode: FormMode) => void
  
  /** Additional actions in form action area (future: workflow) */
  additionalActions?: ReactNode
  
  /** Form-level error message */
  error?: string | null
  externalFieldErrors?: Record<string, string>
  onValidationError?: (missingFields: string[]) => void
  
  /** CSS class for container */
  className?: string
  
  /** Enable history tracking for all fields */
  enableHistory?: boolean
}

/** FieldHistoryIndicator Component */
function FieldHistoryIndicator({ history }: { history?: HistoryEntry[] }) {
  const [showTooltip, setShowTooltip] = useState(false)
  
  if (!history || history.length === 0) return null
  
  return (
    <div className="relative">
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function normalizeStoredDocuments(value: unknown): SlotDocument[] {
  const docs = Array.isArray(value) ? value : value ? [value] : []

  return docs
    .filter((doc): doc is Record<string, any> => !!doc && typeof doc === 'object')
    .map(doc => ({
      slotId: doc.slotId || doc.slot_id || 'cv',
      name: doc.name || 'Belge',
      size: Number(doc.size || 0),
      type: doc.type || 'application/octet-stream',
      uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt) : undefined,
      url: doc.url
    }))
}

function serializeDocumentForStorage(doc: SlotDocument) {
  return {
    slotId: doc.slotId,
    name: doc.name,
    size: doc.size,
    type: doc.type,
    uploadedAt: doc.uploadedAt?.toISOString?.() || new Date().toISOString(),
    url: doc.url
  }
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

function flattenFields(fields: FormField[]): FormField[] {
  return fields.flatMap(field => [
    field,
    ...(field.listConfig?.fields ? flattenFields(field.listConfig.fields) : [])
  ])
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
  const [draft, setDraft] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fields = field.listConfig?.fields || []
  const rows = Array.isArray(value) ? value : []

  const inputClass = "w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"

  const setDraftValue = (name: string, nextValue: any) => {
    setDraft(prev => ({
      ...prev,
      [name]: nextValue,
      ...(name === 'devam_ediyor' && nextValue ? { mezuniyet_tarihi: '' } : {})
    }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const formatDraftValue = (item: FormField, value: string) => {
    if (item.type === 'tel') return formatPhoneInput(value)
    if (item.type === 'email') return normalizeEmailInput(value)
    return value
  }

  const addRow = () => {
    const nextErrors: Record<string, string> = {}
    fields.forEach(item => {
      if (item.required && !draft[item.name]) {
        nextErrors[item.name] = `${item.label} zorunludur`
      }
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onChange([...rows, draft])
    setDraft({})
  }

  const removeRow = (index: number) => {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index))
  }

  const renderDraftInput = (item: FormField) => {
    const itemDisabled = disabled || readOnly || (item.disabledWhen ? matchesCondition(item.disabledWhen, draft) : false)

    if (item.type === 'checkbox') {
      return (
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={!!draft[item.name]}
            onChange={(event) => setDraftValue(item.name, event.target.checked)}
            disabled={itemDisabled}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          {item.label}
        </label>
      )
    }

    if (item.type === 'select') {
      return (
        <select
          value={draft[item.name] || ''}
          onChange={(event) => setDraftValue(item.name, event.target.value)}
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
              setDraftValue(item.name, {
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
          value={itemDisabled ? '' : draft[item.name] || ''}
          onChange={(event) => setDraftValue(item.name, event.target.value)}
          disabled={itemDisabled}
          className={inputClass}
        />
      )
    }

    return (
      <input
        type={item.type === 'email' ? 'email' : item.type === 'tel' ? 'tel' : 'text'}
        value={draft[item.name] || ''}
        onChange={(event) => setDraftValue(item.name, formatDraftValue(item, event.target.value))}
        placeholder={item.placeholder}
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
                  <div key={item.name}>
                    <span className="text-xs text-gray-500">{item.label}: </span>
                    <span>{row[item.name] || '-'}</span>
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
          <div className="flex flex-wrap items-end gap-2">
            {fields.map(item => (
              <div key={item.name} className={cn(item.type === 'document' ? 'w-10' : 'min-w-36 flex-1')}>
                {item.type !== 'checkbox' && (
                  <label className={cn("mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400", item.type === 'document' && "sr-only")}>
                    {item.label}
                    {item.required && <span className="ml-1 text-red-500">*</span>}
                  </label>
                )}
                {renderDraftInput(item)}
                {errors[item.name] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[item.name]}</p>}
              </div>
            ))}
            <button
              type="button"
              onClick={addRow}
              disabled={disabled}
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
  const [modal, setModal] = useState<'hire' | 'exit' | null>(null)
  const [draft, setDraft] = useState<Record<string, any>>({})
  const [modalErrors, setModalErrors] = useState<Record<string, string>>({})
  const isHired = !!formData.sgk_giris
  const isExited = !!formData.isten_ayrilis

  const openModal = (nextModal: 'hire' | 'exit') => {
    setDraft(nextModal === 'hire'
      ? {
          sgk_giris: formData.sgk_giris || '',
          sirket_id: formData.sirket_id || '',
          birim_id: formData.birim_id || '',
          gorev: formData.gorev || '',
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
        setModalErrors({ sgk_giris: 'SGK giriş tarihi zorunludur' })
        return
      }

      onChange('sgk_giris', draft.sgk_giris || '')
      onChange('sirket_id', draft.sirket_id || '')
      onChange('birim_id', draft.birim_id || '')
      onChange('gorev', draft.gorev || '')
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

  const addDocument = (field: string, file?: File) => {
    if (!file) return
    setDraft(prev => ({
      ...prev,
      [field]: [
        ...(prev[field] || []),
        { name: file.name, size: file.size, type: file.type }
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
          <div><span className="text-gray-500">İşe Giriş:</span> {formData.sgk_giris}</div>
          <div><span className="text-gray-500">Şirket:</span> {formData.sirket_id || '-'}</div>
          <div><span className="text-gray-500">Birim:</span> {formData.birim_id || '-'}</div>
          <div><span className="text-gray-500">Görev:</span> {formData.gorev || '-'}</div>
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
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">SGK Giriş Tarihi *</label>
                    <input type="date" value={draft.sgk_giris || ''} onChange={(e) => {
                      setDraft(prev => ({ ...prev, sgk_giris: e.target.value }))
                      if (modalErrors.sgk_giris) setModalErrors({})
                    }} className={cn("w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-900", modalErrors.sgk_giris ? "border-red-300 dark:border-red-700" : "border-gray-300 dark:border-gray-700")} />
                    {modalErrors.sgk_giris && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{modalErrors.sgk_giris}</p>}
                  </div>
                  <input placeholder="Şirket" value={draft.sirket_id || ''} onChange={(e) => setDraft(prev => ({ ...prev, sirket_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" />
                  <input placeholder="Birim" value={draft.birim_id || ''} onChange={(e) => setDraft(prev => ({ ...prev, birim_id: e.target.value }))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" />
                  <input placeholder="Görev" value={draft.gorev || ''} onChange={(e) => setDraft(prev => ({ ...prev, gorev: e.target.value }))} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" />
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
  heroLeftPanel,
  imageSlot = { title: 'Fotoğraf', required: false },
  documentSlot = { title: 'CV', required: false },
  onSave,
  onCancel,
  onDelete,
  onModeChange,
  additionalActions,
  error,
  externalFieldErrors,
  onValidationError,
  className,
  enableHistory = false
}: EntityFormProps) {
  // Internal mode state
  const [mode, setMode] = useState<FormMode>(initialMode)
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '')
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [cvExtractStatus, setCvExtractStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' })
  const [turkeyProvinces, setTurkeyProvinces] = useState<TurkeyProvince[]>([])
  
  // STANDARD FORM LAYOUT: Image and Document slots
  const imageSlots: ImageSlot[] = [
    { id: 'photo', title: imageSlot.title || 'Fotoğraf', required: imageSlot.required ?? false },
  ]
  const [images, setImages] = useState<SlotImage[]>([])
  
  const documentSlots: DocumentSlot[] = [
    {
      id: 'cv',
      title: documentSlot.title || 'CV',
      required: documentSlot.required ?? false,
      acceptedTypes: documentSlot.acceptedTypes || CV_DOCUMENT_ACCEPTED_TYPES,
      maxSizeMB: documentSlot.maxSizeMB || 20
    },
  ]
  const [documents, setDocuments] = useState<SlotDocument[]>([])

  useEffect(() => {
    if (data?.fotograf_url) {
      setImages([{ slotId: 'photo', previewUrl: data.fotograf_url, name: 'Fotoğraf' }])
    } else {
      setImages([])
    }
  }, [data?.fotograf_url])

  useEffect(() => {
    setDocuments(normalizeStoredDocuments(data?.cv_belgesi))
  }, [data?.cv_belgesi])

  // Sync with external mode changes
  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  // Initialize form data
  useEffect(() => {
    if (data && (mode === 'view' || mode === 'edit')) {
      setFormData(data)
    } else if (mode === 'create') {
      // Initialize with defaults
      const defaults: Record<string, any> = {}
      heroFields.forEach(f => {
        if (f.type === 'select' && f.options?.[0]?.value) {
          defaults[f.name] = f.options[0].value
        } else if (f.type === 'checkbox') {
          defaults[f.name] = false
        } else if (f.type === 'list') {
          defaults[f.name] = []
        }
      })
      tabs.forEach(tab => {
        tab.fields.forEach(f => {
          if (f.type === 'select' && f.options?.[0]?.value) {
            defaults[f.name] = f.options[0].value
          } else if (f.type === 'checkbox') {
            defaults[f.name] = false
          } else if (f.type === 'list') {
            defaults[f.name] = []
          }
        })
      })
      setFormData(defaults)
    }
  // Keep form values stable across parent re-renders such as validation toasts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, mode])

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
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id)
    }
  }, [tabs, activeTab])

  useEffect(() => {
    if (externalFieldErrors && Object.keys(externalFieldErrors).length > 0) {
      setFieldErrors(externalFieldErrors)
    }
  }, [externalFieldErrors])

  const isReadOnly = mode === 'view'
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'
  const allFormFields = [
    ...flattenFields(heroFields),
    ...tabs.flatMap(tab => flattenFields(tab.fields))
  ]

  const isFieldRequired = (field: FormField, sourceData = formData) => {
    if (field.required) return true
    if (field.requiredWhen && matchesCondition(field.requiredWhen, sourceData)) return true
    if (!field.requiredGroup) return false

    return allFormFields
      .filter(candidate => candidate.requiredGroup === field.requiredGroup)
      .some(candidate => matchesCondition(candidate.visibleWhen, sourceData) && hasValue(sourceData[candidate.name]))
  }

  const handleModeChange = (newMode: FormMode) => {
    setMode(newMode)
    onModeChange?.(newMode)
    setFieldErrors({})
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleFormattedFieldChange = (field: FormField, value: string) => {
    if (field.name === 'tc_kimlik') {
      handleChange(field.name, value.replace(/\D/g, '').slice(0, 11))
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
    setDocuments(nextDocuments)
    const cvDocument = nextDocuments.find(document => document.slotId === 'cv')
    handleChange('cv_belgesi', cvDocument ? serializeDocumentForStorage(cvDocument) : null)

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

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    
    const validateFields = (fields: FormField[]) => {
      fields.forEach(field => {
        if (field.type === 'section' || !matchesCondition(field.visibleWhen, formData)) return
        if (isFieldRequired(field) && !hasValue(formData[field.name])) {
          errors[field.name] = `${field.errorLabel || field.label} zorunludur`
          return
        }

        if (field.pattern && hasValue(formData[field.name])) {
          const regex = new RegExp(`^(?:${field.pattern})$`)
          if (!regex.test(String(formData[field.name]))) {
            errors[field.name] = field.name === 'tc_kimlik'
              ? 'TC Kimlik No 11 haneli sayı olmalıdır'
              : `${field.errorLabel || field.label} formatı geçersiz`
          }
        }
      })
    }

    validateFields(heroFields)
    tabs.forEach(tab => validateFields(tab.fields))

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      onValidationError?.(Object.values(errors).map(error => error.replace(' zorunludur', '')))
    }
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    
    try {
      await onSave(formData, mode)
      if (isCreate) {
        setFormData({})
      }
    } catch (err: any) {
      // Error handled by parent
    }
  }

  const renderField = (field: FormField, showHistoryIcon = false) => {
    if (!matchesCondition(field.visibleWhen, formData)) return null
    const value = formData[field.name] || ''
    const error = fieldErrors[field.name]
    const isRequired = isFieldRequired(field)
    const colSpanClass = field.colSpan === 3
      ? 'col-span-2 lg:col-span-3'
      : field.colSpan === 2
        ? 'col-span-2 md:col-span-2'
        : field.compact
          ? 'col-span-1'
          : 'col-span-2 md:col-span-1'
    const fieldDisabled = isReadOnly || (field.disabledWhen ? matchesCondition(field.disabledWhen, formData) : false)

    if (field.type === 'section') {
      return (
        <div key={field.name} className={cn("border-t border-gray-200 pt-4 dark:border-gray-700", colSpanClass || 'md:col-span-2 lg:col-span-3')}>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{field.label}</h4>
        </div>
      )
    }

    const baseInputClass = cn(
      "w-full bg-white dark:bg-gray-900 border rounded-lg px-3 py-2 text-sm",
      "transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20",
      error 
        ? "border-red-300 dark:border-red-700 focus:border-red-500" 
        : "border-gray-300 dark:border-gray-700 focus:border-blue-500",
      fieldDisabled && "bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
    )

    const renderInput = () => {
      if (field.render) {
        return field.render({
          value,
          onChange: (val) => handleChange(field.name, val),
          readOnly: isReadOnly
        })
      }

      if (field.name === 'il') {
        return (
          <select
            value={value}
            onChange={(e) => {
              handleChange('il', e.target.value)
              handleChange('ilce', '')
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

      if (field.name === 'ilce') {
        const selectedProvince = turkeyProvinces.find(province => province.name === formData.il)

        return (
          <select
            value={value}
            onChange={(e) => handleChange('ilce', e.target.value)}
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
          return (
            <label className="flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              <input
                type="checkbox"
                checked={!!formData[field.name]}
                onChange={(e) => handleChange(field.name, e.target.checked)}
                disabled={fieldDisabled}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
              readOnly={isReadOnly}
              disabled={field.disabledWhen ? matchesCondition(field.disabledWhen, formData) : false}
            />
          )
        case 'workLifecycle':
          return (
            <WorkLifecycleField
              formData={formData}
              onChange={handleChange}
              readOnly={isReadOnly}
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
          return (
            <select
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              disabled={fieldDisabled}
              className={cn(baseInputClass, fieldDisabled && "appearance-none")}
            >
              <option value="">Seçiniz</option>
              {field.options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
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
      <div key={field.name} className={cn("space-y-1", colSpanClass)}>
        <div className="flex items-center gap-2">
          {(showHistoryIcon || enableHistory) && field.history && field.history.length > 0 && (
            <FieldHistoryIndicator history={field.history} />
          )}
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {field.label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
        </div>
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
      {/* Global Error */}
      {error && (
        <div className="m-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
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
                    readOnly={isReadOnly}
                  />
                </div>
                
                {/* Document Slot - Optional */}
                <div className="flex flex-col gap-1.5">
                  <DocumentSlotUploader
                    slots={documentSlots}
                    documents={documents}
                    onChange={handleDocumentsChange}
                    readOnly={isReadOnly}
                    aiBadge={{
                      label: 'AI',
                      title: 'CV yüklendiğinde çalışan alanları AI ile okunur'
                    }}
                  />
                  {cvExtractStatus.type !== 'idle' && (
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
              </div>
            )}
          </div>

          {/* Right Panel - Fields + Actions */}
          <div className="lg:col-span-3 flex flex-col">
            {/* Section Title */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Temel Bilgiler
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {isCreate ? 'Yeni kayıt oluşturun' : isEdit ? 'Bilgileri güncelleyin' : 'Kayıt detayları'}
              </p>
            </div>

            {/* Required Fields Grid */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
              {heroFields.map(field => renderField(field, enableHistory))}
            </div>

            {/* Form Action Area - Bottom Right */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
              {/* Future: Workflow Actions (Approve, Reject, etc.) */}
              {additionalActions}
              
              {/* View Mode: Edit Button */}
              {isReadOnly && canEdit && (
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
                    disabled={saving || (isCreate && !canCreate)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    {isCreate ? 'Oluştur' : 'Güncelle'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2",
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={cn(
              "grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4",
              activeTab !== tab.id && "hidden"
            )}
          >
            {tab.fields.map(field => renderField(field, enableHistory))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default EntityForm
