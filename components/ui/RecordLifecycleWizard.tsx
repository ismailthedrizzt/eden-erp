'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
  Plus,
  Upload,
  X,
} from 'lucide-react'
import { cn, resolveTurkishIban } from '@/lib/utils'
import { apiClient } from '@/lib/api/apiClient'
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
  documentMode?: 'registry' | 'newOnly'
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
  frameless?: boolean
}

export type RecordLifecycleWizardStep = {
  id: string
  title: string
  description?: string
  sections: RecordLifecycleWizardSection[]
}

export type RecordLifecycleWizardSubmitBinding = {
  endpoint: string | ((form: Record<string, any>) => string)
  method?: 'POST' | 'PATCH' | 'PUT'
  buildPayload?: (form: Record<string, any>) => Record<string, any>
  onSuccess?: (result: any, payload: Record<string, any>) => void | Promise<void>
}

type RecordLifecycleWizardProps = {
  title: string
  subtitle?: ReactNode
  steps: RecordLifecycleWizardStep[]
  form: Record<string, any>
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>
  onClose: () => void
  onSubmit?: () => void | Promise<void>
  submitBinding?: RecordLifecycleWizardSubmitBinding
  submitLabel: string
  saving?: boolean
  loadingMessage?: string
  contextError?: string
  error?: string
  sideInfo?: ReactNode
  finalContent?: ReactNode
  submitBlockedContent?: ReactNode
  readOnly?: boolean
  onFieldChange?: (field: string, value: any, previous: Record<string, any>) => Record<string, any>
  validateStep?: (stepIndex: number) => ReactNode | string | null | undefined
}

export function RecordLifecycleWizard({
  title,
  subtitle,
  steps,
  form,
  setForm,
  onClose,
  onSubmit,
  submitBinding,
  submitLabel,
  saving,
  loadingMessage,
  contextError,
  error,
  sideInfo,
  finalContent,
  submitBlockedContent,
  readOnly,
  onFieldChange,
  validateStep,
}: RecordLifecycleWizardProps) {
  const [step, setStep] = useState(0)
  const [navigationError, setNavigationError] = useState<ReactNode | null>(null)
  const [submitError, setSubmitError] = useState<ReactNode | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const currentStep = steps[Math.min(step, Math.max(steps.length - 1, 0))]
  const isLastStep = step === steps.length - 1
  const stepComplete = useMemo(() => readOnly || isWizardStepComplete(currentStep, form), [currentStep, form, readOnly])

  const goNext = async () => {
    if (!stepComplete || submitting || saving) return
    const validationMessage = validateStep?.(step)
    if (validationMessage) {
      setNavigationError(validationMessage)
      return
    }
    setNavigationError(null)
    setSubmitError(null)
    if (!isLastStep) {
      setStep(current => Math.min(current + 1, steps.length - 1))
      return
    }
    setSubmitting(true)
    try {
      if (submitBinding) {
        await submitRecordLifecycleBinding(submitBinding, form)
      } else if (onSubmit) {
        await onSubmit()
      } else {
        throw new Error('Bu işlem için onay endpointi tanımlı değil.')
      }
    } catch (error) {
      setSubmitError(formatWizardSubmitError(error))
    } finally {
      setSubmitting(false)
    }
  }

  const selectStep = (index: number) => {
    if (index === step) return
    if (!readOnly && index > step) return
    setNavigationError(null)
    setStep(index)
  }

  return (
    <div data-tour-id="record-lifecycle-wizard" className="fixed inset-0 z-50 flex items-start justify-end overflow-y-auto bg-black/45 p-0 sm:p-4">
      <div className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-950 sm:h-[calc(100dvh-2rem)] sm:max-w-6xl sm:rounded-2xl">
        <div className="shrink-0 border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-950 dark:text-white">{title}</h3>
              {subtitle && <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</div>}
            </div>
            <button
              type="button"
              data-tour-id="record-lifecycle-wizard-close"
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
          <div className="mt-4 overflow-x-auto pb-1">
            <ol className="grid min-w-max gap-2 sm:min-w-0" style={{ gridTemplateColumns: `repeat(${Math.max(steps.length, 1)}, minmax(180px, 1fr))` }}>
              {steps.map((item, index) => {
                const selectable = readOnly || index <= step
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => selectStep(index)}
                      disabled={!selectable}
                      className={cn(
                        'h-full w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60',
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
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
          {sideInfo && <InfoPanel className="mt-3">{sideInfo}</InfoPanel>}
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
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
                    readOnly={!!readOnly}
                    onFieldChange={onFieldChange}
                  />
                ))}

              {isLastStep && finalContent}

              {(navigationError || submitError || error) && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-200">
                  <AlertCircle size={16} className="mt-0.5" />
                  <div className="min-w-0 flex-1">{navigationError || submitError || error}</div>
                </div>
              )}
            </div>
        </main>

        <div className="shrink-0 border-t border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => step === 0 ? onClose() : setStep(current => current - 1)}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            {step === 0 ? <X size={16} /> : <ChevronLeft size={16} />}
            {step === 0 ? (readOnly ? 'Kapat' : 'İptal') : 'Geri'}
          </button>

          {!isLastStep ? (
            <button
              type="button"
              onClick={() => void goNext()}
              disabled={!stepComplete || submitting || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
            >
              Devam
              <ChevronRight size={16} />
            </button>
          ) : readOnly ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
            >
              <X size={16} />
              Kapat
            </button>
          ) : submitBlockedContent ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">{submitBlockedContent}</div>
          ) : (
            <button
              type="button"
              onClick={() => void goNext()}
              disabled={saving || submitting || !stepComplete}
              aria-label={submitLabel || 'Onayla'}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {(saving || submitting) && <Loader2 size={16} className="animate-spin" />}
              Onayla
            </button>
          )}
          </div>
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
  readOnly,
  onFieldChange,
}: {
  section: RecordLifecycleWizardSection
  form: Record<string, any>
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>
  allFields: RecordLifecycleWizardField[]
  readOnly?: boolean
  onFieldChange?: (field: string, value: any, previous: Record<string, any>) => Record<string, any>
}) {
  const content = (
    <>
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
                readOnly={!!readOnly}
                onFieldChange={onFieldChange}
              />
            ))}
        </div>
      )}
      {section.children}
    </>
  )

  if (section.frameless) {
    return (
      <section className="space-y-4">
        {(section.title || section.description) && (
          <div>
            {section.title && <h4 className="text-sm font-semibold text-gray-950 dark:text-white">{section.title}</h4>}
            {section.description && <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{section.description}</p>}
          </div>
        )}
        {content}
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-950 dark:text-white">{section.title}</h4>
        {section.description && <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{section.description}</p>}
      </div>
      {content}
    </section>
  )
}

function RecordLifecycleWizardFieldView({
  field,
  form,
  setForm,
  allFields,
  readOnly,
  onFieldChange,
}: {
  field: RecordLifecycleWizardField
  form: Record<string, any>
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>
  allFields: RecordLifecycleWizardField[]
  readOnly?: boolean
  onFieldChange?: (field: string, value: any, previous: Record<string, any>) => Record<string, any>
}) {
  const value = form[field.name] ?? ''
  const disabled = !!readOnly || !!field.disabled || (!!field.disabledWhen && matchesWizardCondition(field.disabledWhen, form))
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
        <div
          className={cn(
            'grid gap-2 rounded-xl border p-2 md:grid-cols-2 xl:grid-cols-3',
            wizardFieldFrameClass(fieldControlState)
          )}
        >
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
      <div className={cn('relative space-y-1', colSpanClass)}>
        {validationState.label && <ValidationPill validationState={validationState} topClassName="top-0" />}
        <DocumentRegistryField
          field={field}
          value={value}
          onChange={updateValue}
          readOnly={disabled}
          validationState={validationState}
        />
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
      ) : field.type === 'select' && (field.searchable || field.remoteOptions) ? (
        <SearchableWizardSelectField
          field={field}
          value={value || ''}
          disabled={disabled}
          className={inputClass}
          onChange={updateValue}
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
        <div
          className={cn(
            'flex min-h-[42px] items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-200',
            wizardFieldFrameClass(fieldControlState)
          )}
        >
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

function SearchableWizardSelectField({
  field,
  value,
  disabled,
  className,
  onChange,
}: {
  field: RecordLifecycleWizardField
  value: string
  disabled: boolean
  className: string
  onChange: (value: string) => void
}) {
  const staticOptions = field.options || []
  const remoteConfig = field.remoteOptions
  const hasRemoteOptions = !!remoteConfig?.endpoint
  const [remoteOptions, setRemoteOptions] = useState<RecordLifecycleWizardOption[]>([])
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [remoteError, setRemoteError] = useState<string | null>(null)
  const loadedOptions = useMemo(() => mergeWizardOptions(staticOptions, remoteOptions), [staticOptions, remoteOptions])
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
          const normalizedQuery = normalizeWizardEnumText(query)
          return normalizeWizardEnumText(option.label).includes(normalizedQuery) ||
            normalizeWizardEnumText(option.value).includes(normalizedQuery)
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
          setRemoteOptions(parseWizardRemoteOptionsPayload(payload))
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
    const normalized = normalizeWizardEnumText(text)
    if (!normalized) {
      setQuery('')
      onChange('')
      return
    }

    const exact = commitOptions.find(option =>
      normalizeWizardEnumText(option.label) === normalized ||
      normalizeWizardEnumText(option.value) === normalized
    )
    if (exact) {
      setQuery(exact.label)
      onChange(exact.value)
      return
    }

    const prefixMatches = commitOptions.filter(option =>
      normalizeWizardEnumText(option.label).startsWith(normalized) ||
      normalizeWizardEnumText(option.value).startsWith(normalized)
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
          {filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
            <button
              key={`${option.value}-${index}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery(option.label)
                onChange(option.value)
                setOpen(false)
              }}
              className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-blue-50 dark:text-gray-100 dark:hover:bg-blue-950/40"
            >
              {option.label}
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

function mergeWizardOptions(...optionGroups: RecordLifecycleWizardOption[][]): RecordLifecycleWizardOption[] {
  const merged: RecordLifecycleWizardOption[] = []
  const seen = new Set<string>()

  optionGroups.flat().forEach(option => {
    const cleanOption = asWizardOption(option)
    if (!cleanOption) return
    const key = `${cleanOption.value}\u0000${cleanOption.label}`
    if (seen.has(key)) return
    seen.add(key)
    merged.push(cleanOption)
  })

  return merged
}

function parseWizardRemoteOptionsPayload(payload: unknown): RecordLifecycleWizardOption[] {
  const candidate = payload as {
    options?: unknown[]
    offices?: unknown[]
    provinces?: unknown[]
    districts?: unknown[]
  } | null
  const source = Array.isArray(candidate?.options)
    ? candidate.options
    : Array.isArray(candidate?.districts)
      ? candidate.districts
      : Array.isArray(candidate?.provinces)
        ? candidate.provinces
        : Array.isArray(candidate?.offices)
          ? candidate.offices
          : []

  return source.map(asWizardOption).filter((option): option is RecordLifecycleWizardOption => !!option)
}

function asWizardOption(option: unknown): RecordLifecycleWizardOption | null {
  if (!option || typeof option !== 'object') return null
  const candidate = option as { value?: unknown; label?: unknown; name?: unknown; code?: unknown }
  const label = String(candidate.label ?? candidate.name ?? '').trim()
  const value = String(candidate.value ?? candidate.name ?? label).trim()
  if (!value || !label) return null
  const code = String(candidate.code ?? '').trim()
  return {
    value,
    label: !candidate.label && code ? `${code} - ${label}` : label,
  }
}

function normalizeWizardEnumText(value: unknown) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\u0131/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

function wizardFieldFrameClass(state: FormControlState) {
  if (state === 'invalid') {
    return 'border-red-400 dark:border-red-700'
  }
  if (state === 'valid') {
    return 'border-emerald-500 dark:border-emerald-600'
  }
  return 'border-gray-200 dark:border-gray-800'
}

function DocumentRegistryField({
  field,
  value,
  onChange,
  readOnly,
  validationState,
}: {
  field: RecordLifecycleWizardField
  value: any
  onChange: (value: any) => void
  readOnly?: boolean
  validationState?: { status: FormControlState; label: string }
}) {
  const current = typeof value === 'object' && value ? value : value ? { documentId: value, name: String(value) } : null
  const [mode, setMode] = useState<'new' | 'existing' | ''>(current?.source || '')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const display = current?.name || current?.documentId || current?.storagePath || ''

  const chooseNew = () => {
    if (readOnly) return
    setMode('new')
    onChange({
      source: 'new',
      documentId: `pending:${field.name}`,
      name: `${field.label} - yeni belge`,
    })
  }

  const chooseExisting = () => {
    if (readOnly) return
    setMode('existing')
    onChange({
      source: 'existing',
      documentId: current?.documentId || '',
      name: current?.name || '',
    })
  }

  const clearDocument = () => {
    if (readOnly) return
    setMode('')
    setUploadError(null)
    onChange('')
  }

  const uploadNewOnlyDocument = async (file: File | undefined) => {
    if (readOnly) return
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const uploaded = await uploadWizardDocumentFile(file, field.name)
      setMode('new')
      onChange({
        source: 'new',
        documentId: uploaded.storagePath || uploaded.url || `pending:${field.name}:${Date.now()}`,
        storagePath: uploaded.storagePath || undefined,
        url: uploaded.url || undefined,
        thumbnailUrl: uploaded.thumbnailUrl || undefined,
        thumbnailPath: uploaded.thumbnailPath || undefined,
        name: uploaded.name || file.name,
        size: uploaded.size || file.size,
        type: uploaded.type || file.type || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
      })
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Belge yüklenemedi')
    } finally {
      setUploading(false)
    }
  }

  if (field.documentMode === 'newOnly') {
    return (
      <div
        className={cn(
          'flex flex-col gap-3 rounded-lg border bg-white px-3 py-3 dark:bg-gray-950 sm:flex-row sm:items-center',
          wizardFieldFrameClass(validationState?.status || 'neutral')
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          onChange={event => {
            const file = event.target.files?.[0]
            event.target.value = ''
            uploadNewOnlyDocument(file)
          }}
          disabled={readOnly}
        />
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
            <FileText size={16} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{field.label}</span>
              {field.required && <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-300">Zorunlu</span>}
            </div>
            <div className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
              {uploading ? 'Belge yükleniyor...' : display || 'Belge eklenmedi'}
            </div>
            {uploadError && <div className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{uploadError}</div>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || readOnly}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-60',
              current
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50'
                : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200 dark:hover:bg-blue-950/50'
            )}
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {current ? 'Değiştir' : 'Ekle'}
          </button>
          {current && (
            <button
              type="button"
              onClick={clearDocument}
              disabled={readOnly}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
              aria-label={`${field.label} belgesini kaldır`}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'space-y-2 rounded-xl border border-dashed bg-gray-50 p-3 dark:bg-gray-900',
        wizardFieldFrameClass(validationState?.status || 'neutral')
      )}
    >
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
          disabled={readOnly}
          className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium', mode === 'new' ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300')}
        >
          <Upload size={14} />
          Yeni Belge Yükle
        </button>
        <button
          type="button"
          onClick={chooseExisting}
          disabled={readOnly}
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
          readOnly={readOnly}
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

async function uploadWizardDocumentFile(file: File, slotId: string) {
  const body = new FormData()
  body.append('file', file)
  body.append('slotId', slotId)

  const response = await fetch('/api/uploads/documents', {
    method: 'POST',
    body,
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'Belge yüklenemedi')

  return {
    storagePath: String(result.storagePath || ''),
    url: String(result.url || ''),
    thumbnailPath: String(result.thumbnailPath || ''),
    thumbnailUrl: String(result.thumbnailUrl || ''),
    name: String(result.name || file.name),
    size: Number(result.size || file.size),
    type: String(result.type || file.type || 'application/octet-stream'),
  }
}


async function submitRecordLifecycleBinding(binding: RecordLifecycleWizardSubmitBinding, form: Record<string, any>) {
  const endpoint = typeof binding.endpoint === 'function' ? binding.endpoint(form) : binding.endpoint
  const payload = binding.buildPayload ? binding.buildPayload(form) : form
  const method = binding.method || 'POST'
  const result = method === 'PATCH'
    ? await apiClient.patch(endpoint, payload, { useCache: false })
    : method === 'PUT'
      ? await apiClient(endpoint, { method: 'PUT', body: JSON.stringify(payload), useCache: false })
      : await apiClient.post(endpoint, payload, { useCache: false })
  await binding.onSuccess?.(result, payload)
}

function formatWizardSubmitError(error: unknown): ReactNode {
  const message = getWizardSubmitErrorMessage(error)
  const fieldErrors = getWizardValidationFieldErrors(error)
  if (fieldErrors.length) {
    return (
      <div className="space-y-2">
        <div>{message || 'Gonderilen bilgiler kontrol edilmeli.'}</div>
        <ul className="list-disc space-y-1 pl-5">
          {fieldErrors.slice(0, 6).map((fieldError, index) => (
            <li key={`${fieldError.field}-${index}`}>
              <span className="font-medium">{fieldError.field}</span>
              {fieldError.message ? `: ${fieldError.message}` : null}
            </li>
          ))}
          {fieldErrors.length > 6 ? <li>{fieldErrors.length - 6} alan daha kontrol edilmeli.</li> : null}
        </ul>
      </div>
    )
  }
  if (message) return message
  return 'İşlem tamamlanamadı. Lütfen bilgileri kontrol edip tekrar deneyin.'
}

function getWizardSubmitErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>
    const message = candidate.message || candidate.error || candidate.code
    if (message) return String(message)
  }
  return null
}

type WizardValidationFieldError = {
  field: string
  message: string
}

function getWizardValidationFieldErrors(error: unknown): WizardValidationFieldError[] {
  const fields = findWizardValidationFields(error)
  return fields
    .map(formatWizardValidationFieldError)
    .filter((item): item is WizardValidationFieldError => Boolean(item))
}

function findWizardValidationFields(source: unknown): unknown[] {
  if (!source || typeof source !== 'object') return []
  const record = source as Record<string, unknown>
  const candidates = [
    record.fields,
    record.detail,
    record.details,
    isPlainObject(record.details) ? record.details.fields : undefined,
    isPlainObject(record.details) ? record.details.detail : undefined,
    isPlainObject(record.details) && isPlainObject(record.details.details) ? record.details.details.fields : undefined,
  ]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }
  return []
}

function formatWizardValidationFieldError(value: unknown): WizardValidationFieldError | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const field = formatWizardValidationField(record.loc || record.field || record.path)
  const message = formatWizardValidationMessage(record.msg || record.message || record.type)
  if (!field && !message) return null
  return {
    field: field || 'Alan',
    message: message || 'Kontrol edilmeli',
  }
}

function formatWizardValidationField(value: unknown) {
  const rawParts = Array.isArray(value) ? value : String(value || '').split('.')
  const parts = rawParts
    .map(part => String(part || '').trim())
    .filter(part => part && !['body', 'query', 'path'].includes(part))
  const field = parts[0] || ''
  const labels: Record<string, string> = {
    authority_types: 'Yetki tipleri',
    signature_type: 'Imza turu',
    effective_date: 'Yururluk tarihi',
    end_date: 'Bitis tarihi',
    document_files: 'Belgeler',
    authority_documents: 'Yetki belgeleri',
    gib_permissions: 'GIB yetkileri',
    sgk_permissions: 'SGK yetkileri',
    scope_type: 'Kapsam turu',
    branch_id: 'Sube',
    organization_unit_id: 'Organizasyon birimi',
    facility_id: 'Tesis/lokasyon',
  }
  return labels[field] || parts.join('.')
}

function formatWizardValidationMessage(value: unknown) {
  const message = String(value || '').trim()
  const normalized = message.toLocaleLowerCase('tr-TR')
  if (!message) return ''
  if (normalized.includes('field required')) return 'zorunlu alan eksik'
  if (normalized.includes('valid list')) return 'liste formatinda olmali'
  if (normalized.includes('valid dictionary')) return 'nesne formatinda olmali'
  if (normalized.includes('valid number')) return 'sayisal deger olmali'
  if (normalized.includes('valid date')) return 'gecerli tarih olmali'
  if (normalized.includes('valid string')) return 'metin formatinda olmali'
  if (normalized.includes('value_error')) return 'alan kurali saglanmadi'
  return message
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
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
    const disabled = !!field.disabled || (!!field.disabledWhen && matchesWizardCondition(field.disabledWhen, form))
    if (disabled || !matchesWizardCondition(field.visibleWhen, form)) return true
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
