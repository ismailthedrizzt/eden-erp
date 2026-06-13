'use client'


import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Circle,
  CreditCard,
  AlertCircle,
  Loader2,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import PageBanner from '@/components/ui/PageBanner'
import Modal from '@/components/ui/Modal'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { formControlClass, type FormControlState } from '@/components/ui/formControlStyles'
import { TenantReadinessPanel } from '@/components/setup/TenantReadinessPanel'
import { appSistemKurulumPageContract } from '@/contracts/pages/generated/app-sistem-kurulum.page.contract'
import { appSistemKurulumLifecycleContract } from '@/contracts/pages/generated/app-sistem-kurulum.lifecycle.contract'
import { apiClient } from '@/lib/api/apiClient'
import { setStoredTenantId } from '@/lib/tenancy/client'
import { cn } from '@/lib/utils'

const SETUP_CONTRACT_ROUTE = appSistemKurulumPageContract.route
const SETUP_OPERATION_TYPES = appSistemKurulumLifecycleContract.operationTypes

type WizardStep = 'welcome' | 'scale' | 'company' | 'role' | 'person' | 'review' | 'payment'
type VisualWizardStep = 'welcome' | 'company' | 'person' | 'review' | 'payment'
type UserRole = 'partner' | 'employee'
type CompanyScale = 'micro' | 'small' | 'medium' | 'large' | 'enterprise'
type PaymentChoice = 'pay_now' | 'demo'
type SetupProgressKey =
  | 'core'
  | 'workspace'
  | 'vault'
  | 'tables'
  | 'firstRecords'
  | 'permissions'
  | 'security'
  | 'companyIdentity'
  | 'engine'
  | 'ready'
type SetupProgressStatus = 'pending' | 'active' | 'done' | 'error'

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
    tenant: {
      id: string
      name: string
      tenant_key?: string | null
    }
    company: SetupCompany
    scale: CompanyScale
    payment_choice: PaymentChoice
    company_reused: boolean
    role: UserRole
    role_reused: boolean
  }
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

const STEPS: { id: VisualWizardStep; label: string }[] = [
  { id: 'welcome', label: 'Karşılama' },
  { id: 'company', label: 'Şirket' },
  { id: 'person', label: 'Kişi' },
  { id: 'review', label: 'Özet' },
  { id: 'payment', label: 'Ödeme' },
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

const SETUP_PROGRESS_STEPS: Array<{ key: SetupProgressKey; label: string; description: string }> = [
  { key: 'core', label: 'Eden çekirdeği uyandırılıyor...', description: 'Kurulum başlatıldı. Birazdan şirketiniz için özel alan hazırlanacak.' },
  { key: 'workspace', label: 'Çalışma alanınız hazırlanıyor...', description: 'Şirketinizin işlemleri için size özel bir alan oluşturuluyor.' },
  { key: 'vault', label: 'Veri kasanız oluşturuluyor...', description: 'Bilgilerinizin güvenli ve düzenli şekilde saklanacağı yapı hazırlanıyor.' },
  { key: 'tables', label: 'Tablolar yerlerine diziliyor...', description: 'Şirketler, kişiler, kullanıcılar ve temel kayıt alanları düzenleniyor.' },
  { key: 'firstRecords', label: 'Boş ERP olmaz, ilk kayıtları içeri alıyoruz...', description: 'Başlangıç ayarları ve temel bilgiler sisteme ekleniyor.' },
  { key: 'permissions', label: 'Yetkileri dağıtıyoruz. Herkese master key yok...', description: 'Kimin neyi görebileceği ve hangi işlemleri yapabileceği hazırlanıyor.' },
  { key: 'security', label: 'Veri kapılarını kilitliyoruz...', description: 'Güvenlik kontrolleri yapılıyor ve erişim sınırları netleştiriliyor.' },
  { key: 'companyIdentity', label: 'Şirket kimliği hazırlanıyor...', description: 'Şirket profiliniz ve temel çalışma ayarlarınız düzenleniyor.' },
  { key: 'engine', label: 'ERP motoruna ilk marş veriliyor...', description: 'Sistem bağlantıları ve başlangıç kontrolleri tamamlanıyor.' },
  { key: 'ready', label: 'Eden hazır. İşleri düzene koymaya başlayabiliriz.', description: 'İlk kurulum başarıyla tamamlandı.' },
]

const SETUP_MODULE_CARDS = [
  'Çalışma Alanı',
  'Şirket Bilgileri',
  'Kullanıcılar',
  'Yetkiler',
  'Kişiler ve Kurumlar',
  'Muhasebe Başlangıcı',
  'Sistem Ayarları',
  'Güvenlik Kontrolleri',
]

const SETUP_DETAIL_ITEMS = [
  'Çalışma alanı hazırlandı',
  'Veri kasası oluşturuldu',
  'Şirket bilgileri yerleştirildi',
  'Kullanıcı rolleri hazırlandı',
  'Yetki kuralları ayarlandı',
  'Başlangıç kayıtları eklendi',
  'Güvenlik kontrolleri tamamlandı',
]

const READINESS_PROGRESS_STEPS: Array<{ key: SetupProgressKey; label: string; description: string }> = [
  { key: 'core', label: 'Calisma alaniniz hazirlaniyor...', description: 'Kurulum baslatildi. Birazdan sirketiniz icin ozel calisma alani hazirlanacak.' },
  { key: 'workspace', label: 'Sirket kayit alanlari kontrol ediliyor...', description: 'Sirket kartlari ve ilk kayit akisi gozden geciriliyor.' },
  { key: 'vault', label: 'Gizlilik ve erisim sinirlari hazirlaniyor...', description: 'Kullanicilarin dogru kayitlara erismesi icin temel kontroller ayarlaniyor.' },
  { key: 'tables', label: 'Sube ve organizasyon baglantilari hazirlaniyor...', description: 'Sube, organizasyon ve lokasyon baglantilari uygun sekilde kontrol ediliyor.' },
  { key: 'firstRecords', label: 'Baslangic ayarlari tamamlaniyor...', description: 'Varsayilan para birimi, dil ve ilk sirket bilgileri hazirlaniyor.' },
  { key: 'permissions', label: 'Yetki ve islem yollari kontrol ediliyor...', description: 'Kimin hangi islemi baslatabilecegi sade kurallarla hazirlaniyor.' },
  { key: 'security', label: 'Guvenli calisma kontrolleri yapiliyor...', description: 'Calisma alani sinirlari ve moduller arasi baglantilar kontrol ediliyor.' },
  { key: 'companyIdentity', label: 'Sirket kimligi hazirlaniyor...', description: 'Sirket profiliniz ve temel calisma ayarlariniz duzenleniyor.' },
  { key: 'engine', label: 'Moduller hazirlik kontrolunden geciyor...', description: 'Aktif moduller kullanima hazir mi diye kontrol ediliyor.' },
  { key: 'ready', label: 'Hazir oldugunuzda baslayabilirsiniz.', description: 'Ilk kurulum basariyla tamamlandi.' },
]

const READINESS_DETAIL_ITEMS = [
  'Calisma alani hazirlandi',
  'Sirket kayitlari kontrol edildi',
  'Sube ve organizasyon baglantilari gozden gecirildi',
  'Kullanici rolleri hazirlandi',
  'Yetki kurallari ayarlandi',
  'Baslangic ayarlari eklendi',
  'Guvenli calisma kontrolleri tamamlandi',
]

function initialSetupProgress() {
  return READINESS_PROGRESS_STEPS.map(step => ({ ...step, status: 'pending' as SetupProgressStatus }))
}

function progressStepsForIndex(activeIndex: number) {
  return READINESS_PROGRESS_STEPS.map((step, index) => ({
    ...step,
    status: index < activeIndex
      ? 'done' as const
      : index === activeIndex
        ? 'active' as const
        : 'pending' as const,
  }))
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
    value: 'micro',
    title: 'Mikro İşletme',
    userRange: '1-3 Kullanıcı',
    companyRange: 'Tek şirket',
    description: 'Basit şirket, cari ve belge takibi için sade başlangıç paketidir.',
    authorizationManagement: false,
    workflowManagement: false,
    multiCompany: false,
    bullets: [
      'Tek şirket yönetimi',
      'Cari hesap ve hareket takibi',
      'Temel belge takibi',
      'Basit raporlama',
    ],
  },
  {
    value: 'small',
    title: 'Küçük İşletme',
    userRange: '4-10 Kullanıcı',
    companyRange: '1-2 şirket',
    description: 'Şirket, ortak, temsilci, şube, çalışan ve temel operasyonlar için uygundur.',
    authorizationManagement: false,
    workflowManagement: false,
    multiCompany: false,
    bullets: [
      'Şirket ve şube yönetimi',
      'Ortak ve temsilci kayıtları',
      'Temel IK ve belge akışı',
      'Action Center başlangıcı',
    ],
  },
  {
    value: 'medium',
    title: 'Orta İşletme',
    userRange: '11-50 Kullanıcı',
    companyRange: '1-5 şirket',
    description: 'Çok şirketli yapı, IK, muhasebe, belge, görev ve audit kapsamı için uygundur.',
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
    value: 'large',
    title: 'Büyük İşletme',
    userRange: '51-300 Kullanıcı',
    companyRange: '1-20 şirket',
    description: 'CRM, satış sonrası, ürün/hizmet, raporlama ve gelişmiş süreçler için uygundur.',
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
    title: 'Enterprise',
    userRange: '301+ Kullanıcı',
    companyRange: 'Özel kapsam',
    description: 'Portal, entegrasyon, otomasyon, AI, gelişmiş raporlama ve özel yapılandırma için tasarlanmıştır.',
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
  return (
    <Suspense fallback={null}>
      <SetupWizardContent />
    </Suspense>
  )
}

function SetupWizardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const signupIdentity = searchParams.get('signupIdentity')
  const isSignupFlow = Boolean(signupIdentity)
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
    <div data-contract-route={SETUP_CONTRACT_ROUTE} data-contract-operations={SETUP_OPERATION_TYPES.join(',')}>
      <PageBanner
        mode="list"
        title="Kurulum Merkezi"
        subtitle="Çalışma alanı hazırlığını, modül durumlarını ve eksik kurulum adımlarını tek ekrandan izleyin."
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

      <TenantReadinessPanel />

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
        onClose={() => {
          if (isSignupFlow) {
            router.push('/login')
            return
          }

          setOpen(false)
        }}
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
  const [scale, setScale] = useState<CompanyScale>('micro')
  const [role, setRole] = useState<UserRole>('partner')
  const [person, setPerson] = useState(() => personFormWithSignupIdentity(signupIdentity))
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('demo')
  const [turkeyProvinces, setTurkeyProvinces] = useState<TurkeyProvince[]>([])
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [progressOpen, setProgressOpen] = useState(false)
  const [progressError, setProgressError] = useState<string | null>(null)
  const [progressSteps, setProgressSteps] = useState(initialSetupProgress)
  const progressTimers = useRef<number[]>([])
  const lockedSignupIdentity = useMemo(() => personFormWithSignupIdentity(signupIdentity), [signupIdentity])

  useEffect(() => {
    if (!open) return
    setFormError(null)
  }, [open, step])

  useEffect(() => () => clearProgressTimers(), [])

  useEffect(() => {
    if (!lockedSignupIdentity.email && !lockedSignupIdentity.phone) return

    setPerson(current => ({
      ...current,
      email: lockedSignupIdentity.email || current.email,
      phone: lockedSignupIdentity.phone || current.phone,
    }))
  }, [lockedSignupIdentity])

  useEffect(() => {
    if (signupIdentity) return
    if (!existingCompany) return
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
  }, [existingCompany, signupIdentity])

  useEffect(() => {
    let alive = true
    apiClient.get<TurkeyLocationsResponse>('/api/reference/turkey-locations?scope=provinces', { skipAuth: true, useCache: true })
      .then(locationsResponse => {
        if (!alive) return
        setTurkeyProvinces(Array.isArray(locationsResponse?.provinces) ? locationsResponse.provinces : [])
      })
      .catch(() => {
        if (alive) setTurkeyProvinces([])
      })

    return () => { alive = false }
  }, [])

  const activeIndex = useMemo(() => STEPS.findIndex(item => item.id === visualStepFor(step)), [step])
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
      setStep('scale')
      return
    }

    if (step === 'scale') {
      setStep('company')
      return
    }

    if (step === 'company') {
      collectCompany()
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
      setStep('payment')
      return
    }

    if (step === 'payment') {
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

    setStep('role')
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
    setProgressOpen(true)
    setProgressError(null)
    startProgressAnimation()
    try {
      const response = await apiClient.post<SetupPackageResponse>(
        '/api/settings/setup-wizard',
        { action: 'complete_setup', company, scale: legacyScaleForPlan(scale), plan_key: scale, payment_choice: paymentChoice, person: { ...person, role } },
        { skipAuth: true }
      )
      completeProgress()
      setStoredTenantId(response.data.tenant.id)
      onCompanyCreated(response.data.company)
      if (response.data.company_reused) {
        onToast({ type: 'warning', title: 'Mevcut şirket kullanıldı', message: 'Sistemde kayıtlı ilk şirket bu kurulum paketi için kullanıldı.' })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kurulum paketi işlenemedi.'
      setFormError(message)
      failProgress(message || 'İlk kurulum tamamlanamadı. Lütfen bilgileri kontrol edip tekrar deneyin.')
    } finally {
      setBusy(false)
    }
  }

  function clearProgressTimers() {
    progressTimers.current.forEach(timer => window.clearTimeout(timer))
    progressTimers.current = []
  }

  function startProgressAnimation() {
    clearProgressTimers()
    setProgressSteps(progressStepsForIndex(0))
    progressTimers.current = READINESS_PROGRESS_STEPS
      .slice(1, -1)
      .map((_, index) => window.setTimeout(() => {
        setProgressSteps(progressStepsForIndex(index + 1))
      }, (index + 1) * 720))
  }

  function completeProgress() {
    clearProgressTimers()
    setProgressSteps(current => current.map(step => ({ ...step, status: 'done' })))
  }

  function failProgress(message: string) {
    clearProgressTimers()
    setProgressError(message)
    setProgressSteps(current => {
      const activeIndex = current.findIndex(step => step.status === 'active')
      const errorIndex = activeIndex >= 0 ? activeIndex : current.findIndex(step => step.status !== 'done')

      return current.map((step, index) => (
        index === errorIndex ? { ...step, status: 'error' } : step
      ))
    })
  }

  function goToDashboard() {
    router.push('/app')
  }

  return (
    <>
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
              turkeyProvinces={turkeyProvinces}
              onChange={setCompany}
            />
          )}
          {step === 'scale' && <ScaleStep value={scale} onChange={setScale} />}
          {step === 'role' && <RoleStep role={role} onChange={setRole} companyName={company.trade_name || (signupIdentity ? null : existingCompany?.trade_name)} />}
          {step === 'person' && <PersonStep value={person} role={role} lockedIdentity={lockedSignupIdentity} onChange={setPerson} />}
          {step === 'review' && <ReviewStep company={company} scale={scale} person={person} role={role} />}
          {step === 'payment' && <PaymentStep value={paymentChoice} onChange={setPaymentChoice} />}
        </div>
      </Modal>
      <SetupProgressModal
        open={progressOpen}
        steps={progressSteps}
        error={progressError}
        onDashboard={goToDashboard}
        onClose={() => {
          const done = progressSteps.every(step => step.status === 'done')
          if (done) {
            goToDashboard()
            return
          }
          if (busy && !progressError) return
          if (progressError) setProgressOpen(false)
        }}
      />
    </>
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
  turkeyProvinces,
  onChange,
}: {
  value: typeof initialCompanyForm
  turkeyProvinces: TurkeyProvince[]
  onChange: (value: typeof initialCompanyForm) => void
}) {
  const [districtOptions, setDistrictOptions] = useState<TurkeyDistrict[]>([])
  const setField = (field: keyof typeof initialCompanyForm, nextValue: string) => onChange({ ...value, [field]: nextValue })
  const selectedProvince = useMemo(() => findTurkeyProvince(turkeyProvinces, value.city), [turkeyProvinces, value.city])
  const selectedDistrict = useMemo(
    () => districtOptions.find(district => normalizeTurkeyLocationName(district.name) === normalizeTurkeyLocationName(value.district)),
    [districtOptions, value.district]
  )
  const cityValue = selectedProvince?.name || value.city
  const districtValue = selectedDistrict?.name || value.district

  useEffect(() => {
    if (!cityValue) {
      setDistrictOptions([])
      return
    }

    let alive = true
    apiClient.get<{ districts?: TurkeyDistrict[] }>(`/api/reference/turkey-locations?province=${encodeURIComponent(cityValue)}&limit=200`, { skipAuth: true, useCache: true })
      .then(payload => {
        if (alive) setDistrictOptions(Array.isArray(payload.districts) ? payload.districts : [])
      })
      .catch(() => {
        if (alive) setDistrictOptions([])
      })

    return () => { alive = false }
  }, [cityValue])

  const setCity = (nextCity: string) => {
    const nextProvince = findTurkeyProvince(turkeyProvinces, nextCity)
    onChange({ ...value, city: nextProvince?.name || nextCity, district: '' })
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
          <SetupSearchableTextField
            value={value.tax_office}
            remoteEndpoint="/api/reference/tax-offices"
            onChange={nextValue => setField('tax_office', nextValue)}
            placeholder="Yazarak arayın"
            className={requiredControlClass(value.tax_office, { surface: 'enum' })}
          />
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
            {districtOptions.map(district => <option key={district.id} value={district.name}>{district.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Adres" required state={requiredFieldState(value.address)}>
        <textarea value={value.address} onChange={event => setField('address', event.target.value)} rows={3} className={requiredControlClass(value.address, { className: 'resize-y' })} />
      </Field>
    </div>
  )
}

function SetupSearchableTextField({
  value,
  options = [],
  remoteEndpoint,
  minQueryLength = 2,
  limit = 40,
  className,
  placeholder,
  onChange,
}: {
  value: string
  options?: string[]
  remoteEndpoint?: string
  minQueryLength?: number
  limit?: number
  className: string
  placeholder?: string
  onChange: (value: string) => void
}) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const [remoteOptions, setRemoteOptions] = useState<string[]>([])
  const [remoteLoading, setRemoteLoading] = useState(false)
  const effectiveOptions = remoteEndpoint ? remoteOptions : options
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSetupSearchText(query)
    return effectiveOptions
      .filter(option => !normalizedQuery || normalizeSetupSearchText(option).includes(normalizedQuery))
      .slice(0, 80)
  }, [effectiveOptions, query])

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  useEffect(() => {
    if (!remoteEndpoint || !open) return
    const trimmed = query.trim()
    if (trimmed.length < minQueryLength) {
      setRemoteOptions([])
      return
    }

    let alive = true
    const timeoutId = window.setTimeout(() => {
      const url = new URL(remoteEndpoint, window.location.origin)
      url.searchParams.set('q', trimmed)
      url.searchParams.set('limit', String(limit))
      setRemoteLoading(true)
      fetch(url.toString())
        .then(response => response.ok ? response.json() : null)
        .then(payload => {
          if (!alive) return
          const nextOptions = Array.isArray(payload?.options)
            ? payload.options.map((option: any) => String(option.value || option.label || '')).filter(Boolean)
            : []
          setRemoteOptions(nextOptions)
        })
        .catch(() => {
          if (alive) setRemoteOptions([])
        })
        .finally(() => {
          if (alive) setRemoteLoading(false)
        })
    }, 180)

    return () => {
      alive = false
      window.clearTimeout(timeoutId)
    }
  }, [limit, minQueryLength, open, query, remoteEndpoint])

  const commit = (text: string) => {
    const normalized = normalizeSetupSearchText(text)
    const exact = effectiveOptions.find(option => normalizeSetupSearchText(option) === normalized)
    if (exact) {
      setQuery(exact)
      onChange(exact)
      return
    }

    const prefixMatches = effectiveOptions.filter(option => normalizeSetupSearchText(option).startsWith(normalized))
    if (normalized && prefixMatches.length === 1) {
      setQuery(prefixMatches[0])
      onChange(prefixMatches[0])
      return
    }

    onChange(text)
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={event => {
          setQuery(event.target.value)
          onChange(event.target.value)
          setOpen(true)
        }}
        onFocus={event => {
          event.currentTarget.select()
          setOpen(true)
        }}
        onBlur={() => {
          commit(query)
          window.setTimeout(() => setOpen(false), 120)
        }}
        placeholder={placeholder}
        className={className}
      />
      {open && (
        <div className="absolute left-0 top-full z-[80] mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
            <button
              key={`${option}-${index}`}
              type="button"
              onMouseDown={event => event.preventDefault()}
              onClick={() => {
                setQuery(option)
                onChange(option)
                setOpen(false)
              }}
              className="block w-full px-3 py-2 text-left text-sm text-gray-800 hover:bg-blue-50 dark:text-gray-100 dark:hover:bg-blue-950/40"
            >
              {option}
            </button>
          )) : (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              {remoteEndpoint && query.trim().length < minQueryLength
                ? `Aramak için en az ${minQueryLength} karakter yazın`
                : remoteLoading ? 'Aranıyor...' : 'Sonuç bulunamadı'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ScaleStep({ value, onChange }: { value: CompanyScale; onChange: (value: CompanyScale) => void }) {
  return (
    <div className="space-y-5">
      <SectionHeader
        icon={<Users size={20} />}
        title="İşletmeniz için lisans paketini seçiniz"
        text="Development planı normal kurulumda gösterilmez. Paket seçimi tenant lisansının başlangıç planını belirler; release olmayan modülleri açmaz."
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
          <h3 className="text-base font-bold text-gray-900 dark:text-white">{option.title}</h3>
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
  lockedIdentity,
  onChange,
}: {
  value: typeof initialPersonForm
  role: UserRole
  lockedIdentity: Pick<typeof initialPersonForm, 'email' | 'phone'>
  onChange: (value: typeof initialPersonForm) => void
}) {
  const emailLocked = Boolean(lockedIdentity.email)
  const phoneLocked = Boolean(lockedIdentity.phone)
  const setField = (field: keyof typeof initialPersonForm, nextValue: string) => onChange({ ...value, [field]: nextValue })
  const lockedControlClass = 'cursor-not-allowed bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'

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
          <input
            value={value.email}
            type="email"
            readOnly={emailLocked}
            aria-readonly={emailLocked}
            onChange={event => {
              if (!emailLocked) setField('email', event.target.value)
            }}
            className={cn(formControlClass(), emailLocked && lockedControlClass)}
          />
        </Field>
        <Field label="Telefon">
          <input
            value={value.phone}
            readOnly={phoneLocked}
            aria-readonly={phoneLocked}
            onChange={event => {
              if (!phoneLocked) setField('phone', event.target.value)
            }}
            className={cn(formControlClass(), phoneLocked && lockedControlClass)}
          />
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
        title="Kurulum özeti hazır"
        text="Şirket, lisans paketi, kişi ve rol bilgileri ilk kurulum sırasında birlikte işlenecek."
      />
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryItem title="Şirket" value={company.trade_name || 'Tanımlanmadı'} detail={company.tax_number || 'VKN yok'} />
        <SummaryItem title="Paket" value={scaleOption.title} detail={`${scaleOption.userRange} · ${scaleOption.companyRange}`} />
        <SummaryItem title="Rol" value={roleLabel(role)} detail="Şirkete bağlanacak başlangıç rolü" />
        <SummaryItem title="Kişi" value={fullName || 'Tanımlanmadı'} detail={person.national_id || 'TC Kimlik No yok'} />
      </div>
    </div>
  )
}

function PaymentStep({ value, onChange }: { value: PaymentChoice; onChange: (value: PaymentChoice) => void }) {
  return (
    <div className="space-y-5">
      <SectionHeader
        icon={<CreditCard size={20} />}
        title="Ödeme tercihi"
        text="Bu aşamada iki seçenek de aynı ilk kurulum akışını başlatır."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <PaymentCard
          selected={value === 'pay_now'}
          icon={<CreditCard size={24} />}
          title="Şimdi Öde"
          text="Ödeme entegrasyonu hazırlandığında bu seçenek tahsilat adımına bağlanacak."
          onClick={() => onChange('pay_now')}
        />
        <PaymentCard
          selected={value === 'demo'}
          icon={<BadgeCheck size={24} />}
          title="Demo Kullanıcı olarak başla"
          text="Demo başlangıç için çalışma alanı ve ilk yönetici kayıtları aynı şekilde oluşturulur."
          onClick={() => onChange('demo')}
        />
      </div>
    </div>
  )
}

function SetupProgressModal({
  open,
  steps,
  error,
  onDashboard,
  onClose,
}: {
  open: boolean
  steps: Array<{ key: SetupProgressKey; label: string; description: string; status: SetupProgressStatus }>
  error: string | null
  onDashboard: () => void
  onClose: () => void
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const done = !error && steps.every(step => step.status === 'done')
  const activeStep = steps.find(step => step.status === 'active' || step.status === 'error') || steps[steps.length - 1]
  const completedCount = steps.filter(step => step.status === 'done').length
  const progressPercent = done
    ? 100
    : Math.min(96, Math.max(6, Math.round(((completedCount + (activeStep?.status === 'active' ? 0.55 : 0)) / steps.length) * 100)))
  const activeModuleIndex = done
    ? SETUP_MODULE_CARDS.length
    : Math.min(SETUP_MODULE_CARDS.length - 1, Math.floor((progressPercent / 100) * SETUP_MODULE_CARDS.length))
  const completedDetailCount = done
    ? READINESS_DETAIL_ITEMS.length
    : Math.min(READINESS_DETAIL_ITEMS.length, Math.floor((progressPercent / 100) * READINESS_DETAIL_ITEMS.length))

  useEffect(() => {
    if (open) setDetailsOpen(false)
  }, [open])

  const footer = error ? (
    <button
      type="button"
      onClick={onClose}
      className="inline-flex items-center justify-center rounded-lg bg-eden-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-eden-blue-dk"
    >
      Kapat
    </button>
  ) : done ? (
    <button
      type="button"
      onClick={onDashboard}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-eden-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-eden-blue-dk"
    >
      <ArrowRight size={16} />
      Uygulamaya git
    </button>
  ) : null

  return (
    <Modal open={open} onClose={onClose} title="Eden ilk kurulumu" size="xl" footer={footer}>
      <div className="space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{activeStep.label}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">{activeStep.description}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40">
          <div className="relative overflow-hidden rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/30">
            <div className="pointer-events-none absolute left-[14%] right-[14%] top-1/2 h-px bg-eden-blue/20 dark:bg-blue-300/20" />
            <div className="pointer-events-none absolute bottom-[18%] top-[18%] left-1/2 w-px bg-emerald-500/20 dark:bg-emerald-300/20" />
            <div className="pointer-events-none absolute inset-x-[22%] top-[28%] h-px rotate-12 bg-eden-blue/15 dark:bg-blue-300/15" />
            <div className="pointer-events-none absolute inset-x-[22%] bottom-[28%] h-px -rotate-12 bg-emerald-500/15 dark:bg-emerald-300/15" />

            <div className="relative hidden h-80 lg:block">
              <div className="absolute left-1/2 top-1/2 z-10 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-eden-blue/20 bg-white shadow-sm dark:border-blue-400/25 dark:bg-gray-900">
                <div className="absolute h-40 w-40 rounded-full border border-eden-blue/15 dark:border-blue-300/15" />
                <div className="absolute h-24 w-24 animate-pulse rounded-full bg-eden-blue/10 dark:bg-blue-400/10" />
                <div className={cn(
                  'relative flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-colors',
                  done ? 'bg-emerald-600' : error ? 'bg-red-600' : 'bg-eden-blue'
                )}>
                  {done ? <CheckCircle2 size={30} /> : error ? <AlertCircle size={28} /> : <Sparkles size={28} className="animate-pulse" />}
                </div>
              </div>

              {SETUP_MODULE_CARDS.map((module, index) => (
                <ProgressModuleCard
                  key={module}
                  label={module}
                  status={moduleStatus(index, activeModuleIndex, done)}
                  className={modulePositionClass(index)}
                />
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:hidden">
              {SETUP_MODULE_CARDS.map((module, index) => (
                <ProgressModuleCard
                  key={module}
                  label={module}
                  status={moduleStatus(index, activeModuleIndex, done)}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-300">
            <span>İlk kurulum ilerlemesi</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-eden-blue transition-all duration-500 ease-out dark:bg-blue-400"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/40">
          <button
            type="button"
            onClick={() => setDetailsOpen(current => !current)}
            aria-expanded={detailsOpen}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800/70"
          >
            {detailsOpen ? 'Detayları gizle' : 'Detayları göster'}
            <span className="text-xs text-gray-500 dark:text-gray-400">{detailsOpen ? 'Gizle' : 'Aç'}</span>
          </button>
          {detailsOpen && (
            <div className="grid gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700 sm:grid-cols-2">
              {READINESS_DETAIL_ITEMS.map((item, index) => {
                const itemDone = index < completedDetailCount
                return (
                  <div key={item} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <span className={cn(
                      'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border',
                      itemDone
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-gray-300 text-gray-400 dark:border-gray-700 dark:text-gray-500'
                    )}>
                      {itemDone ? <CheckCircle2 size={13} /> : <Circle size={12} />}
                    </span>
                    <span>{item}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        )}
        {done && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200">
            İlk kurulum başarıyla tamamlandı.
          </div>
        )}
      </div>
    </Modal>
  )
}

function ProgressModuleCard({
  label,
  status,
  className,
}: {
  label: string
  status: SetupProgressStatus
  className?: string
}) {
  return (
    <div className={cn(
      'rounded-lg border px-3 py-2 text-sm shadow-sm transition-all duration-500',
      status === 'done' && 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200',
      status === 'active' && 'scale-[1.02] border-eden-blue bg-blue-50 text-eden-blue shadow-md dark:border-blue-400 dark:bg-blue-950/30 dark:text-blue-200',
      status === 'pending' && 'border-gray-200 bg-white/85 text-gray-500 opacity-60 dark:border-gray-700 dark:bg-gray-900/70 dark:text-gray-400',
      status === 'error' && 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200',
      className
    )}>
      <div className="flex min-h-8 items-center justify-between gap-2">
        <span className="font-semibold leading-4">{label}</span>
        {status === 'done' && <CheckCircle2 size={16} className="flex-shrink-0" />}
        {status === 'active' && <Loader2 size={15} className="flex-shrink-0 animate-spin" />}
        {status === 'error' && <AlertCircle size={15} className="flex-shrink-0" />}
      </div>
    </div>
  )
}

function moduleStatus(index: number, activeModuleIndex: number, done: boolean): SetupProgressStatus {
  if (done) return 'done'
  if (index < activeModuleIndex) return 'done'
  if (index === activeModuleIndex) return 'active'
  return 'pending'
}

function modulePositionClass(index: number) {
  const positions = [
    'absolute left-4 top-4 w-40',
    'absolute left-1/2 top-3 w-40 -translate-x-1/2',
    'absolute right-4 top-4 w-40',
    'absolute left-8 top-1/2 w-40 -translate-y-1/2',
    'absolute right-8 top-1/2 w-40 -translate-y-1/2',
    'absolute bottom-4 left-4 w-40',
    'absolute bottom-3 left-1/2 w-40 -translate-x-1/2',
    'absolute bottom-4 right-4 w-40',
  ]

  return positions[index] || ''
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

function legacyScaleForPlan(scale: CompanyScale) {
  if (scale === 'micro' || scale === 'small') return 'small'
  if (scale === 'large') return 'corporate'
  return scale
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

function PaymentCard({
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

function visualStepFor(step: WizardStep): VisualWizardStep {
  if (step === 'scale' || step === 'company') return 'company'
  if (step === 'role' || step === 'person') return 'person'
  return step
}

function canGoBack(step: WizardStep, busy: boolean) {
  if (busy) return false
  return step === 'company' || step === 'scale' || step === 'role' || step === 'person' || step === 'review' || step === 'payment'
}

function previousStep(step: WizardStep): WizardStep {
  if (step === 'payment') return 'review'
  if (step === 'review') return 'person'
  if (step === 'person') return 'role'
  if (step === 'role') return 'company'
  if (step === 'company') return 'scale'
  return 'welcome'
}

function nextLabel(step: WizardStep) {
  if (step === 'payment') return 'Tamam'
  return 'İleri'
}

function nextIcon(step: WizardStep) {
  if (step === 'payment') return <CheckCircle2 size={16} />
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

function normalizeSetupSearchText(value?: string | null) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
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
