'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  PartyPopper,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import PageBanner from '@/components/ui/PageBanner'
import Modal from '@/components/ui/Modal'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { formControlClass } from '@/components/ui/formControlStyles'
import { apiClient } from '@/lib/api/apiClient'
import { cn } from '@/lib/utils'

type WizardStep = 'welcome' | 'company' | 'role' | 'person' | 'success'
type UserRole = 'partner' | 'employee'

type SetupCompany = {
  id: string
  trade_name: string
  short_name?: string | null
  tax_number?: string | null
  tax_office?: string | null
  company_type?: string | null
  country?: string | null
  city?: string | null
  district?: string | null
  address?: string | null
}

type SetupStatusResponse = {
  data: {
    has_company: boolean
    company: SetupCompany | null
  }
}

type SetupCompanyResponse = {
  data: {
    company: SetupCompany
    reused: boolean
  }
}

type SetupRoleResponse = {
  data: {
    reused: boolean
  }
}

type TaxOfficesResponse = {
  offices?: { name: string; province?: string; district?: string }[]
}

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'welcome', label: 'Karşılama' },
  { id: 'company', label: 'Şirket' },
  { id: 'role', label: 'Rol' },
  { id: 'person', label: 'Kişi' },
  { id: 'success', label: 'Tamam' },
]

const COMPANY_TYPES = [
  { value: 'limited', label: 'Limited Şirket' },
  { value: 'anonim', label: 'Anonim Şirket' },
  { value: 'sahis', label: 'Şahıs İşletmesi' },
  { value: 'kooperatif', label: 'Kooperatif' },
  { value: 'kollektif', label: 'Kollektif Şirket' },
  { value: 'komandit', label: 'Komandit Şirket' },
]

const initialCompanyForm = {
  trade_name: '',
  short_name: '',
  tax_number: '',
  tax_office: '',
  company_type: 'limited',
  country: 'TR',
  city: '',
  district: '',
  address: '',
}

const initialPersonForm = {
  first_name: '',
  last_name: '',
  nationality: 'TR',
  national_id: '',
  gender: 'male',
  email: '',
  phone: '',
}

export default function SetupWizardPage() {
  const [open, setOpen] = useState(true)
  const [existingCompany, setExistingCompany] = useState<SetupCompany | null>(null)
  const [toast, setToast] = useState<{ type: ToastType; title?: string; message: string } | null>(null)

  useEffect(() => {
    let alive = true
    apiClient.get<SetupStatusResponse>('/api/settings/setup-wizard', { skipAuth: true, useCache: false })
      .then(response => {
        if (!alive) return
        setExistingCompany(response.data.company)
      })
      .catch(() => {
        if (!alive) return
        setExistingCompany(null)
      })

    return () => { alive = false }
  }, [])

  return (
    <div>
      <PageBanner
        mode="list"
        title="Kurulum Sihirbazı"
        subtitle="İlk şirket ve ilk kullanıcı rolünü tek akışta oluşturun."
        icon={<Sparkles size={24} />}
        addButtonText="Sihirbazı Aç"
        customButtonIcon={<Sparkles size={16} />}
        onAddClick={() => setOpen(true)}
      />

      <div className="border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 border-b-2 border-eden-blue px-1 pb-3 text-sm font-semibold text-eden-blue dark:text-blue-300"
        >
          <Sparkles size={16} />
          İlk Kurulum
        </button>
      </div>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-eden-navy-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-eden-blue/10 text-eden-blue dark:bg-blue-500/15 dark:text-blue-300">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">İlk kurulum akışı</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {existingCompany
                  ? `${existingCompany.trade_name} sistemde ilk şirket olarak görünüyor. Sihirbaz yeni rol/kisi bağlamak için tekrar açılabilir.`
                  : 'Şirket, rol ve gerçek kişi kayıtlarını temel kimlik sorgusu beklemeden oluşturur.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-eden-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-eden-blue-dk"
          >
            <Sparkles size={16} />
            Başlat
          </button>
        </div>
      </section>

      <SetupWizardModal
        open={open}
        existingCompany={existingCompany}
        onCompanyCreated={company => setExistingCompany(company)}
        onToast={setToast}
        onClose={() => setOpen(false)}
      />

      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

function SetupWizardModal({
  open,
  existingCompany,
  onCompanyCreated,
  onToast,
  onClose,
}: {
  open: boolean
  existingCompany: SetupCompany | null
  onCompanyCreated: (company: SetupCompany) => void
  onToast: (toast: { type: ToastType; title?: string; message: string }) => void
  onClose: () => void
}) {
  const router = useRouter()
  const [step, setStep] = useState<WizardStep>('welcome')
  const [company, setCompany] = useState(initialCompanyForm)
  const [createdCompany, setCreatedCompany] = useState<SetupCompany | null>(null)
  const [role, setRole] = useState<UserRole>('partner')
  const [person, setPerson] = useState(initialPersonForm)
  const [taxOffices, setTaxOffices] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setFormError(null)
  }, [open, step])

  useEffect(() => {
    if (!existingCompany) return
    setCreatedCompany(existingCompany)
    setCompany(current => ({
      ...current,
      trade_name: existingCompany.trade_name || current.trade_name,
      short_name: existingCompany.short_name || current.short_name,
      tax_number: existingCompany.tax_number || current.tax_number,
      tax_office: existingCompany.tax_office || current.tax_office,
      company_type: existingCompany.company_type || current.company_type,
      country: existingCompany.country || current.country,
      city: existingCompany.city || current.city,
      district: existingCompany.district || current.district,
      address: existingCompany.address || current.address,
    }))
  }, [existingCompany])

  useEffect(() => {
    let alive = true
    apiClient.get<TaxOfficesResponse>('/api/reference/tax-offices', { skipAuth: true, useCache: true })
      .then(response => {
        if (!alive) return
        const names = Array.from(new Set((response.offices || []).map(office => office.name).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr'))
        setTaxOffices(names)
      })
      .catch(() => {
        if (!alive) return
        setTaxOffices([])
      })

    return () => { alive = false }
  }, [])

  const activeIndex = useMemo(() => STEPS.findIndex(item => item.id === step), [step])
  const footer = (
    <>
      {canGoBack(step, busy) && (
        <button
          type="button"
          onClick={() => setStep(previousStep(step))}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <ArrowLeft size={16} />
          Geri
        </button>
      )}
      <button
        type="button"
        onClick={() => void handleNext()}
        disabled={busy}
        className="inline-flex min-w-28 items-center justify-center gap-2 rounded-lg bg-eden-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-eden-blue-dk disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : nextIcon(step)}
        {nextLabel(step)}
      </button>
    </>
  )

  async function handleNext() {
    if (busy) return
    setFormError(null)

    if (step === 'welcome') {
      setStep('company')
      return
    }

    if (step === 'company') {
      await submitCompany()
      return
    }

    if (step === 'role') {
      setStep('person')
      return
    }

    if (step === 'person') {
      await submitPersonRole()
      return
    }

    router.push('/app')
  }

  async function submitCompany() {
    const error = validateCompany(company)
    if (error) {
      setFormError(error)
      return
    }

    setBusy(true)
    try {
      const response = await apiClient.post<SetupCompanyResponse>(
        '/api/settings/setup-wizard',
        { action: 'create_company', company },
        { skipAuth: true }
      )
      setCreatedCompany(response.data.company)
      onCompanyCreated(response.data.company)
      if (response.data.reused) {
        onToast({ type: 'warning', title: 'Mevcut şirket kullanıldı', message: 'Sistemde kayıtlı ilk şirket bu kurulum için kullanılacak.' })
      }
      setStep('role')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Şirket kaydı oluşturulamadı.')
    } finally {
      setBusy(false)
    }
  }

  async function submitPersonRole() {
    const companyId = createdCompany?.id || existingCompany?.id
    if (!companyId) {
      setFormError('Önce şirket kaydını oluşturmalısınız.')
      return
    }

    const error = validatePerson(person)
    if (error) {
      setFormError(error)
      return
    }

    setBusy(true)
    try {
      await apiClient.post<SetupRoleResponse>(
        '/api/settings/setup-wizard',
        { action: 'create_person_role', person: { ...person, role, company_id: companyId } },
        { skipAuth: true }
      )
      setStep('success')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Gerçek kişi kaydı oluşturulamadı.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Kurulum Sihirbazı" size="xl" footer={footer}>
      <div className="space-y-5">
        <StepIndicator activeIndex={activeIndex} />

        {formError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200">
            {formError}
          </div>
        )}

        {step === 'welcome' && <WelcomeStep />}
        {step === 'company' && (
          <CompanyStep
            value={company}
            taxOffices={taxOffices}
            onChange={setCompany}
          />
        )}
        {step === 'role' && <RoleStep role={role} onChange={setRole} company={createdCompany || existingCompany} />}
        {step === 'person' && <PersonStep value={person} role={role} onChange={setPerson} />}
        {step === 'success' && <SuccessStep company={createdCompany || existingCompany} role={role} />}
      </div>
    </Modal>
  )
}

function StepIndicator({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {STEPS.map((step, index) => (
        <div key={step.id} className="min-w-0">
          <div className={cn(
            'h-1.5 rounded-full transition-colors',
            index <= activeIndex ? 'bg-eden-blue' : 'bg-gray-200 dark:bg-gray-700'
          )} />
          <p className={cn(
            'mt-2 truncate text-xs font-medium',
            index <= activeIndex ? 'text-eden-blue dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'
          )}>
            {step.label}
          </p>
        </div>
      ))}
    </div>
  )
}

function WelcomeStep() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-eden-blue/10 px-3 py-1 text-xs font-semibold text-eden-blue dark:bg-blue-500/15 dark:text-blue-300">
          <Sparkles size={14} />
          Eden ERP ilk kurulum
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Başlangıcı birlikte toparlayalım.</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
            Bu sihirbaz boş bir sistemde ilk şirket kaydını, şirketteki rolünüzü ve gerçek kişi kartınızı hızlıca oluşturur. Böylece ana sayfaya geçtiğinizde şirket, ortak/çalışan ilişkisi ve kişi kaydı hazır olur.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniInfo icon={<Building2 size={18} />} title="Şirket" text="Asgari şirket bilgileri" />
          <MiniInfo icon={<Users size={18} />} title="Rol" text="Ortak veya çalışan" />
          <MiniInfo icon={<UserRound size={18} />} title="Kişi" text="Temel gerçek kişi kartı" />
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/40">
        <div className="flex h-full min-h-52 flex-col justify-between gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white text-eden-blue shadow-sm dark:bg-gray-800 dark:text-blue-300">
            <PartyPopper size={26} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Sıradaki akış</p>
            <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-200">
              Temel kimlik sorgusu bu kurulum için atlanır; kayıtlar doğrudan master tablolara ve ilgili şirket rolüne bağlanır.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CompanyStep({
  value,
  taxOffices,
  onChange,
}: {
  value: typeof initialCompanyForm
  taxOffices: string[]
  onChange: (value: typeof initialCompanyForm) => void
}) {
  const setField = (field: keyof typeof initialCompanyForm, nextValue: string) => onChange({ ...value, [field]: nextValue })

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={<Building2 size={20} />}
        title="Şirket Tanımlama"
        text="İlk şirket kaydı için formdaki zorunlu temel alanları doldurun."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Ticari Ünvan" required>
          <input value={value.trade_name} onChange={event => setField('trade_name', event.target.value)} className={formControlClass()} />
        </Field>
        <Field label="Kısa Ünvan">
          <input value={value.short_name} onChange={event => setField('short_name', event.target.value)} className={formControlClass()} />
        </Field>
        <Field label="VKN" required>
          <input
            value={value.tax_number}
            inputMode="numeric"
            maxLength={10}
            onChange={event => setField('tax_number', onlyDigits(event.target.value, 10))}
            className={formControlClass()}
          />
        </Field>
        <Field label="Vergi Dairesi" required>
          <input
            value={value.tax_office}
            list="setup-tax-offices"
            onChange={event => setField('tax_office', event.target.value)}
            className={formControlClass({ surface: 'enum' })}
          />
          <datalist id="setup-tax-offices">
            {taxOffices.map(office => <option key={office} value={office} />)}
          </datalist>
        </Field>
        <Field label="Şirket Türü" required>
          <select value={value.company_type} onChange={event => setField('company_type', event.target.value)} className={formControlClass({ surface: 'enum' })}>
            {COMPANY_TYPES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field label="Ülke" required>
          <input value={value.country} readOnly className={formControlClass()} />
        </Field>
        <Field label="İl" required>
          <input value={value.city} onChange={event => setField('city', event.target.value)} className={formControlClass()} />
        </Field>
        <Field label="İlçe" required>
          <input value={value.district} onChange={event => setField('district', event.target.value)} className={formControlClass()} />
        </Field>
      </div>
      <Field label="Adres" required>
        <textarea value={value.address} onChange={event => setField('address', event.target.value)} rows={3} className={formControlClass({ className: 'resize-y' })} />
      </Field>
    </div>
  )
}

function RoleStep({ role, company, onChange }: { role: UserRole; company: SetupCompany | null; onChange: (role: UserRole) => void }) {
  return (
    <div className="space-y-5">
      <SectionHeader
        icon={<Users size={20} />}
        title="Şirketteki rolünüz nedir?"
        text={company ? `${company.trade_name} içindeki başlangıç rolünüzü seçin.` : 'Başlangıç rolünüzü seçin.'}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <RoleCard
          selected={role === 'partner'}
          icon={<Users size={24} />}
          title="Ortak"
          text="Gerçek kişi kartınız şirket ortağı olarak bağlanır."
          onClick={() => onChange('partner')}
        />
        <RoleCard
          selected={role === 'employee'}
          icon={<UserRound size={24} />}
          title="Çalışan"
          text="Gerçek kişi kartınız aktif çalışan olarak bağlanır."
          onClick={() => onChange('employee')}
        />
      </div>
    </div>
  )
}

function PersonStep({
  value,
  role,
  onChange,
}: {
  value: typeof initialPersonForm
  role: UserRole
  onChange: (value: typeof initialPersonForm) => void
}) {
  const setField = (field: keyof typeof initialPersonForm, nextValue: string) => onChange({ ...value, [field]: nextValue })

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={<UserRound size={20} />}
        title="Gerçek Kişi"
        text={`Bu kişi ${role === 'partner' ? 'ortak' : 'çalışan'} rolüyle şirkete bağlanacak.`}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Ad" required>
          <input value={value.first_name} onChange={event => setField('first_name', event.target.value)} className={formControlClass()} />
        </Field>
        <Field label="Soyad" required>
          <input value={value.last_name} onChange={event => setField('last_name', event.target.value)} className={formControlClass()} />
        </Field>
        <Field label="TC Kimlik No" required>
          <input
            value={value.national_id}
            inputMode="numeric"
            maxLength={11}
            onChange={event => setField('national_id', onlyDigits(event.target.value, 11))}
            className={formControlClass()}
          />
        </Field>
        <Field label="Cinsiyet" required>
          <select value={value.gender} onChange={event => setField('gender', event.target.value)} className={formControlClass({ surface: 'enum' })}>
            <option value="male">Erkek</option>
            <option value="female">Kadın</option>
          </select>
        </Field>
        <Field label="E-posta">
          <input value={value.email} type="email" onChange={event => setField('email', event.target.value)} className={formControlClass()} />
        </Field>
        <Field label="Telefon">
          <input value={value.phone} onChange={event => setField('phone', event.target.value)} className={formControlClass()} />
        </Field>
      </div>
    </div>
  )
}

function SuccessStep({ company, role }: { company: SetupCompany | null; role: UserRole }) {
  return (
    <div className="mx-auto max-w-2xl py-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        <CheckCircle2 size={34} />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">Kurulumunuz başarıyla tamamlanmıştır.</h2>
      <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
        {company ? `${company.trade_name} için ilk kayıtlar hazırlandı.` : 'İlk kayıtlar hazırlandı.'} Ana sayfaya geçtiğinizde şirket ve {role === 'partner' ? 'ortak' : 'çalışan'} bağlantınız kullanılabilir durumda olacak.
      </p>
    </div>
  )
}

function MiniInfo({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/50">
      <div className="text-eden-blue dark:text-blue-300">{icon}</div>
      <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{text}</p>
    </div>
  )
}

function SectionHeader({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-eden-blue/10 text-eden-blue dark:bg-blue-500/15 dark:text-blue-300">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{text}</p>
      </div>
    </div>
  )
}

function RoleCard({
  selected,
  icon,
  title,
  text,
  onClick,
}: {
  selected: boolean
  icon: React.ReactNode
  title: string
  text: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border p-5 text-left transition-colors',
        selected
          ? 'border-eden-blue bg-blue-50 text-eden-blue shadow-sm dark:border-blue-400 dark:bg-blue-950/30 dark:text-blue-200'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200 dark:hover:bg-gray-800'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-eden-blue shadow-sm dark:bg-gray-800 dark:text-blue-300">
          {icon}
        </div>
        {selected && <CheckCircle2 size={20} />}
      </div>
      <p className="mt-4 text-base font-semibold">{title}</p>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{text}</p>
    </button>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">
        {label}{required ? ' *' : ''}
      </span>
      {children}
    </label>
  )
}

function canGoBack(step: WizardStep, busy: boolean) {
  if (busy) return false
  return step === 'company' || step === 'person'
}

function previousStep(step: WizardStep): WizardStep {
  if (step === 'person') return 'role'
  return 'welcome'
}

function nextLabel(step: WizardStep) {
  if (step === 'company') return 'Şirketi Oluştur'
  if (step === 'person') return 'Kişiyi Oluştur'
  if (step === 'success') return 'Tamam'
  return 'İleri'
}

function nextIcon(step: WizardStep) {
  if (step === 'success') return <CheckCircle2 size={16} />
  return <ArrowRight size={16} />
}

function onlyDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

function validateCompany(company: typeof initialCompanyForm) {
  if (company.trade_name.trim().length < 2) return 'Ticari ünvan zorunludur.'
  if (!/^\d{10}$/.test(company.tax_number)) return 'VKN 10 haneli olmalıdır.'
  if (company.tax_office.trim().length < 2) return 'Vergi dairesi zorunludur.'
  if (company.company_type.trim().length < 2) return 'Şirket türü zorunludur.'
  if (company.city.trim().length < 2) return 'İl zorunludur.'
  if (company.district.trim().length < 2) return 'İlçe zorunludur.'
  if (company.address.trim().length < 5) return 'Adres zorunludur.'
  return null
}

function validatePerson(person: typeof initialPersonForm) {
  if (person.first_name.trim().length < 2) return 'Ad zorunludur.'
  if (person.last_name.trim().length < 2) return 'Soyad zorunludur.'
  if (!/^\d{11}$/.test(person.national_id)) return 'TC kimlik no 11 haneli olmalıdır.'
  if (!['male', 'female'].includes(person.gender)) return 'Cinsiyet zorunludur.'
  if (person.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email)) return 'E-posta adresi geçerli değil.'
  return null
}
