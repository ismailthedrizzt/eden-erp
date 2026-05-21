'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import PageBanner from '@/components/ui/PageBanner'
import Modal from '@/components/ui/Modal'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { formControlClass, type FormControlState } from '@/components/ui/formControlStyles'
import { apiClient } from '@/lib/api/apiClient'
import { cn } from '@/lib/utils'

type WizardStep = 'welcome' | 'company' | 'scale' | 'role' | 'person' | 'review' | 'success'
type UserRole = 'partner' | 'employee'
type CompanyScale = 'small' | 'medium' | 'corporate' | 'enterprise'

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

type SetupPackageResponse = {
  data: {
    company: SetupCompany
    scale: CompanyScale
    company_reused: boolean
    role: UserRole
    role_reused: boolean
  }
}

type TaxOfficesResponse = {
  offices?: { name: string; province?: string; district?: string }[]
}

type TurkeyDistrict = {
  id: number
  name: string
}

type TurkeyProvince = {
  id: number
  name: string
  districts: TurkeyDistrict[]
}

type TurkeyLocationsResponse = {
  provinces?: TurkeyProvince[]
}

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'welcome', label: 'Karşılama' },
  { id: 'company', label: 'Şirket' },
  { id: 'scale', label: 'Ölçek' },
  { id: 'role', label: 'Rol' },
  { id: 'person', label: 'Kişi' },
  { id: 'review', label: 'Paket' },
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

function personFormWithSignupIdentity(signupIdentity?: string | null) {
  const value = String(signupIdentity || '').trim()
  const base = { ...initialPersonForm }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { ...base, email: value.toLowerCase() }
  }

  const phone = value.replace(/\s/g, '')
  if (/^[0-9]{10,11}$/.test(phone)) {
    return { ...base, phone }
  }

  return base
}

const SCALE_OPTIONS: Array<{
  value: CompanyScale
  eyebrow: string
  title: string
  userRange: string
  companyRange: string
  description: string
  authorizationManagement: boolean
  workflowManagement: boolean
  multiCompany: boolean
  bullets: string[]
}> = [
  {
    value: 'small',
    eyebrow: 'Kart 1',
    title: 'Küçük',
    userRange: '1–5 Kullanıcı',
    companyRange: 'Tek şirket',
    description: 'Sade ve hızlı başlangıç için uygundur.',
    authorizationManagement: false,
    workflowManagement: false,
    multiCompany: false,
    bullets: [
      'Tek şirket yönetimi',
      'Yetki yönetimi yok',
      'Süreç yönetimi yok',
      'Temel ERP kullanımı',
    ],
  },
  {
    value: 'medium',
    eyebrow: 'Kart 2',
    title: 'Orta',
    userRange: '6–25 Kullanıcı',
    companyRange: '1–3 şirket',
    description: 'Büyüyen ekipler ve birkaç şirketli yapılar için uygundur.',
    authorizationManagement: true,
    workflowManagement: false,
    multiCompany: false,
    bullets: [
      '1–3 şirket yönetimi',
      'Yetki yönetimi var',
      'Süreç yönetimi yok',
      'Mali müşavir / dış paydaş erişimi',
      'Temel raporlama ve takip',
    ],
  },
  {
    value: 'corporate',
    eyebrow: 'Kart 3',
    title: 'Kurumsal',
    userRange: '26–300 Kullanıcı',
    companyRange: '1–10 şirket',
    description: 'Departmanlı yapılar ve çok şirketli yönetim için uygundur.',
    authorizationManagement: true,
    workflowManagement: true,
    multiCompany: false,
    bullets: [
      '1–10 şirket yönetimi',
      'Yetki yönetimi var',
      'Süreç yönetimi var',
      'Mali müşavir, danışman ve dış paydaş erişimi',
      'Rol bazlı raporlama ve onay süreçleri',
    ],
  },
  {
    value: 'enterprise',
    eyebrow: 'Kart 4',
    title: 'Holding / Grup',
    userRange: '301+ Kullanıcı',
    companyRange: '10+ şirket',
    description: 'Çok şirketli grup yapıları ve geniş paydaş ağı için tasarlanmıştır.',
    authorizationManagement: true,
    workflowManagement: true,
    multiCompany: true,
    bullets: [
      '10+ şirket yönetimi',
      'Gelişmiş yetki yönetimi',
      'Gelişmiş süreç yönetimi',
      'Grup şirketleri, mali müşavirler ve dış paydaşlarla birlikte çalışma',
      'Konsolide raporlama ve merkezi yönetim',
    ],
  },
]

export default function SetupWizardPage() {
  const searchParams = useSearchParams()
  const signupIdentity = searchParams.get('signupIdentity')
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
        signupIdentity={signupIdentity}
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
  signupIdentity,
  onCompanyCreated,
  onToast,
  onClose,
}: {
  open: boolean
  existingCompany: SetupCompany | null
  signupIdentity?: string | null
  onCompanyCreated: (company: SetupCompany) => void
  onToast: (toast: { type: ToastType; title?: string; message: string }) => void
  onClose: () => void
}) {
  const router = useRouter()
  const [step, setStep] = useState<WizardStep>('welcome')
  const [company, setCompany] = useState(initialCompanyForm)
  const [scale, setScale] = useState<CompanyScale>('small')
  const [createdCompany, setCreatedCompany] = useState<SetupCompany | null>(null)
  const [role, setRole] = useState<UserRole>('partner')
  const [person, setPerson] = useState(() => personFormWithSignupIdentity(signupIdentity))
  const [taxOffices, setTaxOffices] = useState<string[]>([])
  const [turkeyProvinces, setTurkeyProvinces] = useState<TurkeyProvince[]>([])
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setFormError(null)
  }, [open, step])

  useEffect(() => {
    const identityPerson = personFormWithSignupIdentity(signupIdentity)
    if (!identityPerson.email && !identityPerson.phone) return

    setPerson(current => ({
      ...current,
      email: current.email || identityPerson.email,
      phone: current.phone || identityPerson.phone,
    }))
  }, [signupIdentity])

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
      city: existingCompany.city || current.city,
      district: existingCompany.district || current.district,
      address: existingCompany.address || current.address,
    }))
  }, [existingCompany])

  useEffect(() => {
    let alive = true
    Promise.allSettled([
      apiClient.get<TaxOfficesResponse>('/api/reference/tax-offices', { skipAuth: true, useCache: true }),
      apiClient.get<TurkeyLocationsResponse>('/api/reference/turkey-locations', { skipAuth: true, useCache: true }),
    ])
      .then(([taxOfficesResult, locationsResult]) => {
        if (!alive) return
        const taxOfficesResponse = taxOfficesResult.status === 'fulfilled' ? taxOfficesResult.value : null
        const locationsResponse = locationsResult.status === 'fulfilled' ? locationsResult.value : null
        const names = Array.from(new Set((taxOfficesResponse?.offices || []).map(office => office.name).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr'))
        setTaxOffices(names)
        setTurkeyProvinces(Array.isArray(locationsResponse?.provinces) ? locationsResponse.provinces : [])
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
      collectCompany()
      return
    }

    if (step === 'scale') {
      setStep('role')
      return
    }

    if (step === 'role') {
      setStep('person')
      return
    }

    if (step === 'person') {
      collectPerson()
      return
    }

    if (step === 'review') {
      await submitSetupPackage()
      return
    }

    router.push('/app')
  }

  function collectCompany() {
    const error = validateCompany(company)
    if (error) {
      setFormError(error)
      return
    }

    setStep('scale')
  }

  function collectPerson() {
    const error = validatePerson(person)
    if (error) {
      setFormError(error)
      return
    }

    setStep('review')
  }

  async function submitSetupPackage() {
    const companyError = validateCompany(company)
    if (companyError) {
      setFormError(companyError)
      setStep('company')
      return
    }

    const personError = validatePerson(person)
    if (personError) {
      setFormError(personError)
      setStep('person')
      return
    }

    setBusy(true)
    try {
      const response = await apiClient.post<SetupPackageResponse>(
        '/api/settings/setup-wizard',
        { action: 'complete_setup', company, scale, person: { ...person, role } },
        { skipAuth: true }
      )
      setCreatedCompany(response.data.company)
      onCompanyCreated(response.data.company)
      if (response.data.company_reused) {
        onToast({ type: 'warning', title: 'Mevcut şirket kullanıldı', message: 'Sistemde kayıtlı ilk şirket bu kurulum paketi için kullanıldı.' })
      }
      setStep('success')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Kurulum paketi işlenemedi.')
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
            turkeyProvinces={turkeyProvinces}
            onChange={setCompany}
          />
        )}
        {step === 'scale' && <ScaleStep value={scale} onChange={setScale} />}
        {step === 'role' && <RoleStep role={role} onChange={setRole} companyName={company.trade_name || existingCompany?.trade_name} />}
        {step === 'person' && <PersonStep value={person} role={role} onChange={setPerson} />}
        {step === 'review' && <ReviewStep company={company} scale={scale} person={person} role={role} />}
        {step === 'success' && <SuccessStep company={createdCompany || existingCompany} role={role} />}
      </div>
    </Modal>
  )
}

function StepIndicator({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))` }}>
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
    <div className="space-y-4">
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Eden ERP’nin İnanılmaz Dünyasına Hoş Geldiniz</h2>
        <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
          İşletmenizin bugünkü ihtiyaçlarını karşılamak ve yarının büyümesine hazır olmak için tasarlanan Eden ERP’ye hoş geldiniz.
        </p>
        <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
          Eden ERP; Türkiye’deki küçük şirketlerin basit ve hızlı yönetilmesi gereken günlük süreçlerinden, holdinglerin çok şirketli, çok kullanıcılı ve karmaşık operasyonlarına kadar farklı ölçeklerdeki tüm yapılara uyum sağlayan yeni nesil bir iş yönetim platformudur.
        </p>
        <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
          AI destekli akıllı yapısı sayesinde verilerinizi yalnızca kaydetmekle kalmaz; süreçlerinizi anlamlandırır, iş akışlarınızı kolaylaştırır ve karar alma süreçlerinizi güçlendirir. Banka Native mimarisiyle finansal hareketlerinizi ERP’nizin doğal bir parçası haline getirerek, muhasebe ve operasyon süreçlerinde daha hızlı, daha güvenilir ve daha bütünleşik bir deneyim sunar.
        </p>
        <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
          Şimdi şirketinizi tanımaya, süreçlerinizi yapılandırmaya ve Eden ERP’yi işinize en uygun şekilde hazırlamaya başlayalım.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniInfo icon={<Building2 size={18} />} title="Her Ölçekte Uyum" />
        <MiniInfo icon={<Users size={18} />} title="AI destekli yapı" />
        <MiniInfo icon={<UserRound size={18} />} title="Bank Native" />
      </div>
    </div>
  )
}

function CompanyStep({
  value,
  taxOffices,
  turkeyProvinces,
  onChange,
}: {
  value: typeof initialCompanyForm
  taxOffices: string[]
  turkeyProvinces: TurkeyProvince[]
  onChange: (value: typeof initialCompanyForm) => void
}) {
  const setField = (field: keyof typeof initialCompanyForm, nextValue: string) => onChange({ ...value, [field]: nextValue })
  const selectedProvince = useMemo(() => findTurkeyProvince(turkeyProvinces, value.city), [turkeyProvinces, value.city])
  const selectedDistrict = useMemo(
    () => selectedProvince?.districts.find(district => normalizeTurkeyLocationName(district.name) === normalizeTurkeyLocationName(value.district)),
    [selectedProvince, value.district]
  )
  const cityValue = selectedProvince?.name || value.city
  const districtValue = selectedDistrict?.name || value.district

  const setCity = (nextCity: string) => {
    const nextProvince = findTurkeyProvince(turkeyProvinces, nextCity)
    const keepDistrict = nextProvince?.districts.some(district => normalizeTurkeyLocationName(district.name) === normalizeTurkeyLocationName(value.district))
    onChange({ ...value, city: nextProvince?.name || nextCity, district: keepDistrict ? value.district : '' })
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={<Building2 size={20} />}
        title="Önce şirketinizle tanışalım"
        text="Lütfen Zorunlu alanları doldurun"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Ticari Ünvan" required state={requiredFieldState(value.trade_name)}>
          <input value={value.trade_name} onChange={event => setField('trade_name', event.target.value)} className={requiredControlClass(value.trade_name)} />
        </Field>
        <Field label="Kısa Ünvan">
          <input value={value.short_name} onChange={event => setField('short_name', event.target.value)} className={formControlClass()} />
        </Field>
        <Field label="VKN" required state={requiredFieldState(value.tax_number)}>
          <input
            value={value.tax_number}
            inputMode="numeric"
            maxLength={10}
            onChange={event => setField('tax_number', onlyDigits(event.target.value, 10))}
            className={requiredControlClass(value.tax_number)}
          />
        </Field>
        <Field label="Vergi Dairesi" required state={requiredFieldState(value.tax_office)}>
          <input
            value={value.tax_office}
            list="setup-tax-offices"
            onChange={event => setField('tax_office', event.target.value)}
            className={requiredControlClass(value.tax_office, { surface: 'enum' })}
          />
          <datalist id="setup-tax-offices">
            {taxOffices.map(office => <option key={office} value={office} />)}
          </datalist>
        </Field>
        <Field label="Şirket Türü" required state={requiredFieldState(value.company_type)}>
          <select value={value.company_type} onChange={event => setField('company_type', event.target.value)} className={requiredControlClass(value.company_type, { surface: 'enum' })}>
            {COMPANY_TYPES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </Field>
        <Field label="İl" required state={requiredFieldState(cityValue)}>
          <select value={cityValue} onChange={event => setCity(event.target.value)} className={requiredControlClass(cityValue, { surface: 'enum' })}>
            <option value="">İl seçiniz</option>
            {value.city && !selectedProvince && <option value={value.city}>{value.city}</option>}
            {turkeyProvinces.map(province => <option key={province.id} value={province.name}>{province.name}</option>)}
          </select>
        </Field>
        <Field label="İlçe" required state={requiredFieldState(districtValue)}>
          <select
            value={districtValue}
            onChange={event => setField('district', event.target.value)}
            disabled={!selectedProvince}
            className={requiredControlClass(districtValue, { surface: 'enum' })}
          >
            <option value="">{selectedProvince ? 'İlçe seçiniz' : 'Önce il seçiniz'}</option>
            {value.district && selectedProvince && !selectedDistrict && <option value={value.district}>{value.district}</option>}
            {selectedProvince?.districts.map(district => <option key={district.id} value={district.name}>{district.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Adres" required state={requiredFieldState(value.address)}>
        <textarea value={value.address} onChange={event => setField('address', event.target.value)} rows={3} className={requiredControlClass(value.address, { className: 'resize-y' })} />
      </Field>
    </div>
  )
}

function ScaleStep({ value, onChange }: { value: CompanyScale; onChange: (value: CompanyScale) => void }) {
  return (
    <div className="space-y-5">
      <SectionHeader
        icon={<Users size={20} />}
        title="Şirketinizin ölçeğini ve birlikte çalışma ihtiyacını belirleyiniz"
        text="Eden ERP; şirketinizi, bağlı işletmelerinizi ve iş ortaklarınızı aynı yapı içinde yönetebilmeniz için tasarlanmıştır. Kullanıcı sayınızı, şirket sayınızı ve paydaş erişim ihtiyacınızı seçiniz."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {SCALE_OPTIONS.map(option => (
          <ScaleCard
            key={option.value}
            option={option}
            selected={value === option.value}
            onClick={() => onChange(option.value)}
          />
        ))}
      </div>
    </div>
  )
}

function ScaleCard({
  option,
  selected,
  onClick,
}: {
  option: (typeof SCALE_OPTIONS)[number]
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-full flex-col rounded-lg border p-5 text-left transition-colors',
        selected
          ? 'border-eden-blue bg-blue-50 text-eden-blue shadow-sm dark:border-blue-400 dark:bg-blue-950/30 dark:text-blue-200'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200 dark:hover:bg-gray-800'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{option.eyebrow}</p>
          <h3 className="mt-2 text-base font-bold text-gray-900 dark:text-white">{option.title}</h3>
          <p className="mt-1 text-sm font-semibold text-eden-blue dark:text-blue-300">{option.userRange}</p>
          <p className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-200">{option.companyRange}</p>
        </div>
        {selected && <CheckCircle2 size={20} className="flex-shrink-0" />}
      </div>
      <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">{option.description}</p>
      <ul className="mt-4 space-y-2 text-sm leading-5 text-gray-600 dark:text-gray-300">
        {option.bullets.map(bullet => (
          <li key={bullet} className="flex gap-2">
            <CheckCircle2 size={15} className={cn(
              'mt-0.5 flex-shrink-0',
              selected ? 'text-eden-blue dark:text-blue-300' : 'text-emerald-600 dark:text-emerald-400'
            )} />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </button>
  )
}

function RoleStep({
  role,
  companyName,
  onChange,
}: {
  role: UserRole
  companyName?: string | null
  onChange: (role: UserRole) => void
}) {
  return (
    <div className="space-y-5">
      <SectionHeader
        icon={<Users size={20} />}
        title="Şirketteki rolünüz nedir?"
        text={companyName ? `${companyName} içindeki başlangıç rolünüzü seçin.` : 'Başlangıç rolünüzü seçin.'}
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
        <Field label="Ad" required state={requiredFieldState(value.first_name)}>
          <input value={value.first_name} onChange={event => setField('first_name', event.target.value)} className={requiredControlClass(value.first_name)} />
        </Field>
        <Field label="Soyad" required state={requiredFieldState(value.last_name)}>
          <input value={value.last_name} onChange={event => setField('last_name', event.target.value)} className={requiredControlClass(value.last_name)} />
        </Field>
        <Field label="TC Kimlik No" required state={requiredFieldState(value.national_id)}>
          <input
            value={value.national_id}
            inputMode="numeric"
            maxLength={11}
            onChange={event => setField('national_id', onlyDigits(event.target.value, 11))}
            className={requiredControlClass(value.national_id)}
          />
        </Field>
        <Field label="Cinsiyet" required state={requiredFieldState(value.gender)}>
          <select value={value.gender} onChange={event => setField('gender', event.target.value)} className={requiredControlClass(value.gender, { surface: 'enum' })}>
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

function ReviewStep({
  company,
  scale,
  person,
  role,
}: {
  company: typeof initialCompanyForm
  scale: CompanyScale
  person: typeof initialPersonForm
  role: UserRole
}) {
  const fullName = [person.first_name, person.last_name].filter(Boolean).join(' ')
  const scaleOption = getScaleOption(scale)

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={<CheckCircle2 size={20} />}
        title="Kurulum paketi hazır"
        text="Şirket ve kişi bilgileri son adımda tek paket olarak işlenecek."
      />
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem title="Şirket" value={company.trade_name || 'Tanımlanmadı'} detail={company.tax_number || 'VKN yok'} />
        <SummaryItem title="Ölçek" value={scaleOption.title} detail={`${scaleOption.userRange} · ${scaleOption.companyRange}`} />
        <SummaryItem title="Rol" value={roleLabel(role)} detail="Şirkete bağlanacak başlangıç rolü" />
        <SummaryItem title="Kişi" value={fullName || 'Tanımlanmadı'} detail={person.national_id || 'TC Kimlik No yok'} />
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

function MiniInfo({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/50">
      <div className="text-eden-blue dark:text-blue-300">{icon}</div>
      <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
    </div>
  )
}

function SummaryItem({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/50">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{detail}</p>
    </div>
  )
}

function roleLabel(role: UserRole) {
  return role === 'partner' ? 'Ortak' : 'Çalışan'
}

function getScaleOption(scale: CompanyScale) {
  return SCALE_OPTIONS.find(option => option.value === scale) || SCALE_OPTIONS[0]
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

function Field({
  label,
  required,
  state = 'neutral',
  children,
}: {
  label: string
  required?: boolean
  state?: FormControlState
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className={cn(
        'mb-1.5 block text-xs font-semibold',
        state === 'invalid'
          ? 'text-red-700 dark:text-red-400'
          : state === 'valid'
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-gray-600 dark:text-gray-300'
      )}>
        {label}{required ? ' *' : ''}
      </span>
      {children}
    </label>
  )
}

function requiredFieldState(value?: string | null): FormControlState {
  return String(value || '').trim().length > 0 ? 'valid' : 'invalid'
}

function requiredControlClass(
  value: string | null | undefined,
  options: { surface?: 'default' | 'enum'; className?: string } = {}
) {
  return formControlClass({ ...options, state: requiredFieldState(value) })
}

function canGoBack(step: WizardStep, busy: boolean) {
  if (busy) return false
  return step === 'company' || step === 'scale' || step === 'role' || step === 'person' || step === 'review'
}

function previousStep(step: WizardStep): WizardStep {
  if (step === 'review') return 'person'
  if (step === 'person') return 'role'
  if (step === 'role') return 'scale'
  if (step === 'scale') return 'company'
  return 'welcome'
}

function nextLabel(step: WizardStep) {
  if (step === 'person') return 'Pakete Al'
  if (step === 'review') return 'Paketi İşle'
  if (step === 'success') return 'Tamam'
  return 'İleri'
}

function nextIcon(step: WizardStep) {
  if (step === 'review' || step === 'success') return <CheckCircle2 size={16} />
  return <ArrowRight size={16} />
}

function onlyDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

function findTurkeyProvince(provinces: TurkeyProvince[], value?: string | null) {
  const normalizedValue = normalizeTurkeyLocationName(value)
  if (!normalizedValue) return undefined
  return provinces.find(province => normalizeTurkeyLocationName(province.name) === normalizedValue)
}

function normalizeTurkeyLocationName(value?: string | null) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR')
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
