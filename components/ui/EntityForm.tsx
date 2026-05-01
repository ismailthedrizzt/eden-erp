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

import { useState, useEffect, ReactNode } from 'react'
import { Save, Loader2, Edit3, Eye, History, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Historical value entry */
export interface HistoryEntry {
  value: string
  date: string
  user?: string
}

/** Form field configuration */
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'textarea' | 'number' | 'custom'
  required?: boolean
  options?: { value: string; label: string }[]
  placeholder?: string
  colSpan?: 1 | 2 | 3
  /** History entries for this field */
  history?: HistoryEntry[]
  /** Custom render function */
  render?: (props: { value: any; onChange: (val: any) => void; readOnly: boolean }) => ReactNode
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
  
  /** Whether the user has edit permission (future: auth integration) */
  canEdit?: boolean
  
  /** Whether the user has create permission (future: auth integration) */
  canCreate?: boolean
  
  /** Custom hero left panel content (Photo, Documents, etc.) */
  heroLeftPanel?: ReactNode
  
  /** Save handler - receives form data */
  onSave: (data: Record<string, any>, mode: FormMode) => Promise<void> | void
  
  /** Cancel/close handler */
  onCancel: () => void
  
  /** Mode change handler (view -> edit) */
  onModeChange?: (mode: FormMode) => void
  
  /** Additional actions in form action area (future: workflow) */
  additionalActions?: ReactNode
  
  /** Form-level error message */
  error?: string | null
  
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
                <span className="text-gray-500">{new Date(entry.date).toLocaleDateString('tr-TR')}</span>
                <span className="mx-1 text-gray-400">→</span>
                <span className="text-gray-900 dark:text-gray-100 font-medium">"{entry.value}"</span>
                {entry.user && (
                  <span className="block text-gray-400 mt-0.5">by {entry.user}</span>
                )}
              </div>
            ))}
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
  canEdit = true,
  canCreate = true,
  heroLeftPanel,
  onSave,
  onCancel,
  onModeChange,
  additionalActions,
  error,
  className,
  enableHistory = false
}: EntityFormProps) {
  // Internal mode state
  const [mode, setMode] = useState<FormMode>(initialMode)
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '')
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

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
        }
      })
      tabs.forEach(tab => {
        tab.fields.forEach(f => {
          if (f.type === 'select' && f.options?.[0]?.value) {
            defaults[f.name] = f.options[0].value
          }
        })
      })
      setFormData(defaults)
    }
  }, [data, mode, heroFields, tabs])

  // Reset active tab when mode changes
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id)
    }
  }, [tabs, activeTab])

  const isReadOnly = mode === 'view'
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'

  const handleModeChange = (newMode: FormMode) => {
    setMode(newMode)
    onModeChange?.(newMode)
    setFieldErrors({})
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    
    const validateFields = (fields: FormField[]) => {
      fields.forEach(field => {
        if (field.required && !formData[field.name]) {
          errors[field.name] = `${field.label} zorunludur`
        }
      })
    }

    validateFields(heroFields)
    tabs.forEach(tab => validateFields(tab.fields))

    setFieldErrors(errors)
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
    const value = formData[field.name] || ''
    const error = fieldErrors[field.name]
    const colSpanClass = field.colSpan === 2 ? 'md:col-span-2' : field.colSpan === 3 ? 'md:col-span-3' : ''

    const baseInputClass = cn(
      "w-full bg-white dark:bg-gray-900 border rounded-lg px-3 py-2 text-sm",
      "transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20",
      error 
        ? "border-red-300 dark:border-red-700 focus:border-red-500" 
        : "border-gray-300 dark:border-gray-700 focus:border-blue-500",
      isReadOnly && "bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
    )

    const renderInput = () => {
      if (field.render) {
        return field.render({
          value,
          onChange: (val) => handleChange(field.name, val),
          readOnly: isReadOnly
        })
      }

      switch (field.type) {
        case 'textarea':
          return (
            <textarea
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
              readOnly={isReadOnly}
              className={baseInputClass}
            />
          )
        case 'select':
          return (
            <select
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              disabled={isReadOnly}
              className={cn(baseInputClass, isReadOnly && "appearance-none")}
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
              readOnly={isReadOnly}
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
              readOnly={isReadOnly}
              className={baseInputClass}
            />
          )
        case 'email':
          return (
            <input
              type="email"
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              readOnly={isReadOnly}
              className={baseInputClass}
            />
          )
        case 'tel':
          return (
            <input
              type="tel"
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              readOnly={isReadOnly}
              className={baseInputClass}
            />
          )
        default:
          return (
            <input
              type="text"
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              readOnly={isReadOnly}
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
            {field.required && <span className="text-red-500 ml-1">*</span>}
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
          
          {/* Left Panel - Photo/Documents */}
          <div className="lg:col-span-1">
            {heroLeftPanel || (
              <div className="space-y-4">
                {/* Default Photo Upload Placeholder */}
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center p-4">
                  <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-2">
                    <span className="text-3xl">👤</span>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {isReadOnly ? 'Fotoğraf Yok' : 'Fotoğraf Yüklemek için Tıklayın'}
                  </p>
                </div>
                
                {/* Document Upload Area */}
                {!isReadOnly && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Dokümanlar</p>
                    <p className="text-xs text-blue-600 dark:text-blue-500">CV, Diploma, vb.</p>
                  </div>
                )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
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
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors text-sm font-medium"
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
                    Kaydet
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
              "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
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
