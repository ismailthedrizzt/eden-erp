'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type * as React from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  HelpCircle,
  Info,
  Link2,
  Loader2,
  Upload,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formControlClass } from './formControlStyles'
import { apiClient } from '@/lib/api/apiClient'
import {
  RecordLifecycleWizard,
  type RecordLifecycleWizardStep,
} from './RecordLifecycleWizard'
import {
  DURATION_TYPE_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  GROSS_NET_OPTIONS,
  isCompanySgk,
  optionLabel,
  PAYMENT_PERIOD_OPTIONS,
  PAYMENT_TYPE_OPTIONS,
  SGK_RESPONSIBILITY_OPTIONS,
  sgkResponsibilityLabel,
  WORK_ARRANGEMENT_OPTIONS,
  YES_NO_OPTIONS,
  normalizeSgkResponsibility,
  type LifecycleOption,
} from '@/lib/modules/employees/workLifecycle'

type WizardType = 'entry' | 'exit'

type Props = {
  type: WizardType
  employee: Record<string, any>
  onClose: () => void
  onComplete: (employee: Record<string, any>) => void
}

type WizardContext = {
  employee?: Record<string, any>
  workRelation?: Record<string, any> | null
  lifecycleEvents?: Array<Record<string, any>>
  references?: {
    companies?: Array<Record<string, any>>
    units?: Array<Record<string, any>>
    positions?: Array<Record<string, any>>
  }
  computedManagerText?: string
}

const ENTRY_STEPS = [
  {
    title: 'İstihdam Yapısı',
    description: 'Çalışanın çalışma rejimi, SGK sorumlusu ve başlangıç tarihi netleştirilir.',
  },
  {
    title: 'ERP Bağlantıları',
    description: 'Şirket, teşkilat birimi, kadro, lokasyon ve rejime göre öne çıkan bağlantılar seçilir.',
  },
  {
    title: 'İlave Bilgi ve Belgeler',
    description: 'SGK, staj, sözleşme, denizcilik, ücret ve çalışma düzeni bilgileri koşullu olarak alınır.',
  },
  {
    title: 'Onay ve Aktivasyon',
    description: 'Özet kontrol edilir; SGK sorumluluğuna göre çalışan aktif hale getirilir.',
  },
]

const EXIT_STEPS = [
  {
    title: 'Çıkış Bilgisi',
    description: 'İlişki sonlandırma tarihi, nedeni ve çıkış türü belirlenir.',
  },
  {
    title: 'Rejime Göre Kapanış',
    description: 'Mevcut çalışma rejimine göre SGK, staj, sözleşme veya denizcilik kapanışı alınır.',
  },
  {
    title: 'Belgeler ve Devir',
    description: 'Son ödeme, hakediş, zimmet ve kapanış belgeleri Document Registry ile bağlanır.',
  },
  {
    title: 'Onay ve Pasifleştirme',
    description: 'Çıkış özeti kontrol edilir; çalışan pasif duruma alınır.',
  },
]

const CURRENCY_OPTIONS: LifecycleOption[] = [
  { value: 'TRY', label: 'TRY' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
]

const EXIT_TYPE_OPTIONS: LifecycleOption[] = [
  { value: 'sgk_exit', label: 'SGK çıkışı', description: 'SGK bildirimi şirket tarafından yapılan çalışanlar için önerilir.' },
  { value: 'internship_completed', label: 'Staj tamamlandı / sonlandırıldı', description: 'Stajyer veya okul SGK sorumluluğu olan kişiler için önerilir.' },
  { value: 'contract_terminated', label: 'Sözleşme sonlandırıldı', description: 'Sözleşmeli, dış hizmet veya freelancer ilişkileri için önerilir.' },
  { value: 'marine_contract_closed', label: 'Sefer / kontrat kapandı', description: 'Deniz personeli veya sefer bazlı çalışma için önerilir.' },
  { value: 'other', label: 'Diğer' },
]

const CONTRACT_TYPE_OPTIONS: LifecycleOption[] = [
  { value: 'fixed_term', label: 'Süreli' },
  { value: 'indefinite', label: 'Süresiz' },
  { value: 'project', label: 'Proje Bazlı' },
  { value: 'voyage', label: 'Sefer Bazlı' },
  { value: 'service', label: 'Hizmet Sözleşmesi' },
]

const INTERNSHIP_TYPE_OPTIONS: LifecycleOption[] = [
  { value: 'mandatory', label: 'Zorunlu Staj' },
  { value: 'voluntary', label: 'Gönüllü Staj' },
  { value: 'vocational', label: 'Mesleki Eğitim' },
  { value: 'summer', label: 'Yaz Stajı' },
]

const STATUS_OPTIONS: LifecycleOption[] = [
  { value: 'pending', label: 'Bekliyor' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'not_required', label: 'Gerekli Değil' },
]

export function EmployeeLifecycleWizard({ type, employee, onClose, onComplete }: Props) {
  const entry = type === 'entry'
  const steps = entry ? ENTRY_STEPS : EXIT_STEPS
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [contextLoading, setContextLoading] = useState(true)
  const [contextError, setContextError] = useState('')
  const [error, setError] = useState('')
  const [manualSgkOpen, setManualSgkOpen] = useState(false)
  const [form, setForm] = useState<Record<string, any>>(() => initialForm(employee, type))
  const [manualSgk, setManualSgk] = useState<Record<string, any>>(() => initialManualSgk(type, employee))
  const [context, setContext] = useState<WizardContext>({})

  useEffect(() => {
    let cancelled = false
    setContextLoading(true)
    setContextError('')

    apiClient.get<{ data: WizardContext }>(`/api/employees/${employee.id}/${entry ? 'entry-wizard' : 'exit-wizard'}/context`, { useCache: false })
      .then(payload => payload.data)
      .then((payload: WizardContext) => {
        if (cancelled) return
        setContext(payload)
        setForm(previous => mergeContextIntoForm(previous, payload, type))
      })
      .catch(err => {
        if (!cancelled) setContextError(err instanceof Error ? err.message : 'Wizard bağlamı yüklenemedi')
      })
      .finally(() => {
        if (!cancelled) setContextLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [employee.id, entry, type])

  const companySgk = isCompanySgk(form.sgk_responsibility)
  const referenceOptions = useMemo(() => buildReferenceOptions(context, form), [context, form.company_id, form.company_unit_id])
  const regime = useMemo(() => deriveRegime(form, context.workRelation || employee), [form, context.workRelation, employee])
  const summary = useMemo(() => entry ? buildEntrySummary(form, manualSgk, referenceOptions) : buildExitSummary(form, manualSgk, context.workRelation || {}), [entry, form, manualSgk, referenceOptions, context.workRelation])
  const title = entry ? 'İşe Giriş Yap' : 'İşten Çıkış Yap'
  const isLastStep = step === steps.length - 1

  const commit = async (manual = false) => {
    setSaving(true)
    setError('')
    try {
      const endpoint = `/api/employees/${employee.id}/${entry ? 'entry-wizard' : 'exit-wizard'}/${manual ? 'complete-with-manual-sgk' : 'complete'}`
      const payload = await apiClient.post<{ data: Record<string, any> }>(endpoint, { ...form, manual_sgk: manualSgk })
      onComplete(payload.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İşlem tamamlanamadı')
    } finally {
      setSaving(false)
    }
  }

  const next = () => {
    setError('')
    if (!isLastStep) {
      setStep(current => current + 1)
      return
    }
    commit(false)
  }

  const wizardSteps = useMemo(
    () => buildEmployeeLifecycleWizardSteps({
      entry,
      form,
      references: referenceOptions,
      regime,
      workRelation: context.workRelation || {},
      computedManagerText: context.computedManagerText,
    }),
    [entry, form, referenceOptions, regime, context.workRelation, context.computedManagerText]
  )
  const manualSgkComplete = type === 'entry'
    ? Boolean(manualSgk.sgk_entry_date && manualSgk.sgk_entry_reference_no)
    : Boolean(manualSgk.sgk_exit_date && manualSgk.sgk_exit_reference_no)
  const handleWizardFieldChange = (field: string, value: any, previous: Record<string, any>) => {
    const nextForm = { ...previous, [field]: value }
    if (field === 'company_id') {
      nextForm.company_unit_id = ''
      nextForm.position_id = ''
    }
    if (field === 'company_unit_id') {
      nextForm.position_id = ''
    }
    return nextForm
  }
  const finalContent = (
    <SectionCard title={entry ? 'Ä°ÅŸe GiriÅŸ Ã–zeti' : 'Ä°ÅŸten Ã‡Ä±kÄ±ÅŸ Ã–zeti'} description="Tamamlamadan Ã¶nce alanlarÄ± kontrol edin.">
      <div className="grid gap-3 md:grid-cols-2">
        {summary.map(([label, value]) => (
          <SummaryItem key={label} label={label} value={value} />
        ))}
      </div>

      {companySgk && (
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-950 dark:bg-blue-950/20">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled
              title="SGK entegrasyonu devam ediyor. Bu Ã¶zellik tamamlandÄ±ÄŸÄ±nda aktif olacaktÄ±r."
              className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-500 opacity-80 dark:bg-gray-800 dark:text-gray-400"
            >
              {entry ? 'SGKâ€™ya GÃ¶nder' : 'SGKâ€™ya Ã‡Ä±kÄ±ÅŸ GÃ¶nder'}
              <HelpCircle size={15} />
            </button>
            <button
              type="button"
              onClick={() => setManualSgkOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <CheckCircle2 size={16} />
              {entry ? 'SGK GiriÅŸi YapÄ±ldÄ±' : 'SGK Ã‡Ä±kÄ±ÅŸÄ± YapÄ±ldÄ±'}
            </button>
          </div>
          <p className="mt-2 text-xs text-blue-700 dark:text-blue-200">
            SGK sorumlusu ÅŸirket olduÄŸu iÃ§in sÃ¼reÃ§ manuel SGK bilgileri girilerek tamamlanÄ±r.
          </p>

          {manualSgkOpen && (
            <div className="mt-4 rounded-xl border border-white bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-gray-950 dark:text-white">
                    {entry ? 'Manuel SGK GiriÅŸ Bilgileri' : 'Manuel SGK Ã‡Ä±kÄ±ÅŸ Bilgileri'}
                  </h4>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    e-Devlet / SGK ekranÄ±nda tamamlanan bildirimin referans bilgilerini girin.
                  </p>
                </div>
                <button type="button" onClick={() => setManualSgkOpen(false)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X size={16} />
                </button>
              </div>
              <ManualSgkFields type={type} value={manualSgk} setValue={setManualSgk} />
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => commit(true)}
                  disabled={saving || !manualSgkComplete}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {entry ? 'SGK Bilgisiyle AktifleÅŸtir' : 'SGK Bilgisiyle PasifleÅŸtir'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  )

  return (
    <RecordLifecycleWizard
      title={title}
      subtitle={[employee.first_name, employee.last_name].filter(Boolean).join(' ') || 'Ã‡alÄ±ÅŸan'}
      steps={wizardSteps}
      form={form}
      setForm={setForm}
      onFieldChange={handleWizardFieldChange}
      onClose={onClose}
      onSubmit={() => commit(false)}
      submitLabel={entry ? 'Tamamla' : 'Ä°ÅŸten Ã‡Ä±kÄ±ÅŸÄ± Tamamla'}
      saving={saving}
      loadingMessage={contextLoading ? 'Wizard baÄŸlamÄ± yÃ¼kleniyor' : undefined}
      contextError={contextError}
      error={error}
      sideInfo="Veriler son adÄ±ma kadar sadece wizard iÃ§inde tutulur. Tamamlama aksiyonu tek backend payload'u gÃ¶nderir."
      finalContent={finalContent}
      submitBlockedContent={companySgk ? 'SGK sorumlusu ÅŸirket olduÄŸu iÃ§in manuel SGK bilgisiyle tamamlayÄ±n.' : undefined}
    />
  )

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/45 p-0 sm:p-4">
      <div className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-950 sm:max-w-6xl sm:rounded-2xl">
        <div className="border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-300">
                {step + 1} / {steps.length} — {steps[step].title}
              </div>
              <h3 className="mt-1 text-lg font-semibold text-gray-950 dark:text-white">{title}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {[employee.first_name, employee.last_name].filter(Boolean).join(' ') || 'Çalışan'}
              </p>
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
                  key={item.title}
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
                  <p className="mt-1 pl-7 text-xs leading-5 opacity-80">{item.description}</p>
                </li>
              ))}
            </ol>
            <InfoPanel className="mt-4">
              Veriler son adıma kadar sadece wizard içinde tutulur. Tamamlama aksiyonu tek backend payload&apos;u gönderir.
            </InfoPanel>
          </aside>

          <main className="min-h-0 overflow-auto p-5">
            {contextLoading && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-950 dark:bg-blue-950/30 dark:text-blue-200">
                <Loader2 size={16} className="animate-spin" />
                Wizard bağlamı yükleniyor
              </div>
            )}
            {contextError && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-950 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertCircle size={16} className="mt-0.5" />
                <span>{contextError}</span>
              </div>
            )}

            <div className="mx-auto max-w-5xl">
              {entry
                ? renderEntryStep(step, form, setForm, referenceOptions, regime, context.computedManagerText)
                : renderExitStep(step, form, setForm, referenceOptions, regime, context.workRelation || {})}

              {isLastStep && (
                <SectionCard title={entry ? 'İşe Giriş Özeti' : 'İşten Çıkış Özeti'} description="Tamamlamadan önce alanları kontrol edin.">
                  <div className="grid gap-3 md:grid-cols-2">
                    {summary.map(([label, value]) => (
                      <SummaryItem key={label} label={label} value={value} />
                    ))}
                  </div>

                  {companySgk && (
                    <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-950 dark:bg-blue-950/20">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled
                          title="SGK entegrasyonu devam ediyor. Bu özellik tamamlandığında aktif olacaktır."
                          className="inline-flex items-center gap-2 rounded-lg bg-gray-200 px-3 py-2 text-sm font-medium text-gray-500 opacity-80 dark:bg-gray-800 dark:text-gray-400"
                        >
                          {entry ? 'SGK’ya Gönder' : 'SGK’ya Çıkış Gönder'}
                          <HelpCircle size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setManualSgkOpen(true)}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          <CheckCircle2 size={16} />
                          {entry ? 'SGK Girişi Yapıldı' : 'SGK Çıkışı Yapıldı'}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-blue-700 dark:text-blue-200">
                        SGK sorumlusu şirket olduğu için süreç manuel SGK bilgileri girilerek tamamlanır.
                      </p>

                      {manualSgkOpen && (
                        <div className="mt-4 rounded-xl border border-white bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-semibold text-gray-950 dark:text-white">
                                {entry ? 'Manuel SGK Giriş Bilgileri' : 'Manuel SGK Çıkış Bilgileri'}
                              </h4>
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                e-Devlet / SGK ekranında tamamlanan bildirimin referans bilgilerini girin.
                              </p>
                            </div>
                            <button type="button" onClick={() => setManualSgkOpen(false)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                              <X size={16} />
                            </button>
                          </div>
                          <ManualSgkFields type={type} value={manualSgk} setValue={setManualSgk} />
                          <div className="mt-4 flex justify-end">
                            <button
                              type="button"
                              onClick={() => commit(true)}
                              disabled={saving}
                              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              {saving && <Loader2 size={16} className="animate-spin" />}
                              {entry ? 'SGK Bilgisiyle Aktifleştir' : 'SGK Bilgisiyle Pasifleştir'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </SectionCard>
              )}

              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-200">
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
              onClick={next}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Devam
              <ChevronRight size={16} />
            </button>
          ) : !companySgk ? (
            <button
              type="button"
              onClick={next}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {entry ? 'Tamamla' : 'İşten Çıkışı Tamamla'}
            </button>
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              SGK sorumlusu şirket olduğu için manuel SGK bilgisiyle tamamlayın.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function buildEmployeeLifecycleWizardSteps({
  entry,
  form,
  references,
  regime,
  workRelation,
  computedManagerText,
}: {
  entry: boolean
  form: Record<string, any>
  references: ReturnType<typeof buildReferenceOptions>
  regime: ReturnType<typeof deriveRegime>
  workRelation: Record<string, any>
  computedManagerText?: string
}): RecordLifecycleWizardStep[] {
  return entry
    ? buildEntryLifecycleWizardSteps(form, references, regime, computedManagerText)
    : buildExitLifecycleWizardSteps(form, references, regime, workRelation)
}

function buildEntryLifecycleWizardSteps(
  form: Record<string, any>,
  references: ReturnType<typeof buildReferenceOptions>,
  regime: ReturnType<typeof deriveRegime>,
  computedManagerText?: string
): RecordLifecycleWizardStep[] {
  return [
    {
      id: 'employment-structure',
      ...ENTRY_STEPS[0],
      sections: [
        {
          id: 'employment-type',
          title: 'Ä°stihdam Tipi',
          description: 'DoÄŸru rejim seÃ§imi sonraki adÄ±mlardaki alanlarÄ± belirler.',
          fields: [
            { name: 'employment_type', label: 'Ä°stihdam Tipi', type: 'optionCards', required: true, colSpan: 3, options: EMPLOYMENT_TYPE_OPTIONS },
          ],
        },
        {
          id: 'work-regime',
          title: 'Ã‡alÄ±ÅŸma Rejimi',
          description: 'SGK sorumlusu ve Ã§alÄ±ÅŸma dÃ¼zeni aktivasyon kuralÄ±nÄ± etkiler.',
          fields: [
            { name: 'duration_type', label: 'SÃ¼re Tipi', type: 'select', required: true, options: DURATION_TYPE_OPTIONS },
            { name: 'sgk_responsibility', label: 'SGK Sorumlusu', type: 'select', required: true, options: SGK_RESPONSIBILITY_OPTIONS },
            { name: 'work_arrangement', label: 'Ã‡alÄ±ÅŸma DÃ¼zeni', type: 'select', required: true, options: WORK_ARRANGEMENT_OPTIONS },
            { name: 'start_date', label: 'Ä°ÅŸe BaÅŸlama Tarihi', type: 'date', required: true },
          ],
        },
      ],
    },
    {
      id: 'erp-links',
      ...ENTRY_STEPS[1],
      sections: [
        {
          id: 'organization-links',
          title: 'ERP BaÄŸlantÄ±larÄ±',
          description: 'BaÄŸlÄ± yÃ¶netici kullanÄ±cÄ±dan istenmez; teÅŸkilat ve kadro yapÄ±sÄ±ndan hesaplanÄ±r.',
          fields: [
            { name: 'company_id', label: 'Åirket', type: 'select', required: true, options: references.companyOptions },
            {
              name: 'company_unit_id',
              label: 'Birim',
              type: 'select',
              options: references.unitOptions,
              emptyOptionsRedirect: {
                href: '/app/sirket/teskilat',
                label: 'TeÅŸkilat modÃ¼lÃ¼ne git',
                message: 'Bu ÅŸirkete baÄŸlÄ± birim bulunamadÄ±. Birim tanÄ±mlamak iÃ§in TeÅŸkilat modÃ¼lÃ¼ne gidin.',
                visibleWhen: { field: 'company_id', operator: 'exists' },
              },
              automation: {
                sourceFields: ['company_id'],
                targetFields: ['company_unit_id'],
                title: 'Åirket seÃ§imine gÃ¶re teÅŸkilat birimleri sÃ¼zÃ¼lÃ¼r.',
                idleLabel: 'Åirket Bekleniyor',
                workingLabel: 'Birimler SÃ¼zÃ¼lÃ¼yor',
                doneLabel: 'Birim SeÃ§ildi',
                noDataLabel: 'Birim Bekleniyor',
              },
            },
            {
              name: 'position_id',
              label: 'Kadro / Pozisyon',
              type: 'select',
              options: references.positionOptions,
              disabledWhen: { field: 'company_unit_id', operator: 'notExists' },
              placeholder: form.company_unit_id ? 'Kadro seÃ§iniz' : 'Ã–nce birim seÃ§iniz',
              emptyOptionsRedirect: {
                href: '/app/sirket/teskilat',
                label: 'TeÅŸkilat modÃ¼lÃ¼ne git',
                message: 'SeÃ§ili birim altÄ±nda kadro/pozisyon bulunamadÄ±. Kadro tanÄ±mlamak iÃ§in TeÅŸkilat modÃ¼lÃ¼ne gidin.',
                visibleWhen: { field: 'company_unit_id', operator: 'exists' },
              },
              automation: {
                sourceFields: ['company_unit_id'],
                targetFields: ['position_id'],
                title: 'Birim seÃ§imine gÃ¶re kadro listesi teÅŸkilat modÃ¼lÃ¼nden sÃ¼zÃ¼lÃ¼r.',
                idleLabel: 'Birim Bekleniyor',
                workingLabel: 'Kadro SÃ¼zÃ¼lÃ¼yor',
                doneLabel: 'Kadro SeÃ§ildi',
                noDataLabel: 'Kadro Bekleniyor',
              },
            },
            { name: 'work_location_id', label: 'Ã‡alÄ±ÅŸma Lokasyonu', type: 'text', highlight: regime.fieldWork },
            { name: 'cost_center_id', label: 'Masraf Merkezi', type: 'text' },
            { name: 'project_id', label: 'Proje', type: 'text', highlight: regime.projectBased },
            { name: 'shift_group_id', label: 'Vardiya Grubu', type: 'text', highlight: regime.shiftBased },
            { name: 'vessel_or_platform_id', label: 'Gemi / Platform', type: 'text', highlight: regime.marine },
          ],
          children: (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
              {computedManagerText || 'BaÄŸlÄ± YÃ¶netici: TeÅŸkilat yapÄ±sÄ±ndan otomatik belirlenecek'}
            </div>
          ),
        },
      ],
    },
    {
      id: 'additional-info',
      ...ENTRY_STEPS[2],
      sections: [
        ...(isCompanySgk(form.sgk_responsibility) ? [{
          id: 'sgk-entry',
          title: 'SGK Ä°ÅŸe GiriÅŸ Bilgileri',
          description: 'Åirket sorumlu olduÄŸunda SGK alanlarÄ± ve son adÄ±mda manuel tamamlamaya ait bilgiler alÄ±nÄ±r.',
          fields: [
            { name: 'sgk_entry_date', label: 'SGK Ä°ÅŸe GiriÅŸ Tarihi', type: 'date' },
            { name: 'insurance_branch', label: 'Sigorta Kolu', type: 'text' },
            { name: 'occupation_code', label: 'Meslek Kodu', type: 'text' },
            { name: 'duty_code', label: 'GÃ¶rev Kodu', type: 'text' },
            { name: 'csgb_work_branch', label: 'Ã‡SGB Ä°ÅŸ Kolu', type: 'text' },
            { name: 'disability_status', label: 'Engellilik Durumu', type: 'text' },
            { name: 'conviction_status', label: 'HÃ¼kÃ¼mlÃ¼lÃ¼k Durumu', type: 'text' },
            { name: 'education_code', label: 'Ã–ÄŸrenim Kodu', type: 'text' },
            { name: 'partial_day', label: 'KÄ±smi GÃ¼n', type: 'number' },
            { name: 'reference_code', label: 'Referans Kodu', type: 'text' },
          ],
        } satisfies RecordLifecycleWizardStep['sections'][number]] : []),
        ...(regime.internship ? [{
          id: 'internship',
          title: 'Staj Bilgileri',
          description: 'Okul veya Ã¼niversite SGK sorumluluÄŸu olduÄŸunda SGKâ€™ya gÃ¶nder aksiyonu gÃ¶sterilmez.',
          fields: [
            { name: 'school_or_university', label: 'Okul / Ãœniversite', type: 'text' },
            { name: 'department_or_program', label: 'BÃ¶lÃ¼m / Program', type: 'text' },
            { name: 'internship_type', label: 'Staj TÃ¼rÃ¼', type: 'select', options: INTERNSHIP_TYPE_OPTIONS },
            { name: 'internship_start_date', label: 'Staj BaÅŸlangÄ±Ã§ Tarihi', type: 'date' },
            { name: 'internship_end_date', label: 'Staj BitiÅŸ Tarihi', type: 'date' },
            { name: 'school_sgk_notification_status', label: 'Okul SGK Bildirimi Var mÄ±?', type: 'select', options: STATUS_OPTIONS },
            { name: 'school_coordinator', label: 'Sorumlu Ã–ÄŸretmen / KoordinatÃ¶r', type: 'text' },
            { name: 'internship_protocol_document_id', label: 'Staj SÃ¶zleÅŸmesi / Protokol', type: 'document', description: 'Document Registry kullanÄ±lÄ±r; aynÄ± belge tekrar yÃ¼klenmez, mevcut belge referanslanabilir.' },
            { name: 'school_sgk_document_id', label: 'Okul SGK Bildirge Belgesi', type: 'document', description: 'Document Registry kullanÄ±lÄ±r; aynÄ± belge tekrar yÃ¼klenmez, mevcut belge referanslanabilir.' },
          ],
        } satisfies RecordLifecycleWizardStep['sections'][number]] : []),
        ...(regime.contractual ? [{
          id: 'contractual',
          title: 'SÃ¶zleÅŸme / DÄ±ÅŸ Hizmet Bilgileri',
          description: 'SÃ¶zleÅŸme ve Ã¶deme baÄŸlantÄ±larÄ± bu grupta tutulur.',
          fields: [
            { name: 'contract_type', label: 'SÃ¶zleÅŸme TÃ¼rÃ¼', type: 'select', options: CONTRACT_TYPE_OPTIONS },
            { name: 'contract_start_date', label: 'SÃ¶zleÅŸme BaÅŸlangÄ±Ã§ Tarihi', type: 'date' },
            { name: 'contract_end_date', label: 'SÃ¶zleÅŸme BitiÅŸ Tarihi', type: 'date' },
            { name: 'service_type', label: 'Hizmet TÃ¼rÃ¼', type: 'text' },
            { name: 'invoice_required', label: 'Fatura Kesiyor mu?', type: 'select', options: YES_NO_OPTIONS },
            { name: 'account_card_id', label: 'Cari Kart BaÄŸlantÄ±sÄ±', type: 'text' },
            { name: 'payment_period', label: 'Ã–deme Periyodu', type: 'select', options: PAYMENT_PERIOD_OPTIONS },
            { name: 'contract_document_id', label: 'SÃ¶zleÅŸme Belgesi', type: 'document', description: 'Document Registry kullanÄ±lÄ±r; aynÄ± belge tekrar yÃ¼klenmez, mevcut belge referanslanabilir.' },
            { name: 'nda_document_id', label: 'NDA / KVKK Belgesi', type: 'document', description: 'Document Registry kullanÄ±lÄ±r; aynÄ± belge tekrar yÃ¼klenmez, mevcut belge referanslanabilir.' },
          ],
        } satisfies RecordLifecycleWizardStep['sections'][number]] : []),
        ...(regime.marine ? [{
          id: 'marine',
          title: 'Denizcilik / Sefer Bilgileri',
          description: 'Deniz personeli, sefer bazlÄ± sÃ¼re tipi veya Deniz / Gemi dÃ¼zeninde gÃ¶rÃ¼nÃ¼r.',
          fields: [
            { name: 'vessel_or_platform_id', label: 'Gemi / Platform', type: 'text' },
            { name: 'marine_rank', label: 'GÃ¶rev / Rank', type: 'text' },
            { name: 'voyage_based', label: 'Sefer BazlÄ± mÄ±?', type: 'select', options: YES_NO_OPTIONS },
            { name: 'marine_contract_start_date', label: 'Kontrat BaÅŸlangÄ±Ã§ Tarihi', type: 'date' },
            { name: 'marine_contract_end_date', label: 'Kontrat BitiÅŸ Tarihi', type: 'date' },
            { name: 'rotation_model', label: 'Rotasyon Modeli', type: 'text' },
            { name: 'sea_working_days', label: 'Denizde Ã‡alÄ±ÅŸma GÃ¼nleri', type: 'number' },
            { name: 'shore_waiting_days', label: 'Karada Bekleme GÃ¼nleri', type: 'number' },
            { name: 'marine_shift_model', label: 'Vardiya Modeli', type: 'text' },
            { name: 'seafarer_document_no', label: 'GemiadamÄ± CÃ¼zdanÄ± / Belge No', type: 'text' },
            { name: 'stcw_document_id', label: 'STCW Belgeleri', type: 'document', description: 'Document Registry kullanÄ±lÄ±r; aynÄ± belge tekrar yÃ¼klenmez, mevcut belge referanslanabilir.' },
            { name: 'marine_health_report_document_id', label: 'SaÄŸlÄ±k Raporu', type: 'document', description: 'Document Registry kullanÄ±lÄ±r; aynÄ± belge tekrar yÃ¼klenmez, mevcut belge referanslanabilir.' },
            { name: 'port_or_voyage_area', label: 'Liman / Sefer BÃ¶lgesi', type: 'text' },
          ],
        } satisfies RecordLifecycleWizardStep['sections'][number]] : []),
        buildWorkPaymentWizardSection(),
      ],
    },
    {
      id: 'confirm-entry',
      ...ENTRY_STEPS[3],
      sections: [],
    },
  ]
}

function buildExitLifecycleWizardSteps(
  form: Record<string, any>,
  references: ReturnType<typeof buildReferenceOptions>,
  regime: ReturnType<typeof deriveRegime>,
  workRelation: Record<string, any>
): RecordLifecycleWizardStep[] {
  void references
  return [
    {
      id: 'exit-info',
      ...EXIT_STEPS[0],
      sections: [
        {
          id: 'exit-fields',
          title: 'Ã‡Ä±kÄ±ÅŸ Bilgisi',
          description: 'Ã‡Ä±kÄ±ÅŸ tÃ¼rÃ¼ mevcut Ã§alÄ±ÅŸma rejimine gÃ¶re Ã¶nerilir, gerektiÄŸinde deÄŸiÅŸtirilebilir.',
          fields: [
            { name: 'exit_date', label: 'Ä°ÅŸten Ã‡Ä±kÄ±ÅŸ / Ä°liÅŸki SonlandÄ±rma Tarihi', type: 'date', required: true },
            { name: 'exit_reason', label: 'Ã‡Ä±kÄ±ÅŸ Nedeni', type: 'text', required: true },
            { name: 'exit_type', label: 'Ã‡Ä±kÄ±ÅŸ TÃ¼rÃ¼', type: 'select', options: EXIT_TYPE_OPTIONS },
          ],
          children: (
            <InfoPanel className="mt-4">
              Ã–neri: {recommendedExitTypeLabel(workRelation || form)}
            </InfoPanel>
          ),
        },
      ],
    },
    {
      id: 'regime-close',
      ...EXIT_STEPS[1],
      sections: [
        ...(isCompanySgk(form.sgk_responsibility || workRelation.sgk_responsibility) ? [{
          id: 'sgk-exit',
          title: 'SGK Ä°ÅŸten Ã‡Ä±kÄ±ÅŸ Bilgileri',
          description: 'Åirket sorumlu olduÄŸunda SGK Ã§Ä±kÄ±ÅŸÄ± entegrasyon hazÄ±r olana kadar manuel tamamlanÄ±r.',
          fields: [
            { name: 'sgk_exit_date', label: 'SGK Ä°ÅŸten Ã‡Ä±kÄ±ÅŸ Tarihi', type: 'date' },
            { name: 'sgk_exit_reason', label: 'SGK Ã‡Ä±kÄ±ÅŸ Nedeni', type: 'text' },
            { name: 'sgk_exit_occupation_code', label: 'Meslek Kodu', type: 'text' },
            { name: 'sgk_exit_csgb_work_branch', label: 'Ã‡SGB Ä°ÅŸ Kolu', type: 'text' },
            { name: 'sgk_exit_previous_document_type', label: 'Ã–nceki Belge TÃ¼rÃ¼', type: 'text' },
            { name: 'sgk_exit_previous_earned_wage', label: 'Ã–nceki Hak Edilen Ãœcret', type: 'text' },
            { name: 'sgk_exit_current_document_type', label: 'Bu DÃ¶nem Belge TÃ¼rÃ¼', type: 'text' },
            { name: 'sgk_exit_current_earned_wage', label: 'Bu DÃ¶nem Hak Edilen Ãœcret', type: 'text' },
            { name: 'sgk_exit_percentage_wage_method', label: 'Ãœcret YÃ¼zde UsulÃ¼', type: 'select', options: YES_NO_OPTIONS },
            { name: 'sgk_exit_reference_code', label: 'Referans Kodu', type: 'text' },
          ],
        } satisfies RecordLifecycleWizardStep['sections'][number]] : []),
        ...(regime.internship ? [{
          id: 'internship-close',
          title: 'Staj KapanÄ±ÅŸÄ±',
          description: 'Staj tamamlandÄ± veya sonlandÄ±rÄ±ldÄ± bilgisini okul bildirimiyle birlikte takip edin.',
          fields: [
            { name: 'internship_end_date', label: 'Staj BitiÅŸ Tarihi', type: 'date' },
            { name: 'internship_completed', label: 'Staj TamamlandÄ± mÄ±?', type: 'select', options: YES_NO_OPTIONS },
            { name: 'school_notified', label: 'Okula Bildirim YapÄ±ldÄ± mÄ±?', type: 'select', options: YES_NO_OPTIONS },
            { name: 'school_exit_document_id', label: 'Okul Ã‡Ä±kÄ±ÅŸ / Tamamlama Belgesi', type: 'document', description: 'Document Registry kullanÄ±lÄ±r; aynÄ± belge tekrar yÃ¼klenmez, mevcut belge referanslanabilir.' },
            { name: 'internship_evaluation_note', label: 'Staj DeÄŸerlendirme Notu', type: 'text' },
            { name: 'internship_termination_reason', label: 'Staj SonlandÄ±rma Nedeni', type: 'text' },
          ],
        } satisfies RecordLifecycleWizardStep['sections'][number]] : []),
        ...(regime.contractual ? [{
          id: 'contractual-close',
          title: 'SÃ¶zleÅŸme / DÄ±ÅŸ Hizmet KapanÄ±ÅŸÄ±',
          description: 'Cari, fatura, Ã¶deme ve devir durumlarÄ±nÄ± kapatÄ±n.',
          fields: [
            { name: 'contract_end_date', label: 'SÃ¶zleÅŸme BitiÅŸ Tarihi', type: 'date' },
            { name: 'actual_service_end_date', label: 'Fiili Hizmet BitiÅŸ Tarihi', type: 'date' },
            { name: 'termination_reason', label: 'SonlandÄ±rma Nedeni', type: 'text' },
            { name: 'last_invoice_status', label: 'Son Fatura Durumu', type: 'select', options: STATUS_OPTIONS },
            { name: 'last_payment_status', label: 'Son Ã–deme Durumu', type: 'select', options: STATUS_OPTIONS },
            { name: 'account_reconciliation_status', label: 'Cari Mutabakat Durumu', type: 'select', options: STATUS_OPTIONS },
            { name: 'service_handover_status', label: 'Teslim / Devir Durumu', type: 'select', options: STATUS_OPTIONS },
            { name: 'contract_closing_document_id', label: 'SÃ¶zleÅŸme KapanÄ±ÅŸ Belgesi', type: 'document', description: 'Document Registry kullanÄ±lÄ±r; aynÄ± belge tekrar yÃ¼klenmez, mevcut belge referanslanabilir.' },
          ],
        } satisfies RecordLifecycleWizardStep['sections'][number]] : []),
        ...(regime.marine ? [{
          id: 'marine-close',
          title: 'Denizcilik / Sefer KapanÄ±ÅŸÄ±',
          description: 'Sefer, kontrat ve gemi/platform ayrÄ±lÄ±ÅŸÄ± bilgileri birlikte kapatÄ±lÄ±r.',
          fields: [
            { name: 'marine_contract_end_date', label: 'Kontrat BitiÅŸ Tarihi', type: 'date' },
            { name: 'actual_leave_date', label: 'Fiili AyrÄ±lÄ±ÅŸ Tarihi', type: 'date' },
            { name: 'voyage_end_date', label: 'Sefer BitiÅŸ Tarihi', type: 'date' },
            { name: 'vessel_leave_date', label: 'Gemi / Platformdan AyrÄ±lÄ±ÅŸ Tarihi', type: 'date' },
            { name: 'departure_port', label: 'AyrÄ±lÄ±ÅŸ LimanÄ±', type: 'text' },
            { name: 'voyage_termination_reason', label: 'Sefer SonlandÄ±rma Nedeni', type: 'text' },
            { name: 'rotation_completed', label: 'Rotasyon TamamlandÄ± mÄ±?', type: 'select', options: YES_NO_OPTIONS },
            { name: 'marine_handover_status', label: 'Devir Teslim Durumu', type: 'select', options: STATUS_OPTIONS },
            { name: 'marine_documents_return_status', label: 'Denizcilik Belgeleri Ä°ade / Kontrol Durumu', type: 'select', options: STATUS_OPTIONS },
            { name: 'marine_health_note', label: 'SaÄŸlÄ±k / Uygunluk Notu', type: 'text' },
            { name: 'marine_final_earned_payment_status', label: 'Son HakediÅŸ Durumu', type: 'select', options: STATUS_OPTIONS },
          ],
        } satisfies RecordLifecycleWizardStep['sections'][number]] : []),
      ],
    },
    {
      id: 'documents-handover',
      ...EXIT_STEPS[2],
      sections: [
        {
          id: 'documents-handover-fields',
          title: 'Belgeler ve Devir',
          description: 'Belgeler Document Registry Ã¼zerinden referanslanÄ±r; aynÄ± belge tekrar yÃ¼klenmez.',
          fields: [
            { name: 'final_payment_status', label: 'Son Ã–deme Durumu', type: 'select', options: STATUS_OPTIONS },
            { name: 'earned_payment_status', label: 'HakediÅŸ Durumu', type: 'select', options: STATUS_OPTIONS },
            { name: 'handover_status', label: 'Zimmet / Devir Durumu', type: 'select', options: STATUS_OPTIONS },
            { name: 'documents_completed', label: 'Belgeler TamamlandÄ± mÄ±?', type: 'select', options: YES_NO_OPTIONS },
            { name: 'closing_document_id', label: 'KapanÄ±ÅŸ Belgesi', type: 'document', description: 'Document Registry kullanÄ±lÄ±r; aynÄ± belge tekrar yÃ¼klenmez, mevcut belge referanslanabilir.' },
            { name: 'notes', label: 'Notlar', type: 'textarea', colSpan: 2 },
          ],
        },
      ],
    },
    {
      id: 'confirm-exit',
      ...EXIT_STEPS[3],
      sections: [],
    },
  ]
}

function buildWorkPaymentWizardSection(): RecordLifecycleWizardStep['sections'][number] {
  return {
    id: 'work-payment',
    title: 'Ãœcret ve Ã‡alÄ±ÅŸma DÃ¼zeni',
    description: 'Bu alanlar tÃ¼m istihdam tipleri iÃ§in desteklenir.',
    fields: [
      { name: 'payment_type', label: 'Ãœcret Tipi', type: 'select', options: PAYMENT_TYPE_OPTIONS },
      { name: 'gross_net_type', label: 'BrÃ¼t / Net', type: 'select', options: GROSS_NET_OPTIONS },
      { name: 'currency', label: 'Para Birimi', type: 'select', options: CURRENCY_OPTIONS },
      { name: 'payment_period', label: 'Ã–deme Periyodu', type: 'select', options: PAYMENT_PERIOD_OPTIONS },
      { name: 'weekly_working_days', label: 'HaftalÄ±k Ã‡alÄ±ÅŸma GÃ¼nÃ¼', type: 'number' },
      { name: 'daily_working_hours', label: 'GÃ¼nlÃ¼k Ã‡alÄ±ÅŸma Saati', type: 'number' },
      ...workBooleanFields.map(field => ({
        name: field.field,
        label: field.label,
        placeholder: field.label,
        type: 'checkbox' as const,
      })),
    ],
  }
}

function renderEntryStep(
  step: number,
  form: Record<string, any>,
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>,
  references: ReturnType<typeof buildReferenceOptions>,
  regime: ReturnType<typeof deriveRegime>,
  computedManagerText?: string
) {
  if (step === 0) {
    return (
      <div className="space-y-4">
        <SectionCard title="İstihdam Tipi" description="Doğru rejim seçimi sonraki adımlardaki alanları belirler.">
          <OptionCardGroup field="employment_type" value={form.employment_type} options={EMPLOYMENT_TYPE_OPTIONS} setForm={setForm} />
        </SectionCard>
        <SectionCard title="Çalışma Rejimi" description="SGK sorumlusu ve çalışma düzeni aktivasyon kuralını etkiler.">
          <FieldGrid>
            <SelectField label="Süre Tipi" field="duration_type" value={form.duration_type} options={DURATION_TYPE_OPTIONS} setForm={setForm} required />
            <SelectField label="SGK Sorumlusu" field="sgk_responsibility" value={form.sgk_responsibility} options={SGK_RESPONSIBILITY_OPTIONS} setForm={setForm} required />
            <SelectField label="Çalışma Düzeni" field="work_arrangement" value={form.work_arrangement} options={WORK_ARRANGEMENT_OPTIONS} setForm={setForm} required />
            <InputField label="İşe Başlama Tarihi" field="start_date" type="date" value={form.start_date} setForm={setForm} required />
          </FieldGrid>
        </SectionCard>
      </div>
    )
  }

  if (step === 1) {
    return (
      <SectionCard title="ERP Bağlantıları" description="Bağlı yönetici kullanıcıdan istenmez; teşkilat ve kadro yapısından hesaplanır.">
        <FieldGrid>
          <SelectField label="Şirket" field="company_id" value={form.company_id} options={references.companyOptions} setForm={setForm} required />
          <SelectField label="Birim" field="company_unit_id" value={form.company_unit_id} options={references.unitOptions} setForm={setForm} />
          <SelectField label="Görev / Pozisyon" field="position_id" value={form.position_id} options={references.positionOptions} setForm={setForm} />
          <InputField label="Çalışma Lokasyonu" field="work_location_id" value={form.work_location_id} setForm={setForm} highlight={regime.fieldWork} />
          <InputField label="Masraf Merkezi" field="cost_center_id" value={form.cost_center_id} setForm={setForm} />
          <InputField label="Proje" field="project_id" value={form.project_id} setForm={setForm} highlight={regime.projectBased} />
          <InputField label="Vardiya Grubu" field="shift_group_id" value={form.shift_group_id} setForm={setForm} highlight={regime.shiftBased} />
          <InputField label="Gemi / Platform" field="vessel_or_platform_id" value={form.vessel_or_platform_id} setForm={setForm} highlight={regime.marine} />
        </FieldGrid>
        <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          {computedManagerText || 'Bağlı Yönetici: Teşkilat yapısından otomatik belirlenecek'}
        </div>
      </SectionCard>
    )
  }

  if (step === 2) {
    return (
      <div className="space-y-4">
        {isCompanySgk(form.sgk_responsibility) && (
          <SectionCard title="SGK İşe Giriş Bilgileri" description="Şirket sorumlu olduğunda SGK alanları ve son adımda manuel tamamlamaya ait bilgiler alınır.">
            <FieldGrid>
              <InputField label="SGK İşe Giriş Tarihi" field="sgk_entry_date" type="date" value={form.sgk_entry_date} setForm={setForm} />
              <InputField label="Sigorta Kolu" field="insurance_branch" value={form.insurance_branch} setForm={setForm} />
              <InputField label="Meslek Kodu" field="occupation_code" value={form.occupation_code} setForm={setForm} />
              <InputField label="Görev Kodu" field="duty_code" value={form.duty_code} setForm={setForm} />
              <InputField label="ÇSGB İş Kolu" field="csgb_work_branch" value={form.csgb_work_branch} setForm={setForm} />
              <InputField label="Engellilik Durumu" field="disability_status" value={form.disability_status} setForm={setForm} />
              <InputField label="Hükümlülük Durumu" field="conviction_status" value={form.conviction_status} setForm={setForm} />
              <InputField label="Öğrenim Kodu" field="education_code" value={form.education_code} setForm={setForm} />
              <InputField label="Kısmi Gün" field="partial_day" type="number" value={form.partial_day} setForm={setForm} />
              <InputField label="Referans Kodu" field="reference_code" value={form.reference_code} setForm={setForm} />
            </FieldGrid>
          </SectionCard>
        )}

        {regime.internship && (
          <SectionCard title="Staj Bilgileri" description="Okul veya üniversite SGK sorumluluğu olduğunda SGK’ya gönder aksiyonu gösterilmez.">
            <FieldGrid>
              <InputField label="Okul / Üniversite" field="school_or_university" value={form.school_or_university} setForm={setForm} />
              <InputField label="Bölüm / Program" field="department_or_program" value={form.department_or_program} setForm={setForm} />
              <SelectField label="Staj Türü" field="internship_type" value={form.internship_type} options={INTERNSHIP_TYPE_OPTIONS} setForm={setForm} />
              <InputField label="Staj Başlangıç Tarihi" field="internship_start_date" type="date" value={form.internship_start_date} setForm={setForm} />
              <InputField label="Staj Bitiş Tarihi" field="internship_end_date" type="date" value={form.internship_end_date} setForm={setForm} />
              <SelectField label="Okul SGK Bildirimi Var mı?" field="school_sgk_notification_status" value={form.school_sgk_notification_status} options={STATUS_OPTIONS} setForm={setForm} />
              <InputField label="Sorumlu Öğretmen / Koordinatör" field="school_coordinator" value={form.school_coordinator} setForm={setForm} />
              <DocumentRegistryField label="Staj Sözleşmesi / Protokol" field="internship_protocol_document_id" value={form.internship_protocol_document_id} setForm={setForm} />
              <DocumentRegistryField label="Okul SGK Bildirge Belgesi" field="school_sgk_document_id" value={form.school_sgk_document_id} setForm={setForm} />
            </FieldGrid>
          </SectionCard>
        )}

        {regime.contractual && (
          <SectionCard title="Sözleşme / Dış Hizmet Bilgileri" description="Sözleşme ve ödeme bağlantıları bu grupta tutulur.">
            <FieldGrid>
              <SelectField label="Sözleşme Türü" field="contract_type" value={form.contract_type} options={CONTRACT_TYPE_OPTIONS} setForm={setForm} />
              <InputField label="Sözleşme Başlangıç Tarihi" field="contract_start_date" type="date" value={form.contract_start_date} setForm={setForm} />
              <InputField label="Sözleşme Bitiş Tarihi" field="contract_end_date" type="date" value={form.contract_end_date} setForm={setForm} />
              <InputField label="Hizmet Türü" field="service_type" value={form.service_type} setForm={setForm} />
              <SelectField label="Fatura Kesiyor mu?" field="invoice_required" value={form.invoice_required} options={YES_NO_OPTIONS} setForm={setForm} />
              <InputField label="Cari Kart Bağlantısı" field="account_card_id" value={form.account_card_id} setForm={setForm} />
              <SelectField label="Ödeme Periyodu" field="payment_period" value={form.payment_period} options={PAYMENT_PERIOD_OPTIONS} setForm={setForm} />
              <DocumentRegistryField label="Sözleşme Belgesi" field="contract_document_id" value={form.contract_document_id} setForm={setForm} />
              <DocumentRegistryField label="NDA / KVKK Belgesi" field="nda_document_id" value={form.nda_document_id} setForm={setForm} />
            </FieldGrid>
          </SectionCard>
        )}

        {regime.marine && (
          <SectionCard title="Denizcilik / Sefer Bilgileri" description="Deniz personeli, sefer bazlı süre tipi veya Deniz / Gemi düzeninde görünür.">
            <FieldGrid>
              <InputField label="Gemi / Platform" field="vessel_or_platform_id" value={form.vessel_or_platform_id} setForm={setForm} />
              <InputField label="Görev / Rank" field="marine_rank" value={form.marine_rank} setForm={setForm} />
              <SelectField label="Sefer Bazlı mı?" field="voyage_based" value={form.voyage_based} options={YES_NO_OPTIONS} setForm={setForm} />
              <InputField label="Kontrat Başlangıç Tarihi" field="marine_contract_start_date" type="date" value={form.marine_contract_start_date} setForm={setForm} />
              <InputField label="Kontrat Bitiş Tarihi" field="marine_contract_end_date" type="date" value={form.marine_contract_end_date} setForm={setForm} />
              <InputField label="Rotasyon Modeli" field="rotation_model" value={form.rotation_model} setForm={setForm} />
              <InputField label="Denizde Çalışma Günleri" field="sea_working_days" type="number" value={form.sea_working_days} setForm={setForm} />
              <InputField label="Karada Bekleme Günleri" field="shore_waiting_days" type="number" value={form.shore_waiting_days} setForm={setForm} />
              <InputField label="Vardiya Modeli" field="marine_shift_model" value={form.marine_shift_model} setForm={setForm} />
              <InputField label="Gemiadamı Cüzdanı / Belge No" field="seafarer_document_no" value={form.seafarer_document_no} setForm={setForm} />
              <DocumentRegistryField label="STCW Belgeleri" field="stcw_document_id" value={form.stcw_document_id} setForm={setForm} />
              <DocumentRegistryField label="Sağlık Raporu" field="marine_health_report_document_id" value={form.marine_health_report_document_id} setForm={setForm} />
              <InputField label="Liman / Sefer Bölgesi" field="port_or_voyage_area" value={form.port_or_voyage_area} setForm={setForm} />
            </FieldGrid>
          </SectionCard>
        )}

        <WorkPaymentSection form={form} setForm={setForm} />
      </div>
    )
  }

  return null
}

function renderExitStep(
  step: number,
  form: Record<string, any>,
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>,
  references: ReturnType<typeof buildReferenceOptions>,
  regime: ReturnType<typeof deriveRegime>,
  workRelation: Record<string, any>
) {
  if (step === 0) {
    return (
      <SectionCard title="Çıkış Bilgisi" description="Çıkış türü mevcut çalışma rejimine göre önerilir, gerektiğinde değiştirilebilir.">
        <FieldGrid>
          <InputField label="İşten Çıkış / İlişki Sonlandırma Tarihi" field="exit_date" type="date" value={form.exit_date} setForm={setForm} required />
          <InputField label="Çıkış Nedeni" field="exit_reason" value={form.exit_reason} setForm={setForm} required />
          <SelectField label="Çıkış Türü" field="exit_type" value={form.exit_type} options={EXIT_TYPE_OPTIONS} setForm={setForm} />
        </FieldGrid>
        <InfoPanel className="mt-4">
          Öneri: {recommendedExitTypeLabel(workRelation || form)}
        </InfoPanel>
      </SectionCard>
    )
  }

  if (step === 1) {
    return (
      <div className="space-y-4">
        {isCompanySgk(form.sgk_responsibility || workRelation.sgk_responsibility) && (
          <SectionCard title="SGK İşten Çıkış Bilgileri" description="Şirket sorumlu olduğunda SGK çıkışı entegrasyon hazır olana kadar manuel tamamlanır.">
            <FieldGrid>
              <InputField label="SGK İşten Çıkış Tarihi" field="sgk_exit_date" type="date" value={form.sgk_exit_date || form.exit_date} setForm={setForm} />
              <InputField label="SGK Çıkış Nedeni" field="sgk_exit_reason" value={form.sgk_exit_reason || form.exit_reason} setForm={setForm} />
              <InputField label="Meslek Kodu" field="sgk_exit_occupation_code" value={form.sgk_exit_occupation_code} setForm={setForm} />
              <InputField label="ÇSGB İş Kolu" field="sgk_exit_csgb_work_branch" value={form.sgk_exit_csgb_work_branch} setForm={setForm} />
              <InputField label="Önceki Belge Türü" field="sgk_exit_previous_document_type" value={form.sgk_exit_previous_document_type} setForm={setForm} />
              <InputField label="Önceki Hak Edilen Ücret" field="sgk_exit_previous_earned_wage" value={form.sgk_exit_previous_earned_wage} setForm={setForm} />
              <InputField label="Bu Dönem Belge Türü" field="sgk_exit_current_document_type" value={form.sgk_exit_current_document_type} setForm={setForm} />
              <InputField label="Bu Dönem Hak Edilen Ücret" field="sgk_exit_current_earned_wage" value={form.sgk_exit_current_earned_wage} setForm={setForm} />
              <SelectField label="Ücret Yüzde Usulü" field="sgk_exit_percentage_wage_method" value={form.sgk_exit_percentage_wage_method} options={YES_NO_OPTIONS} setForm={setForm} />
              <InputField label="Referans Kodu" field="sgk_exit_reference_code" value={form.sgk_exit_reference_code} setForm={setForm} />
            </FieldGrid>
          </SectionCard>
        )}

        {regime.internship && (
          <SectionCard title="Staj Kapanışı" description="Staj tamamlandı veya sonlandırıldı bilgisini okul bildirimiyle birlikte takip edin.">
            <FieldGrid>
              <InputField label="Staj Bitiş Tarihi" field="internship_end_date" type="date" value={form.internship_end_date || form.exit_date} setForm={setForm} />
              <SelectField label="Staj Tamamlandı mı?" field="internship_completed" value={form.internship_completed} options={YES_NO_OPTIONS} setForm={setForm} />
              <SelectField label="Okula Bildirim Yapıldı mı?" field="school_notified" value={form.school_notified} options={YES_NO_OPTIONS} setForm={setForm} />
              <DocumentRegistryField label="Okul Çıkış / Tamamlama Belgesi" field="school_exit_document_id" value={form.school_exit_document_id} setForm={setForm} />
              <InputField label="Staj Değerlendirme Notu" field="internship_evaluation_note" value={form.internship_evaluation_note} setForm={setForm} />
              <InputField label="Staj Sonlandırma Nedeni" field="internship_termination_reason" value={form.internship_termination_reason || form.exit_reason} setForm={setForm} />
            </FieldGrid>
          </SectionCard>
        )}

        {regime.contractual && (
          <SectionCard title="Sözleşme / Dış Hizmet Kapanışı" description="Cari, fatura, ödeme ve devir durumlarını kapatın.">
            <FieldGrid>
              <InputField label="Sözleşme Bitiş Tarihi" field="contract_end_date" type="date" value={form.contract_end_date || form.exit_date} setForm={setForm} />
              <InputField label="Fiili Hizmet Bitiş Tarihi" field="actual_service_end_date" type="date" value={form.actual_service_end_date || form.exit_date} setForm={setForm} />
              <InputField label="Sonlandırma Nedeni" field="termination_reason" value={form.termination_reason || form.exit_reason} setForm={setForm} />
              <SelectField label="Son Fatura Durumu" field="last_invoice_status" value={form.last_invoice_status} options={STATUS_OPTIONS} setForm={setForm} />
              <SelectField label="Son Ödeme Durumu" field="last_payment_status" value={form.last_payment_status} options={STATUS_OPTIONS} setForm={setForm} />
              <SelectField label="Cari Mutabakat Durumu" field="account_reconciliation_status" value={form.account_reconciliation_status} options={STATUS_OPTIONS} setForm={setForm} />
              <SelectField label="Teslim / Devir Durumu" field="service_handover_status" value={form.service_handover_status} options={STATUS_OPTIONS} setForm={setForm} />
              <DocumentRegistryField label="Sözleşme Kapanış Belgesi" field="contract_closing_document_id" value={form.contract_closing_document_id} setForm={setForm} />
            </FieldGrid>
          </SectionCard>
        )}

        {regime.marine && (
          <SectionCard title="Denizcilik / Sefer Kapanışı" description="Sefer, kontrat ve gemi/platform ayrılışı bilgileri birlikte kapatılır.">
            <FieldGrid>
              <InputField label="Kontrat Bitiş Tarihi" field="marine_contract_end_date" type="date" value={form.marine_contract_end_date || form.exit_date} setForm={setForm} />
              <InputField label="Fiili Ayrılış Tarihi" field="actual_leave_date" type="date" value={form.actual_leave_date || form.exit_date} setForm={setForm} />
              <InputField label="Sefer Bitiş Tarihi" field="voyage_end_date" type="date" value={form.voyage_end_date} setForm={setForm} />
              <InputField label="Gemi / Platformdan Ayrılış Tarihi" field="vessel_leave_date" type="date" value={form.vessel_leave_date} setForm={setForm} />
              <InputField label="Ayrılış Limanı" field="departure_port" value={form.departure_port} setForm={setForm} />
              <InputField label="Sefer Sonlandırma Nedeni" field="voyage_termination_reason" value={form.voyage_termination_reason || form.exit_reason} setForm={setForm} />
              <SelectField label="Rotasyon Tamamlandı mı?" field="rotation_completed" value={form.rotation_completed} options={YES_NO_OPTIONS} setForm={setForm} />
              <SelectField label="Devir Teslim Durumu" field="marine_handover_status" value={form.marine_handover_status} options={STATUS_OPTIONS} setForm={setForm} />
              <SelectField label="Denizcilik Belgeleri İade / Kontrol Durumu" field="marine_documents_return_status" value={form.marine_documents_return_status} options={STATUS_OPTIONS} setForm={setForm} />
              <InputField label="Sağlık / Uygunluk Notu" field="marine_health_note" value={form.marine_health_note} setForm={setForm} />
              <SelectField label="Son Hakediş Durumu" field="marine_final_earned_payment_status" value={form.marine_final_earned_payment_status} options={STATUS_OPTIONS} setForm={setForm} />
            </FieldGrid>
          </SectionCard>
        )}
      </div>
    )
  }

  if (step === 2) {
    return (
      <SectionCard title="Belgeler ve Devir" description="Belgeler Document Registry üzerinden referanslanır; aynı belge tekrar yüklenmez.">
        <FieldGrid>
          <SelectField label="Son Ödeme Durumu" field="final_payment_status" value={form.final_payment_status} options={STATUS_OPTIONS} setForm={setForm} />
          <SelectField label="Hakediş Durumu" field="earned_payment_status" value={form.earned_payment_status} options={STATUS_OPTIONS} setForm={setForm} />
          <SelectField label="Zimmet / Devir Durumu" field="handover_status" value={form.handover_status} options={STATUS_OPTIONS} setForm={setForm} />
          <SelectField label="Belgeler Tamamlandı mı?" field="documents_completed" value={form.documents_completed} options={YES_NO_OPTIONS} setForm={setForm} />
          <DocumentRegistryField label="Kapanış Belgesi" field="closing_document_id" value={form.closing_document_id} setForm={setForm} />
          <TextAreaField label="Notlar" field="notes" value={form.notes} setForm={setForm} />
        </FieldGrid>
      </SectionCard>
    )
  }

  return null
}

function WorkPaymentSection({ form, setForm }: { form: Record<string, any>; setForm: React.Dispatch<React.SetStateAction<Record<string, any>>> }) {
  return (
    <SectionCard title="Ücret ve Çalışma Düzeni" description="Bu alanlar tüm istihdam tipleri için desteklenir.">
      <FieldGrid>
        <SelectField label="Ücret Tipi" field="payment_type" value={form.payment_type} options={PAYMENT_TYPE_OPTIONS} setForm={setForm} />
        <SelectField label="Brüt / Net" field="gross_net_type" value={form.gross_net_type} options={GROSS_NET_OPTIONS} setForm={setForm} />
        <SelectField label="Para Birimi" field="currency" value={form.currency} options={CURRENCY_OPTIONS} setForm={setForm} />
        <SelectField label="Ödeme Periyodu" field="payment_period" value={form.payment_period} options={PAYMENT_PERIOD_OPTIONS} setForm={setForm} />
        <InputField label="Haftalık Çalışma Günü" field="weekly_working_days" type="number" value={form.weekly_working_days} setForm={setForm} />
        <InputField label="Günlük Çalışma Saati" field="daily_working_hours" type="number" value={form.daily_working_hours} setForm={setForm} />
        {workBooleanFields.map(field => (
          <CheckField key={field.field} label={field.label} field={field.field} checked={!!form[field.field]} setForm={setForm} />
        ))}
      </FieldGrid>
    </SectionCard>
  )
}

const workBooleanFields = [
  { field: 'works_saturday', label: 'Cumartesi Çalışır mı?' },
  { field: 'works_sunday', label: 'Pazar Çalışır mı?' },
  { field: 'is_shift_based', label: 'Vardiyalı mı?' },
  { field: 'has_night_shift', label: 'Gece Vardiyası Var mı?' },
  { field: 'overtime_applicable', label: 'Fazla Mesaiye Tabi mi?' },
  { field: 'works_on_public_holidays', label: 'Resmi Tatilde Çalışır mı?' },
  { field: 'is_part_time', label: 'Kısmi Zamanlı mı?' },
  { field: 'is_remote', label: 'Uzaktan Çalışma Var mı?' },
]

function ManualSgkFields({ type, value, setValue }: { type: WizardType; value: Record<string, any>; setValue: React.Dispatch<React.SetStateAction<Record<string, any>>> }) {
  const entry = type === 'entry'
  return (
    <FieldGrid>
      <InputField label={entry ? 'SGK Giriş Tarihi' : 'SGK Çıkış Tarihi'} field={entry ? 'sgk_entry_date' : 'sgk_exit_date'} type="date" value={value[entry ? 'sgk_entry_date' : 'sgk_exit_date']} setForm={setValue} required />
      <InputField label={entry ? 'SGK Bildirge / Referans No' : 'SGK Çıkış Bildirge / Referans No'} field={entry ? 'sgk_entry_reference_no' : 'sgk_exit_reference_no'} value={value[entry ? 'sgk_entry_reference_no' : 'sgk_exit_reference_no']} setForm={setValue} required />
      <SelectField label="Webden Yapıldı mı?" field={entry ? 'sgk_entry_web_completed' : 'sgk_exit_web_completed'} value={value[entry ? 'sgk_entry_web_completed' : 'sgk_exit_web_completed']} options={YES_NO_OPTIONS} setForm={setValue} />
      <DocumentRegistryField label={entry ? 'SGK İşe Giriş Belgesi' : 'SGK Çıkış Belgesi'} field={entry ? 'sgk_entry_document_id' : 'sgk_exit_document_id'} value={value[entry ? 'sgk_entry_document_id' : 'sgk_exit_document_id']} setForm={setValue} />
      <TextAreaField label="Açıklama" field="description" value={value.description} setForm={setValue} />
    </FieldGrid>
  )
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-950 dark:text-white">{title}</h4>
        {description && <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
}

function InfoPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800 dark:border-blue-950 dark:bg-blue-950/25 dark:text-blue-200', className)}>
      <Info size={15} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

function FieldLabel({ label, description, required, state = 'neutral' }: { label: string; description?: string; required?: boolean; state?: 'neutral' | 'invalid' | 'valid' }) {
  return (
    <span className={cn(
      'flex items-center gap-1 text-xs font-medium',
      state === 'invalid'
        ? 'text-red-700 dark:text-red-400'
        : state === 'valid'
          ? 'text-emerald-700 dark:text-emerald-400'
          : 'text-gray-600 dark:text-gray-400'
    )}>
      {label}
      {required && <span className="text-red-500">*</span>}
      {description && (
        <span title={description} className="inline-flex text-gray-400">
          <HelpCircle size={13} />
        </span>
      )}
    </span>
  )
}

function InputField({
  label,
  field,
  value,
  setForm,
  type = 'text',
  required,
  highlight,
}: {
  label: string
  field: string
  value: any
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>
  type?: string
  required?: boolean
  highlight?: boolean
}) {
  const state = required ? (value ? 'valid' : 'invalid') : 'neutral'
  return (
    <label className={cn('relative space-y-1 rounded-xl border border-transparent p-1', highlight && 'border-blue-200 bg-blue-50/60 dark:border-blue-950 dark:bg-blue-950/20')}>
      <FieldLabel label={label} required={required} state={state} />
      {required && (
        <span className={cn(
          'pointer-events-none absolute right-2 top-8 z-10 rounded border bg-white px-1.5 py-0.5 text-[10px] font-medium leading-none dark:bg-gray-900',
          state === 'valid'
            ? 'border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400'
            : 'border-red-300 text-red-600 dark:border-red-700 dark:text-red-400'
        )}>
          {state === 'valid' ? 'Tamam' : 'Zorunlu Alan'}
        </span>
      )}
      <input
        type={type}
        value={value || ''}
        onChange={event => setForm(previous => ({ ...previous, [field]: event.target.value }))}
        className={formControlClass({ state })}
      />
    </label>
  )
}

function TextAreaField({ label, field, value, setForm }: { label: string; field: string; value: any; setForm: React.Dispatch<React.SetStateAction<Record<string, any>>> }) {
  return (
    <label className="space-y-1 md:col-span-2">
      <FieldLabel label={label} />
      <textarea
        value={value || ''}
        onChange={event => setForm(previous => ({ ...previous, [field]: event.target.value }))}
        className={formControlClass({ className: 'min-h-24 resize-y' })}
      />
    </label>
  )
}

function SelectField({
  label,
  field,
  value,
  setForm,
  options,
  required,
}: {
  label: string
  field: string
  value: any
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>
  options: LifecycleOption[]
  required?: boolean
}) {
  const selectedDescription = options.find(option => option.value === value)?.description
  const state = required ? (value ? 'valid' : 'invalid') : 'neutral'
  return (
    <label className="relative space-y-1">
      <FieldLabel label={label} description={selectedDescription} required={required} state={state} />
      {required && (
        <span className={cn(
          'pointer-events-none absolute right-2 top-7 z-10 rounded border bg-white px-1.5 py-0.5 text-[10px] font-medium leading-none dark:bg-gray-900',
          state === 'valid'
            ? 'border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400'
            : 'border-red-300 text-red-600 dark:border-red-700 dark:text-red-400'
        )}>
          {state === 'valid' ? 'Tamam' : 'Zorunlu Alan'}
        </span>
      )}
      <select
        value={value || ''}
        onChange={event => setForm(previous => ({ ...previous, [field]: event.target.value }))}
        className={formControlClass({ state, surface: 'enum' })}
      >
        <option value="">Seçiniz</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function CheckField({ label, field, checked, setForm }: { label: string; field: string; checked: boolean; setForm: React.Dispatch<React.SetStateAction<Record<string, any>>> }) {
  return (
    <label className="flex min-h-[42px] items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={event => setForm(previous => ({ ...previous, [field]: event.target.checked }))}
        className="h-4 w-4 rounded border-gray-300 text-blue-600"
      />
      {label}
    </label>
  )
}

function OptionCardGroup({ field, value, options, setForm }: { field: string; value: any; options: LifecycleOption[]; setForm: React.Dispatch<React.SetStateAction<Record<string, any>>> }) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {options.map(option => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setForm(previous => ({ ...previous, [field]: option.value }))}
            title={option.description}
            className={cn(
              'min-h-[92px] rounded-xl border p-3 text-left transition-colors',
              active
                ? 'border-blue-300 bg-blue-50 text-blue-800 shadow-sm dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100'
                : 'border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:bg-blue-50/50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-blue-950 dark:hover:bg-blue-950/20'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{option.label}</span>
              <HelpCircle size={15} className="shrink-0 text-gray-400" />
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">{option.description}</p>
          </button>
        )
      })}
    </div>
  )
}

function DocumentRegistryField({
  label,
  field,
  value,
  setForm,
}: {
  label: string
  field: string
  value: any
  setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>
}) {
  const current = typeof value === 'object' && value ? value : value ? { documentId: value, name: String(value) } : null
  const [mode, setMode] = useState<'new' | 'existing' | ''>(current?.source || '')
  const display = current?.name || current?.documentId || current?.storagePath || ''

  const chooseNew = () => {
    setMode('new')
    setForm(previous => ({
      ...previous,
      [field]: {
        source: 'new',
        documentId: `pending:${field}`,
        name: `${label} - yeni belge`,
      },
    }))
  }

  const chooseExisting = () => {
    setMode('existing')
    setForm(previous => ({
      ...previous,
      [field]: {
        source: 'existing',
        documentId: current?.documentId || '',
        name: current?.name || '',
      },
    }))
  }

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
      <FieldLabel label={label} description="Document Registry kullanılır; aynı belge tekrar yüklenmez, mevcut belge referanslanabilir." />
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
          onChange={event => setForm(previous => ({ ...previous, [field]: { source: 'existing', documentId: event.target.value, name: event.target.value } }))}
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

function SummaryItem({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 min-h-5 break-words text-sm font-medium text-gray-950 dark:text-gray-100">{formatSummaryValue(value)}</div>
    </div>
  )
}

function initialForm(employee: Record<string, any>, type: WizardType) {
  const today = new Date().toISOString().slice(0, 10)
  const sgkResponsibility = normalizeSgkResponsibility(employee.sgk_responsibility || 'company')
  if (type === 'entry') {
    return {
      employment_type: employee.employment_type || employee.work_type || 'permanent',
      duration_type: employee.duration_type || 'indefinite',
      sgk_responsibility: sgkResponsibility,
      work_arrangement: employee.work_arrangement || 'full_time',
      start_date: employee.entry_date || employee.start_date || employee.sgk_entry_date || today,
      company_id: employee.company_id || '',
      company_unit_id: employee.company_unit_id || employee.unit_id || '',
      position_id: employee.position_id || '',
      payment_type: employee.payment_type || 'monthly_salary',
      gross_net_type: employee.gross_net_type || 'gross',
      currency: employee.currency || 'TRY',
      payment_period: employee.payment_period || 'monthly',
      weekly_working_days: employee.weekly_working_days || '5',
      daily_working_hours: employee.daily_working_hours || '7.5',
    }
  }

  return {
    employment_type: employee.employment_type || employee.work_type || 'permanent',
    duration_type: employee.duration_type || 'indefinite',
    sgk_responsibility: sgkResponsibility,
    work_arrangement: employee.work_arrangement || 'full_time',
    company_id: employee.company_id || '',
    company_unit_id: employee.company_unit_id || employee.unit_id || '',
    position_id: employee.position_id || '',
    exit_date: employee.exit_date || today,
    exit_reason: '',
    exit_type: recommendedExitType(employee),
    final_payment_status: 'pending',
    earned_payment_status: 'pending',
    handover_status: 'pending',
    documents_completed: 'no',
  }
}

function initialManualSgk(type: WizardType, employee: Record<string, any>) {
  const today = new Date().toISOString().slice(0, 10)
  if (type === 'entry') {
    return {
      sgk_entry_date: employee.sgk_entry_date || today,
      sgk_entry_reference_no: employee.sgk_entry_reference_no || '',
      sgk_entry_web_completed: 'yes',
      description: '',
    }
  }
  return {
    sgk_exit_date: employee.exit_date || today,
    sgk_exit_reference_no: employee.sgk_exit_reference_no || '',
    sgk_exit_web_completed: 'yes',
    description: '',
  }
}

function mergeContextIntoForm(previous: Record<string, any>, context: WizardContext, type: WizardType) {
  const relation = context.workRelation || {}
  const employee = context.employee || {}
  const companies = context.references?.companies || []
  const singleCompanyId = companies.length === 1 ? companies[0].id : ''
  const common = {
    employment_type: relation.employment_type || relation.relationship_type || previous.employment_type,
    duration_type: relation.duration_type || previous.duration_type,
    sgk_responsibility: normalizeSgkResponsibility(relation.sgk_responsibility || previous.sgk_responsibility),
    work_arrangement: relation.work_arrangement || previous.work_arrangement,
    company_id: relation.company_id || employee.company_id || previous.company_id || singleCompanyId,
    company_unit_id: relation.company_unit_id || relation.unit_id || employee.unit_id || previous.company_unit_id,
    position_id: relation.position_id || employee.position_id || previous.position_id,
    work_location_id: relation.work_location_id || previous.work_location_id,
    cost_center_id: relation.cost_center_id || previous.cost_center_id,
    project_id: relation.project_id || previous.project_id,
    shift_group_id: relation.shift_group_id || previous.shift_group_id,
    vessel_or_platform_id: relation.vessel_or_platform_id || previous.vessel_or_platform_id,
    payment_type: relation.payment_type || previous.payment_type,
    gross_net_type: relation.gross_net_type || previous.gross_net_type,
    currency: relation.currency || previous.currency,
    payment_period: relation.payment_period || previous.payment_period,
    weekly_working_days: relation.weekly_working_days || previous.weekly_working_days,
    daily_working_hours: relation.daily_working_hours || previous.daily_working_hours,
  }

  if (type === 'entry') {
    return {
      ...previous,
      ...common,
      start_date: relation.start_date || employee.entry_date || employee.sgk_entry_date || previous.start_date,
      sgk_entry_date: relation.sgk_entry_date || employee.sgk_entry_date || previous.sgk_entry_date,
    }
  }

  return {
    ...previous,
    ...common,
    exit_type: previous.exit_type || recommendedExitType(relation),
  }
}

function buildReferenceOptions(context: WizardContext, form: Record<string, any>) {
  const companies = context.references?.companies || []
  const units = context.references?.units || []
  const positions = context.references?.positions || []
  const companyOptions = companies.map(row => ({
    value: row.id,
    label: row.short_name || row.trade_name || row.id,
  }))
  const unitOptions = units
    .filter(row => !form.company_id || row.company_id === form.company_id)
    .map(row => ({
      value: row.id,
      label: row.name || row.id,
    }))
  const positionOptions = positions
    .filter(row => !form.company_unit_id || row.unit_id === form.company_unit_id)
    .map(row => ({
      value: row.id,
      label: row.title || row.id,
    }))

  return { companyOptions, unitOptions, positionOptions }
}

function deriveRegime(form: Record<string, any>, fallback: Record<string, any> = {}) {
  const employmentType = form.employment_type || fallback.employment_type
  const durationType = form.duration_type || fallback.duration_type
  const workArrangement = form.work_arrangement || fallback.work_arrangement
  const sgkResponsibility = normalizeSgkResponsibility(form.sgk_responsibility || fallback.sgk_responsibility)
  const marine = employmentType === 'marine' || durationType === 'voyage_based' || workArrangement === 'marine_vessel'
  const contractual = ['contracted', 'outsourced', 'consultant_freelancer'].includes(employmentType)
  const internship = employmentType === 'intern' || sgkResponsibility === 'school_university'
  return {
    employmentType,
    durationType,
    workArrangement,
    sgkResponsibility,
    marine,
    contractual,
    internship,
    projectBased: durationType === 'project_based',
    shiftBased: workArrangement === 'shift_based',
    fieldWork: workArrangement === 'field',
  }
}

function buildEntrySummary(form: Record<string, any>, manualSgk: Record<string, any>, references: ReturnType<typeof buildReferenceOptions>) {
  return [
    ['İstihdam Tipi', optionLabel(EMPLOYMENT_TYPE_OPTIONS, form.employment_type)],
    ['Süre Tipi', optionLabel(DURATION_TYPE_OPTIONS, form.duration_type)],
    ['SGK Sorumlusu', sgkResponsibilityLabel(form.sgk_responsibility)],
    ['Çalışma Düzeni', optionLabel(WORK_ARRANGEMENT_OPTIONS, form.work_arrangement)],
    ['İşe Başlama Tarihi', formatDate(form.start_date)],
    ['Şirket', optionLabel(references.companyOptions, form.company_id)],
    ['Birim', optionLabel(references.unitOptions, form.company_unit_id)],
    ['Görev / Pozisyon', optionLabel(references.positionOptions, form.position_id)],
    ['Ücret Bilgileri', `${optionLabel(PAYMENT_TYPE_OPTIONS, form.payment_type)} / ${optionLabel(GROSS_NET_OPTIONS, form.gross_net_type)} / ${form.currency || '-'}`],
    ['Belgeler', summarizeDocuments({ ...form, ...manualSgk })],
  ]
}

function buildExitSummary(form: Record<string, any>, manualSgk: Record<string, any>, workRelation: Record<string, any>) {
  return [
    ['Çıkış Tarihi', formatDate(form.exit_date)],
    ['Çıkış Nedeni', form.exit_reason || '-'],
    ['Çıkış Türü', optionLabel(EXIT_TYPE_OPTIONS, form.exit_type)],
    ['Çalışma Rejimi', `${optionLabel(EMPLOYMENT_TYPE_OPTIONS, form.employment_type || workRelation.employment_type)} / ${sgkResponsibilityLabel(form.sgk_responsibility || workRelation.sgk_responsibility)}`],
    ['SGK / okul / sözleşme / denizcilik kapanışı', summarizeRegimeClose(form, manualSgk)],
    ['Ödeme ve belge durumu', `${optionLabel(STATUS_OPTIONS, form.final_payment_status)} / ${optionLabel(STATUS_OPTIONS, form.handover_status)} / ${form.documents_completed === 'yes' ? 'Belgeler tamam' : 'Belge kontrolü sürüyor'}`],
  ]
}

function summarizeRegimeClose(form: Record<string, any>, manualSgk: Record<string, any>) {
  const parts = [
    manualSgk.sgk_exit_reference_no ? `SGK ref: ${manualSgk.sgk_exit_reference_no}` : '',
    form.school_notified === 'yes' ? 'Okul bildirimi var' : '',
    form.contract_end_date ? `Sözleşme bitiş: ${formatDate(form.contract_end_date)}` : '',
    form.voyage_end_date ? `Sefer bitiş: ${formatDate(form.voyage_end_date)}` : '',
  ].filter(Boolean)
  return parts.join(' · ') || '-'
}

function summarizeDocuments(value: Record<string, any>) {
  const count = Object.entries(value).filter(([key, item]) => key.includes('document') && item).length
  return count ? `${count} belge referansı` : 'Belge eklenmedi'
}

function recommendedExitType(record: Record<string, any>) {
  const regime = deriveRegime(record)
  if (isCompanySgk(regime.sgkResponsibility)) return 'sgk_exit'
  if (regime.internship) return 'internship_completed'
  if (regime.contractual) return 'contract_terminated'
  if (regime.marine) return 'marine_contract_closed'
  return 'other'
}

function recommendedExitTypeLabel(record: Record<string, any>) {
  return optionLabel(EXIT_TYPE_OPTIONS, recommendedExitType(record))
}

function formatSummaryValue(value: any) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function formatDate(value: any) {
  const text = String(value || '').slice(0, 10)
  if (!text) return '-'
  return text.split('-').reverse().join('.')
}
