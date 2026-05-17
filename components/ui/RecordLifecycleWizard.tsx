'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type * as React from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  HelpCircle,
  Info,
  Link2,
  Loader2,
  Upload,
  X,
} from 'lucide-react'
import { cn, resolveTurkishIban } from '@/lib/utils'
import type { FormField, FieldAutomationConfig } from './EntityForm'
import { AutomationBadge, type AutomationBadgeStatus } from './AutomationBadge'
import { formControlClass, type FormControlState } from './formControlStyles'

export type RecordLifecycleWizardOption = {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export type RecordLifecycleWizardField = Omit<FormField, 'type' | 'options' | 'render'> & {
  type: FormField['type'] | 'optionCards'
  options?: RecordLifecycleWizardOption[]
  description?: string
  highlight?: boolean
  disabled?: boolean
  emptyOptionsRedirect?: {
    href: string
    label?: string
    message?: string
    visibleWhen?: any
  }
  render?: (props: {
    value: any
    onChange: (value: any) => void
    readOnly: boolean
    data: Record<string, any>
    className: string
    validationState: { status: FormControlState; label: string }
  }) => ReactNode
}

export type RecordLifecycleWizardSection = {
  id: string
  title: string
  description?: string
  fields?: RecordLifecycleWizardField[]
  children?: ReactNode
  visible?: boolean
}

export type RecordLifecycleWizardStep = {
  id: string
  title: string
  description?: string
  sections: RecordLifecycleWizardSection[]
}

type RecordLifecycleWizardProps = {
  title: string
  subtitle?: ReactNode
  steps: RecordLifecycleWizardStep[]
  form: Record<string, any>
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>
  onClose: () => void
  onSubmit: () => void | Promise<void>
  submitLabel: string
  saving?: boolean
  loadingMessage?: string
  contextError?: string
  error?: string
  sideInfo?: ReactNode
  finalContent?: ReactNode
  submitBlockedContent?: ReactNode
  onFieldChange?: (field: string, value: any, previous: Record<string, any>) => Record<string, any>
}

export function RecordLifecycleWizard({
  title,
  subtitle,
  steps,
  form,
  setForm,
  onClose,
  onSubmit,
  submitLabel,
  saving,
  loadingMessage,
  contextError,
  error,
  sideInfo,
  finalContent,
  submitBlockedContent,
  onFieldChange,
}: RecordLifecycleWizardProps) {
  const [step, setStep] = useState(0)
  const currentStep = steps[Math.min(step, Math.max(steps.length - 1, 0))]
  const isLastStep = step === steps.length - 1
  const stepComplete = useMemo(() => isWizardStepComplete(currentStep, form), [currentStep, form])

  const goNext = () => {
    if (!stepComplete) return
    if (!isLastStep) {
      setStep(current => Math.min(current + 1, steps.length - 1))
      return
    }
    onSubmit()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/45 p-0 sm:p-4">
      <div className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-950 sm:max-w-6xl sm:rounded-2xl">
        <div className="border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-300">
                {step + 1} / {steps.length} - {currentStep.title}
              </div>
              <h3 className="mt-1 text-lg font-semibold text-gray-950 dark:text-white">{title}</h3>
              {subtitle && <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
              aria-label="Kapat"
            >
              <X size={20} />
            </button>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-900">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[280px_1fr]">
          <aside className="border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/80 lg:border-b-0 lg:border-r">
            <ol className="space-y-2">
              {steps.map((item, index) => (
                <li
                  key={item.id}
                  className={cn(
                    'rounded-xl border px-3 py-3 text-sm transition-colors',
                    index === step
                      ? 'border-blue-200 bg-white text-blue-700 shadow-sm dark:border-blue-900/70 dark:bg-blue-950/20 dark:text-blue-200'
                      : index < step
                        ? 'border-emerald-100 bg-emerald-50/70 text-emerald-800 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-200'
                        : 'border-transparent text-gray-500 dark:text-gray-400'
                  )}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {index < step ? <CheckCircle2 size={16} /> : <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs dark:bg-gray-800">{index + 1}</span>}
                    {item.title}
                  </div>
                  {item.description && <p className="mt-1 pl-7 text-xs leading-5 opacity-80">{item.description}</p>}
                </li>
              ))}
            </ol>
            {sideInfo && <InfoPanel className="mt-4">{sideInfo}</InfoPanel>}
          </aside>

          <main className="min-h-0 overflow-auto p-5">
            {loadingMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-950 dark:bg-blue-950/30 dark:text-blue-200">
                <Loader2 size={16} className="animate-spin" />
                {loadingMessage}
              </div>
            )}
            {contextError && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-950 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertCircle size={16} className="mt-0.5" />
                <span>{contextError}</span>
              </div>
            )}

            <div className="mx-auto max-w-5xl space-y-4">
              {currentStep.sections
                .filter(section => section.visible !== false)
                .map(section => (
                  <RecordLifecycleWizardSectionView
                    key={section.id}
                    section={section}
                    form={form}
                    setForm={setForm}
                    allFields={collectWizardFields(steps)}
                    onFieldChange={onFieldChange}
                  />
                ))}

              {isLastStep && finalContent}

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-200">
                  <AlertCircle size={16} className="mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </main>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-950">
          <button
            type="button"
            onClick={() => step === 0 ? onClose() : setStep(current => current - 1)}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            {step === 0 ? <X size={16} /> : <ChevronLeft size={16} />}
            {step === 0 ? 'İptal' : 'Geri'}
          </button>

          {!isLastStep ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!stepComplete}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
            >
              Devam
              <ChevronRight size={16} />
            </button>
          ) : submitBlockedContent ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">{submitBlockedContent}</div>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={saving || !stepComplete}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {submitLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function RecordLifecycleWizardSectionView({
  section,
  form,
  setForm,
  allFields,
  onFieldChange,
}: {
  section: RecordLifecycleWizardSection
  form: Record<string, any>
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>
  allFields: RecordLifecycleWizardField[]
  onFieldChange?: (field: string, value: any, previous: Record<string, any>) => Record<string, any>
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-950 dark:text-white">{section.title}</h4>
        {section.description && <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{section.description}</p>}
      </div>
      {section.fields && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {section.fields
            .filter(field => matchesWizardCondition(field.visibleWhen, form))
            .map(field => (
              <RecordLifecycleWizardFieldView
                key={field.name}
                field={field}
                form={form}
                setForm={setForm}
                allFields={allFields}
                onFieldChange={onFieldChange}
              />
            ))}
        </div>
      )}
      {section.children}
    </section>
  )
}

function RecordLifecycleWizardFieldView({
  field,
  form,
  setForm,
  allFields,
  onFieldChange,
}: {
  field: RecordLifecycleWizardField
  form: Record<string, any>
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>
  allFields: RecordLifecycleWizardField[]
  onFieldChange?: (field: string, value: any, previous: Record<string, any>) => Record<string, any>
}) {
  const value = form[field.name] ?? ''
  const disabled = !!field.disabled || matchesWizardCondition(field.disabledWhen, form)
  const required = isWizardFieldRequired(field, form, allFields)
  const validationState = getWizardFieldValidationState(field, form, allFields)
  const fieldControlState = disabled ? 'neutral' : validationState.status
  const automationState = getWizardFieldAutomationState(field, form)
  const colSpanClass = field.colSpan === 3
    ? 'col-span-1 md:col-span-2'
    : field.colSpan === 2
      ? 'col-span-1 md:col-span-2'
      : 'col-span-1'

  const updateValue = (nextValue: any) => {
    setForm(previous => {
      const next = onFieldChange
        ? onFieldChange(field.name, nextValue, previous)
        : { ...previous, [field.name]: nextValue }
      return next
    })
  }

  const inputClass = formControlClass({
    state: fieldControlState,
    surface: field.type === 'select' ? 'enum' : 'default',
  })
  const options = field.options || []
  const emptyOptionsRedirect = field.emptyOptionsRedirect
  const showEmptyOptionsRedirect = field.type === 'select'
    && !!emptyOptionsRedirect
    && options.length === 0
    && matchesWizardCondition(emptyOptionsRedirect.visibleWhen, form)

  const label = (
    <div className="flex min-w-0 items-center gap-2">
      {!field.hideLabel && (
        <FieldLabel
          label={field.label}
          description={field.description}
          required={required}
          validationState={validationState}
          automationState={automationState}
        />
      )}
    </div>
  )

  if (field.type === 'optionCards') {
    return (
      <div className={cn('space-y-2', colSpanClass)}>
        {label}
        {validationState.label && <ValidationPill validationState={validationState} topClassName="top-0" />}
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {(field.options || []).map(option => {
            const active = value === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateValue(option.value)}
                disabled={disabled || option.disabled}
                title={option.description}
                className={cn(
                  'min-h-[92px] rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                  active
                    ? 'border-blue-300 bg-blue-50 text-blue-800 shadow-sm dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:bg-blue-50/50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-blue-950 dark:hover:bg-blue-950/20'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{option.label}</span>
                  {option.description && <HelpCircle size={15} className="shrink-0 text-gray-400" />}
                </div>
                {option.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">{option.description}</p>}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (field.type === 'document') {
    return (
      <div className={cn(colSpanClass)}>
        <DocumentRegistryField field={field} value={value} onChange={updateValue} />
      </div>
    )
  }

  if (field.type === 'custom' && field.render) {
    return (
      <div className={cn('relative space-y-1', colSpanClass)}>
        {label}
        {validationState.label && <ValidationPill validationState={validationState} />}
        {field.render({
          value,
          onChange: updateValue,
          readOnly: disabled,
          data: form,
          className: inputClass,
          validationState,
        })}
      </div>
    )
  }

  return (
    <div className={cn('relative space-y-1 rounded-xl border border-transparent p-1', field.highlight && 'border-blue-200 bg-blue-50/60 dark:border-blue-950 dark:bg-blue-950/20', colSpanClass)}>
      {label}
      {validationState.label && <ValidationPill validationState={validationState} />}
      {field.type === 'textarea' ? (
        <textarea
          value={value || ''}
          onChange={event => updateValue(event.target.value)}
          placeholder={field.placeholder}
          readOnly={disabled}
          className={formControlClass({ state: fieldControlState, className: 'min-h-24 resize-y' })}
        />
      ) : field.type === 'select' ? (
        <select
          value={value || ''}
          onChange={event => updateValue(event.target.value)}
          disabled={disabled}
          className={cn(inputClass, disabled && 'appearance-none')}
        >
          <option value="">{field.placeholder || 'Seçiniz'}</option>
          {options.map((option, index) => (
            <option key={`${option.value}-${index}`} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.type === 'checkbox' ? (
        <div className="flex min-h-[42px] items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
          <input
            type="checkbox"
            checked={!!value}
            onChange={event => updateValue(event.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          {field.placeholder || field.label}
        </div>
      ) : (
        <input
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'}
          value={value || ''}
          onChange={event => updateValue(event.target.value)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          inputMode={field.inputMode}
          pattern={field.pattern}
          readOnly={disabled}
          className={inputClass}
        />
      )}
      {showEmptyOptionsRedirect && emptyOptionsRedirect && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          <span className="min-w-0 flex-1">
            {emptyOptionsRedirect.message || 'Bu alan için kaynak kayıt bulunamadı.'}
          </span>
          <a
            href={emptyOptionsRedirect.href}
            className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white px-2 py-1 font-semibold text-amber-800 shadow-sm hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-100 dark:hover:bg-amber-900/60"
          >
            {emptyOptionsRedirect.label || 'Kaynak sayfaya git'}
            <ExternalLink size={12} />
          </a>
        </div>
      )}
    </div>
  )
}

function FieldLabel({
  label,
  description,
  required,
  validationState,
  automationState,
}: {
  label: string
  description?: string
  required?: boolean
  validationState: { status: FormControlState; label: string }
  automationState?: (FieldAutomationConfig & { status: AutomationBadgeStatus }) | null
}) {
  return (
    <>
      <span
        className={cn(
          'text-[13px] font-medium leading-5',
          validationState.status === 'invalid'
            ? 'text-red-700 dark:text-red-400'
            : validationState.status === 'valid'
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-gray-700 dark:text-gray-300'
        )}
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {description && (
        <span title={description} className="inline-flex text-gray-400">
          <HelpCircle size={13} />
        </span>
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
    </>
  )
}

function ValidationPill({
  validationState,
  topClassName,
}: {
  validationState: { status: FormControlState; label: string }
  topClassName?: string
}) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute right-2 top-8 z-10 rounded border bg-white px-1.5 py-0.5 text-[10px] font-medium leading-none dark:bg-gray-900',
        validationState.status === 'valid'
          ? 'border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400'
          : 'border-red-300 text-red-600 dark:border-red-700 dark:text-red-400',
        topClassName
      )}
    >
      {validationState.label}
    </span>
  )
}

function DocumentRegistryField({
  field,
  value,
  onChange,
}: {
  field: RecordLifecycleWizardField
  value: any
  onChange: (value: any) => void
}) {
  const current = typeof value === 'object' && value ? value : value ? { documentId: value, name: String(value) } : null
  const [mode, setMode] = useState<'new' | 'existing' | ''>(current?.source || '')
  const display = current?.name || current?.documentId || current?.storagePath || ''

  const chooseNew = () => {
    setMode('new')
    onChange({
      source: 'new',
      documentId: `pending:${field.name}`,
      name: `${field.label} - yeni belge`,
    })
  }

  const chooseExisting = () => {
    setMode('existing')
    onChange({
      source: 'existing',
      documentId: current?.documentId || '',
      name: current?.name || '',
    })
  }

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{field.label}</span>
        {field.description && (
          <span title={field.description} className="inline-flex text-gray-400">
            <HelpCircle size={13} />
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={chooseNew}
          className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium', mode === 'new' ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300')}
        >
          <Upload size={14} />
          Yeni Belge Yükle
        </button>
        <button
          type="button"
          onClick={chooseExisting}
          className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium', mode === 'existing' ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300')}
        >
          <Link2 size={14} />
          Mevcut Belgeden Seç
        </button>
      </div>
      {mode === 'existing' && (
        <input
          value={display}
          onChange={event => onChange({ source: 'existing', documentId: event.target.value, name: event.target.value })}
          placeholder="Belge adı veya referans no"
          className={formControlClass({ size: 'sm' })}
        />
      )}
      {mode === 'new' && (
        <div className="flex items-center gap-2 rounded-lg bg-white px-2 py-2 text-xs text-gray-500 dark:bg-gray-950 dark:text-gray-400">
          <FileText size={14} />
          Belge final payload içinde yeni belge olarak işaretlenecek.
        </div>
      )}
    </div>
  )
}

function InfoPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800 dark:border-blue-950 dark:bg-blue-950/25 dark:text-blue-200', className)}>
      <Info size={15} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

function isWizardStepComplete(step: RecordLifecycleWizardStep | undefined, form: Record<string, any>) {
  if (!step) return false
  const fields = collectWizardFields([step])
  return fields.every(field => {
    if (field.disabled || !matchesWizardCondition(field.visibleWhen, form)) return true
    if (!isWizardFieldRequired(field, form, fields)) return true
    return hasWizardValue(form[field.name])
  })
}

function getWizardFieldValidationState(
  field: RecordLifecycleWizardField,
  form: Record<string, any>,
  allFields: RecordLifecycleWizardField[]
) {
  if (field.type === 'section' || !matchesWizardCondition(field.visibleWhen, form)) {
    return { status: 'neutral' as const, label: '' }
  }

  const value = form[field.name]
  const isRequired = isWizardFieldRequired(field, form, allFields)

  if (isRequired && !hasWizardValue(value)) {
    return { status: 'invalid' as const, label: 'Zorunlu Alan' }
  }

  if (field.pattern && hasWizardValue(value)) {
    const regex = new RegExp(`^(?:${field.pattern})$`)
    return regex.test(String(value))
      ? { status: isRequired ? 'valid' as const : 'neutral' as const, label: isRequired ? 'Tamam' : '' }
      : { status: 'invalid' as const, label: 'Geçersiz Format' }
  }

  if (isRequired && hasWizardValue(value)) {
    return { status: 'valid' as const, label: 'Tamam' }
  }

  return { status: 'neutral' as const, label: '' }
}

function isWizardFieldRequired(
  field: RecordLifecycleWizardField,
  form: Record<string, any>,
  allFields: RecordLifecycleWizardField[]
) {
  if (field.required) return true
  if (field.requiredWhen && matchesWizardCondition(field.requiredWhen, form)) return true
  if (!field.requiredGroup) return false

  return allFields
    .filter(candidate => candidate.requiredGroup === field.requiredGroup)
    .some(candidate => matchesWizardCondition(candidate.visibleWhen, form) && hasWizardValue(form[candidate.name]))
}

function collectWizardFields(steps: RecordLifecycleWizardStep[]) {
  return steps.flatMap(step => step.sections)
    .filter(section => section.visible !== false)
    .flatMap(section => section.fields || [])
}

function matchesWizardCondition(condition: any, data: Record<string, any>): boolean {
  if (!condition) return true
  const value = data[condition.field]
  if (condition.operator === 'equals') return value === condition.value
  if (condition.operator === 'notEquals') return value !== condition.value
  if (condition.operator === 'exists') return value !== undefined && value !== null && value !== ''
  if (condition.operator === 'notExists') return value === undefined || value === null || value === ''
  if (condition.operator === 'empty') return value === undefined || value === null || value === ''
  if (condition.operator === 'notEmpty') return value !== undefined && value !== null && value !== ''
  if (condition.operator === 'includes') return Array.isArray(value) ? value.includes(condition.value) : condition.includes?.includes(value)
  if ('equals' in condition) return value === condition.equals
  if ('notEquals' in condition) return value !== condition.notEquals
  if (condition.includes) return condition.includes.includes(value)
  return true
}

function hasWizardValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object' && value !== null) return Object.values(value).some(hasWizardValue)
  return value !== undefined && value !== null && value !== ''
}

function getWizardFieldAutomationState(field: RecordLifecycleWizardField, data: Record<string, any>): (FieldAutomationConfig & { status: AutomationBadgeStatus }) | null {
  const automation = field.automation || getDefaultWizardFieldAutomation(field)
  if (!automation) return null

  if (typeof automation.status === 'function') {
    return { ...automation, status: automation.status(data, field as FormField) }
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

function getDefaultWizardFieldAutomation(field: RecordLifecycleWizardField): FieldAutomationConfig | null {
  if (field.type !== 'iban' && field.name !== 'beneficiary_iban' && field.name !== 'beneficiary_iban_or_account_no') return null
  return {
    sourceFields: [field.name],
    targetFields: ['beneficiary_bank_name', 'beneficiary_bank_code', 'beneficiary_account_no', 'beneficiary_swift_bic'],
    title: 'IBAN girilince banka, hesap ve SWIFT alanları otomatik doldurulur.',
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
