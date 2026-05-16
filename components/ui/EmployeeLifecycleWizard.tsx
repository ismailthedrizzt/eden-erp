'use client'

import { useMemo, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formControlClass } from './formControlStyles'

type WizardType = 'entry' | 'exit'

type Props = {
  type: WizardType
  employee: Record<string, any>
  onClose: () => void
  onComplete: (employee: Record<string, any>) => void
}

const relationshipTypes = [
  'SGK’lı Çalışan',
  'Stajyer',
  'Zorunlu Stajyer',
  'Okul / Üniversite Sigortalı Stajyer',
  'Freelancer',
  'Danışman',
  'Sözleşmeli Dış Personel',
  'Kısmi Zamanlı Çalışan',
  'Çağrı Üzerine Çalışan',
  'Uzaktan Çalışan',
  'Vardiyalı Çalışan',
  'Deniz Personeli / Gemi Adamı',
  'Sefer Bazlı Çalışan',
  'Proje Bazlı Çalışan',
  'Diğer',
]

const sgkResponsibilities = [
  ['sgk_company', 'Şirket Yapacak'],
  ['school', 'Okul / Üniversite Yapacak'],
  ['external', 'Dış Kurum Yapacak'],
  ['none', 'SGK Bildirimi Yok'],
  ['manual', 'Manuel Takip Edilecek'],
]

const paymentTypes = [
  'Aylık Maaş',
  'Günlük Ücret',
  'Saatlik Ücret',
  'Sefer Bazlı Ücret',
  'Proje Bazlı Ücret',
  'Fatura Bazlı Ödeme',
  'Prim / Komisyon',
  'Huzur Hakkı',
  'Staj Ücreti',
  'Ücretsiz / Gönüllü',
  'Diğer',
]

export function EmployeeLifecycleWizard({ type, employee, onClose, onComplete }: Props) {
  const entry = type === 'entry'
  const steps = entry
    ? ['Çalışma İlişkisi', 'SGK / Bildirim Sorumlusu', 'Ücret ve Çalışma Düzeni', 'Belgeler', 'Onay ve Aktivasyon']
    : ['Çıkış Türü', 'Rejime Göre Çıkış Bilgileri', 'Ödeme / Devir / Belgeler', 'Onay ve Pasifleştirme']
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Record<string, any>>(() => ({
    relationship_type: employee.relationship_type || 'SGK’lı Çalışan',
    start_date: employee.sgk_giris || employee.entry_date || new Date().toISOString().slice(0, 10),
    company_id: employee.sirket_id || employee.company_id || '',
    department_position: [employee.birim_adi, employee.kadro_unvani || employee.gorev].filter(Boolean).join(' / '),
    sgk_responsibility: employee.sgk_responsibility || 'sgk_company',
    sgk_entry_date: employee.sgk_giris || new Date().toISOString().slice(0, 10),
    payment_type: employee.payment_type || 'Aylık Maaş',
    gross_net_type: employee.gross_net_type || 'brut',
    currency: employee.currency || 'TRY',
    payment_period: employee.payment_period || 'Aylık',
    weekly_working_days: employee.weekly_working_days || '5',
    daily_working_hours: employee.daily_working_hours || '7.5',
    exit_date: employee.isten_ayrilis || new Date().toISOString().slice(0, 10),
    exit_reason: employee.exit_reason || '',
    exit_type: employee.exit_type || '',
    final_payment_status: employee.final_payment_status || '',
    handover_status: employee.handover_status || '',
    documents_completed: !!employee.documents_completed,
  }))
  const canShowCompanySgk = form.sgk_responsibility === 'sgk_company'
  const canShowSchool = form.sgk_responsibility === 'school'
  const title = entry ? 'İşe Giriş Yap' : 'İşten Çıkış Yap'
  const primaryLabel = step === steps.length - 1 ? (entry ? 'İşe Girişi Tamamla' : 'İşten Çıkışı Tamamla') : 'Devam'
  const summary = useMemo(() => entry ? [
    ['Çalışma İlişkisi Türü', form.relationship_type],
    ['İşe Başlama Tarihi', form.start_date],
    ['SGK Bildirim Sorumlusu', labelFor(form.sgk_responsibility)],
    ['Ücret Tipi', form.payment_type],
    ['Çalışma Düzeni', `${form.weekly_working_days || '-'} gün / ${form.daily_working_hours || '-'} saat`],
  ] : [
    ['Çıkış Tarihi', form.exit_date],
    ['Çıkış Nedeni', form.exit_reason],
    ['Çıkış Türü', form.exit_type],
    ['Ödeme Durumu', form.final_payment_status],
    ['Devir Durumu', form.handover_status],
  ], [entry, form])

  const complete = async () => {
    setSaving(true)
    setError('')
    try {
      const response = await fetch(`/api/employees/${employee.id}/${entry ? 'entry-wizard' : 'exit-wizard'}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'İşlem tamamlanamadı')
      onComplete(payload.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İşlem tamamlanamadı')
    } finally {
      setSaving(false)
    }
  }

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
      return
    }
    complete()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{employee.ad} {employee.soyad}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18} /></button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-[220px_1fr]">
          <ol className="space-y-2">
            {steps.map((label, index) => (
              <li key={label} className={cn('rounded-lg px-3 py-2 text-sm', index === step ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300')}>
                {index + 1}. {label}
              </li>
            ))}
          </ol>

          <div className="min-h-[360px]">
            {entry ? renderEntryStep(step, form, setForm, canShowCompanySgk, canShowSchool) : renderExitStep(step, form, setForm, canShowCompanySgk)}
            {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
            {step === steps.length - 1 && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950">
                {summary.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[180px_1fr] gap-3 py-1 text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{value || '-'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-800">
          <button type="button" onClick={() => step === 0 ? onClose() : setStep(step - 1)} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
            {step === 0 ? 'İptal' : 'Geri'}
          </button>
          <button type="button" onClick={next} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function renderEntryStep(step: number, form: Record<string, any>, setForm: (updater: any) => void, companySgk: boolean, school: boolean) {
  if (step === 0) return <FieldGrid>
    <Select label="Çalışma İlişkisi Türü" field="relationship_type" value={form.relationship_type} options={relationshipTypes} setForm={setForm} />
    <Input label="İşe Başlama Tarihi" field="start_date" type="date" value={form.start_date} setForm={setForm} />
    <Input label="Şirket" field="company_id" value={form.company_id} setForm={setForm} />
    <Input label="Birim / Pozisyon" field="department_position" value={form.department_position} setForm={setForm} />
  </FieldGrid>
  if (step === 1) return <FieldGrid>
    <Select label="SGK Bildirim Sorumlusu" field="sgk_responsibility" value={form.sgk_responsibility} options={sgkResponsibilities.map(([, label]) => label)} values={sgkResponsibilities.map(([value]) => value)} setForm={setForm} />
    {companySgk && <>
      <Input label="SGK İşe Giriş Tarihi" field="sgk_entry_date" type="date" value={form.sgk_entry_date} setForm={setForm} />
      <Input label="Sigorta Kolu" field="sgk_giris_sigorta_kolu" value={form.sgk_giris_sigorta_kolu} setForm={setForm} />
      <Input label="Görev Kodu" field="sgk_giris_gorev_kodu" value={form.sgk_giris_gorev_kodu} setForm={setForm} />
      <Input label="Meslek Kodu" field="sgk_giris_meslek_kodu" value={form.sgk_giris_meslek_kodu} setForm={setForm} />
      <Check label="SGK Girişi Yapılacak mı?" field="run_sgk_entry" value={form.run_sgk_entry} setForm={setForm} />
    </>}
    {school && <>
      <Input label="Okul / Üniversite" field="school_or_university" value={form.school_or_university} setForm={setForm} />
      <Input label="Staj Türü" field="internship_type" value={form.internship_type} setForm={setForm} />
      <Input label="Staj Başlangıç Tarihi" field="internship_start_date" type="date" value={form.internship_start_date} setForm={setForm} />
      <Input label="Staj Bitiş Tarihi" field="internship_end_date" type="date" value={form.internship_end_date} setForm={setForm} />
      <Check label="Okul SGK Bildirimi Var mı?" field="school_sgk_notification_status" value={form.school_sgk_notification_status} setForm={setForm} />
    </>}
  </FieldGrid>
  if (step === 2) return <FieldGrid>
    <Select label="Ücret Tipi" field="payment_type" value={form.payment_type} options={paymentTypes} setForm={setForm} />
    <Select label="Brüt / Net" field="gross_net_type" value={form.gross_net_type} options={['brut', 'net']} setForm={setForm} />
    <Input label="Para Birimi" field="currency" value={form.currency} setForm={setForm} />
    <Input label="Ödeme Periyodu" field="payment_period" value={form.payment_period} setForm={setForm} />
    <Input label="Haftalık Çalışma Günü" field="weekly_working_days" type="number" value={form.weekly_working_days} setForm={setForm} />
    <Input label="Günlük Çalışma Saati" field="daily_working_hours" type="number" value={form.daily_working_hours} setForm={setForm} />
    {['works_saturday', 'works_sunday', 'is_shift_based', 'has_night_shift', 'overtime_applicable', 'works_on_public_holidays', 'is_part_time', 'is_remote'].map(field => <Check key={field} label={workBooleanLabels[field]} field={field} value={form[field]} setForm={setForm} />)}
    <Input label="Çalışma Yeri Tipi" field="workplace_type" value={form.workplace_type} setForm={setForm} />
  </FieldGrid>
  if (step === 3) return <DocumentStep />
  return null
}

function renderExitStep(step: number, form: Record<string, any>, setForm: (updater: any) => void, companySgk: boolean) {
  if (step === 0) return <FieldGrid>
    <Input label="İşten Çıkış / İlişki Sonlandırma Tarihi" field="exit_date" type="date" value={form.exit_date} setForm={setForm} />
    <Input label="Çıkış Nedeni" field="exit_reason" value={form.exit_reason} setForm={setForm} />
    <Input label="Çıkış Türü" field="exit_type" value={form.exit_type} setForm={setForm} />
  </FieldGrid>
  if (step === 1) return <FieldGrid>
    {companySgk && <>
      <Input label="SGK İşten Çıkış Tarihi" field="sgk_exit_date" type="date" value={form.sgk_exit_date || form.exit_date} setForm={setForm} />
      <Input label="SGK Çıkış Nedeni" field="sgk_cikis_nedeni" value={form.sgk_cikis_nedeni || form.exit_reason} setForm={setForm} />
      <Input label="Meslek Kodu" field="sgk_cikis_meslek_kodu" value={form.sgk_cikis_meslek_kodu} setForm={setForm} />
      <Check label="SGK Çıkışı Yapılacak mı?" field="run_sgk_exit" value={form.run_sgk_exit} setForm={setForm} />
    </>}
    <Input label="Sözleşme / Hizmet Bitiş Tarihi" field="contract_end_date" type="date" value={form.contract_end_date || form.exit_date} setForm={setForm} />
    <Input label="Sonlandırma Nedeni" field="termination_reason" value={form.termination_reason || form.exit_reason} setForm={setForm} />
  </FieldGrid>
  if (step === 2) return <FieldGrid>
    <Input label="Son Ödeme Durumu" field="final_payment_status" value={form.final_payment_status} setForm={setForm} />
    <Input label="Hakediş Durumu" field="earned_payment_status" value={form.earned_payment_status} setForm={setForm} />
    <Input label="Zimmet / Devir Durumu" field="handover_status" value={form.handover_status} setForm={setForm} />
    <Check label="Belgeler Tamamlandı mı?" field="documents_completed" value={form.documents_completed} setForm={setForm} />
    <Input label="Kapanış Belgesi" field="closing_document_id" value={form.closing_document_id} setForm={setForm} />
    <Input label="Notlar" field="notes" value={form.notes} setForm={setForm} />
  </FieldGrid>
  return null
}

const workBooleanLabels: Record<string, string> = {
  works_saturday: 'Cumartesi Çalışır mı?',
  works_sunday: 'Pazar Çalışır mı?',
  is_shift_based: 'Vardiyalı mı?',
  has_night_shift: 'Gece Vardiyası Var mı?',
  overtime_applicable: 'Fazla Mesaiye Tabi mi?',
  works_on_public_holidays: 'Resmi Tatilde Çalışır mı?',
  is_part_time: 'Kısmi Zamanlı mı?',
  is_remote: 'Uzaktan Çalışma Var mı?',
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
}

function Input({ label, field, value, setForm, type = 'text' }: { label: string; field: string; value: any; setForm: (updater: any) => void; type?: string }) {
  return <label className="space-y-1"><span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span><input type={type} value={value || ''} onChange={event => setForm((prev: Record<string, any>) => ({ ...prev, [field]: event.target.value }))} className={formControlClass()} /></label>
}

function Select({ label, field, value, setForm, options, values }: { label: string; field: string; value: any; setForm: (updater: any) => void; options: string[]; values?: string[] }) {
  return <label className="space-y-1"><span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span><select value={value || ''} onChange={event => setForm((prev: Record<string, any>) => ({ ...prev, [field]: event.target.value }))} className={formControlClass()}>{options.map((option, index) => <option key={option} value={values?.[index] || option}>{option}</option>)}</select></label>
}

function Check({ label, field, value, setForm }: { label: string; field: string; value: any; setForm: (updater: any) => void }) {
  return <label className="mt-6 flex items-center gap-2 text-sm"><input type="checkbox" checked={!!value} onChange={event => setForm((prev: Record<string, any>) => ({ ...prev, [field]: event.target.checked }))} />{label}</label>
}

function DocumentStep() {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
      <div className="font-medium text-gray-900 dark:text-white">Belgeler</div>
      <p className="mt-1">Document Registry entegrasyonu için mevcut belge seçimi ve yeni belge yükleme aksiyonları bu akışa bağlanacak şekilde ayrıldı.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">Yeni Belge Yükle</button>
        <button type="button" className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">Mevcut Belgeden Seç</button>
      </div>
    </div>
  )
}

function labelFor(value: string) {
  return sgkResponsibilities.find(([key]) => key === value)?.[1] || value
}
