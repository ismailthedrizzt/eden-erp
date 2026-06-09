'use client'

import { useEffect, useRef, useState, type ClipboardEvent, type CSSProperties, type ReactNode } from 'react'
import Image from 'next/image'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  BrainCircuit,
  BriefcaseBusiness,
  Calculator,
  CheckCircle2,
  Cloud,
  Factory,
  Gauge,
  Landmark,
  LockKeyhole,
  LogIn,
  PackageCheck,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react'
import { setStoredTenantId } from '@/lib/tenancy/client'
import { cn } from '@/lib/utils'
import styles from './LoginExperience.module.css'

const MODULES = [
  { color: '#34d399', icon: Users, name: 'İnsan Kaynakları', desc: 'Teşkilat, kadro, çalışan yönetimi' },
  { color: '#60a5fa', icon: Calculator, name: 'Muhasebe', desc: 'Nakit akışı, borç takip, raporlar' },
  { color: '#fb923c', icon: Factory, name: 'Üretim', desc: 'İş emirleri, kapasite ve süreç takibi' },
  { color: '#a78bfa', icon: PackageCheck, name: 'Stok & Satış', desc: 'Ürünler, teklifler, siparişler' },
  { color: '#facc15', icon: Wrench, name: 'Teknik Servis', desc: 'Servis kabul, planlama ve saha akışı' },
  { color: '#2dd4bf', icon: BriefcaseBusiness, name: 'Şirket Yönetimi', desc: 'Çok şirketli yapı ve yetki modeli' },
]

const PLATFORM_FEATURES = [
  {
    color: '#38bdf8',
    icon: Building2,
    title: 'Her Ölçekte Uyum',
    desc: 'Küçük ekiplerden holding yapılarına kadar ölçeklenebilir çalışma düzeni.',
  },
  {
    color: '#34d399',
    icon: BrainCircuit,
    title: 'AI destekli yapı',
    desc: 'Veriyi anlamlandıran, süreçleri hızlandıran akıllı operasyon katmanı.',
  },
  {
    color: '#f59e0b',
    icon: Landmark,
    title: 'Bank Native',
    desc: 'Finansal hareketleri ERP akışının doğal parçası haline getiren mimari.',
  },
]

const TRUST_ITEMS = [
  { icon: ShieldCheck, title: 'Güvenli & Uyumlu', desc: 'KVKK uyumlu, uçtan uca şifreleme' },
  { icon: Cloud, title: 'Bulut Tabanlı', desc: 'Yüksek erişilebilirlik ve esneklik' },
  { icon: Gauge, title: 'Yüksek Performans', desc: 'Hızlı, stabil ve ölçeklenebilir altyapı' },
]

const textInputClass = styles.textInput
const otpInputClass = styles.otpInput

type AuthMode = 'login' | 'signup'
type SignupFlow = 'new_company' | 'join_company'

type TenantLoginStatusResponse = {
  data?: {
    login_enabled?: boolean
    tenant_count?: number
    status?: 'ready' | 'empty'
  }
  error?: string
}

type OtpSendResponse = {
  data?: {
    delivery?: 'email' | 'screen'
    fallbackCode?: string
  }
  error?: string
  code?: string
  detail?: string
}

type OtpVerifyResponse = {
  tenant?: {
    tenant_id: string
    tenant_name: string
  }
  error?: string
}

type CompanyJoinMatch = {
  tenant_id: string
  tenant_name: string
  company_id: string
  company_name: string
  trade_name?: string | null
  tax_number: string
}

type CompanyJoinResponse = {
  data?: {
    matches?: CompanyJoinMatch[]
    message?: string
    request?: Record<string, any>
    company?: CompanyJoinMatch
  }
  error?: string
}

type JoinFormState = {
  tax_number: string
  first_name: string
  last_name: string
  national_id: string
  gender: 'male' | 'female'
  email: string
  phone: string
}

const AUTH_MODE_COPY: Record<AuthMode, {
  title: string
  subtitle: string
  primaryLabel: string
  loadingLabel: string
  helper: string
  otpTitle: string
  otpSubtitleSuffix: string
  temporaryCodeTitle: string
  demoCodeMessage: string
  successMessage: string
}> = {
  login: {
    title: 'Giriş Yap',
    subtitle: 'Kurumsal e-posta veya telefon numaranızı girin.',
    primaryLabel: 'Devam Et',
    loadingLabel: 'Gönderiliyor...',
    helper: 'Hesabınız yoksa Kaydol seçeneğiyle başvuru başlatabilirsiniz.',
    otpTitle: 'Doğrulama Kodu',
    otpSubtitleSuffix: '6 haneli giriş kodu gönderildi.',
    temporaryCodeTitle: 'Geçici giriş kodu',
    demoCodeMessage: '6 haneli giriş kodu ekrana düştü. Lütfen aşağıya girin.',
    successMessage: 'Kod doğrulandı. Yönlendiriliyor...',
  },
  signup: {
    title: 'Kaydol',
    subtitle: 'Yeni kullanıcı kaydı için kurumsal e-posta veya telefon numaranızı girin.',
    primaryLabel: 'Kaydol',
    loadingLabel: 'Kayıt başlatılıyor...',
    helper: 'Zaten hesabınız varsa Giriş Yap seçeneğiyle devam edin.',
    otpTitle: 'Kayıt Doğrulama Kodu',
    otpSubtitleSuffix: '6 haneli kayıt kodu gönderildi.',
    temporaryCodeTitle: 'Geçici kayıt kodu',
    demoCodeMessage: '6 haneli kayıt kodu ekrana düştü. Lütfen aşağıya girin.',
    successMessage: 'Kayıt kodu doğrulandı. Yönlendiriliyor...',
  },
}

const SIGNUP_FLOW_OPTIONS: Array<{ value: SignupFlow; label: string; description: string }> = [
  {
    value: 'new_company',
    label: 'Yeni şirket kaydı',
    description: 'Yeni çalışma alanı ve şirket kurulumu başlatılır.',
  },
  {
    value: 'join_company',
    label: 'Kayıtlı şirketime katılmak istiyorum',
    description: 'VKN ile şirket bulunur, yönetici onayına kullanıcı talebi düşer.',
  },
]

const initialJoinForm: JoinFormState = {
  tax_number: '',
  first_name: '',
  last_name: '',
  national_id: '',
  gender: 'male',
  email: '',
  phone: '',
}

const JOIN_REQUEST_SUCCESS_MESSAGE = 'Talebiniz Sistem Yöneticilerine gönderildi. Onaylandığında telefon ve e-posta üzerinden bilgilendirileceksiniz.'

function getErrorMessage(cause: unknown, fallback: string) {
  const message = cause instanceof Error ? cause.message : ''
  if (!message) return fallback

  const normalized = message.toLowerCase()
  if (
    normalized.includes('fetch failed')
    || normalized.includes('failed to fetch')
    || normalized.includes('networkerror')
    || normalized.includes('load failed')
  ) {
    return fallback
  }

  return message
}

function normalizeAuthIdentifier(value: string) {
  const trimmedValue = value.trim()
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)

  if (isEmail) return { type: 'email' as const, value: trimmedValue.toLowerCase() }

  let digits = trimmedValue.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('90')) digits = digits.slice(2)

  if (/^[0-9]{10,11}$/.test(digits)) return { type: 'phone' as const, value: digits }

  return null
}

function onlyDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

function joinContactIdentifier(form: JoinFormState) {
  return normalizeAuthIdentifier(form.email) || normalizeAuthIdentifier(form.phone)
}

function joinFormWithIdentifier(form: JoinFormState, identifier: string) {
  const normalized = normalizeAuthIdentifier(identifier)
  if (!normalized) return form
  if (normalized.type === 'email') return { ...form, email: normalized.value }
  return { ...form, phone: normalized.value }
}

function validateJoinForm(form: JoinFormState, selectedCompanyId: string | null) {
  if (!/^\d{10}$/.test(form.tax_number)) return 'Şirket VKN 10 haneli olmalıdır.'
  if (!selectedCompanyId) return 'Devam etmek için VKN sorgusundan şirket seçin.'
  if (form.first_name.trim().length < 2) return 'Ad zorunludur.'
  if (form.last_name.trim().length < 2) return 'Soyad zorunludur.'
  if (!/^\d{11}$/.test(form.national_id)) return 'TC kimlik no 11 haneli olmalıdır.'
  if (!joinContactIdentifier(form)) return 'Geçerli bir e-posta veya telefon numarası giriniz.'
  if (form.email && !normalizeAuthIdentifier(form.email)) return 'E-posta adresi geçerli değil.'
  return null
}

function AuthModeSwitch({ mode, onChange, loginEnabled }: { mode: AuthMode; onChange: (mode: AuthMode) => void; loginEnabled: boolean }) {
  const options: Array<{ value: AuthMode; label: string; icon: ReactNode }> = [
    { value: 'login', label: 'Giriş Yap', icon: <LogIn size={15} /> },
    { value: 'signup', label: 'Kaydol', icon: <UserPlus size={15} /> },
  ]

  return (
    <div className={styles.modeSwitch} role="tablist" aria-label="Kimlik doğrulama modu">
      {options.map(option => {
        const selected = option.value === mode
        const disabled = option.value === 'login' && !loginEnabled
        return (
          <button
            key={option.value}
            type="button"
            aria-selected={selected}
            aria-disabled={disabled}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              styles.modeTab,
              selected && styles.modeTabActive,
              disabled && styles.modeTabDisabled
            )}
            role="tab"
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function AuthVisualBackground() {
  return (
    <div className={styles.visualLayer} aria-hidden="true">
      <svg className={styles.nodeNetwork} viewBox="0 0 720 640" fill="none" role="presentation">
        <path d="M42 490C142 424 226 425 318 334C418 236 492 192 675 178" stroke="url(#nodeLine)" strokeWidth="1.4" opacity="0.62" />
        <path d="M86 382C166 330 248 364 326 266C396 178 470 92 638 78" stroke="url(#nodeLine)" strokeWidth="1.1" opacity="0.42" />
        <path d="M74 556C188 488 246 508 372 408C474 326 530 314 676 300" stroke="url(#nodeLine)" strokeWidth="1.1" opacity="0.34" />
        {[68, 138, 226, 318, 438, 548, 664].map((x, index) => (
          <circle key={x} cx={x} cy={[474, 416, 376, 332, 246, 202, 180][index]} r={index % 2 ? 4 : 5} fill="#00D8FF" opacity={index % 2 ? 0.48 : 0.74} />
        ))}
        {[92, 206, 326, 468, 628].map((x, index) => (
          <circle key={`soft-${x}`} cx={x} cy={[380, 346, 266, 98, 76][index]} r="3" fill="#70B8FF" opacity="0.42" />
        ))}
        <defs>
          <linearGradient id="nodeLine" x1="42" y1="500" x2="680" y2="78" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00D8FF" stopOpacity="0" />
            <stop offset="0.42" stopColor="#00D8FF" />
            <stop offset="1" stopColor="#1F73FF" stopOpacity="0.18" />
          </linearGradient>
        </defs>
      </svg>

      <svg className={styles.hologram} viewBox="0 0 620 460" fill="none" role="presentation">
        <path d="M228 304L310 256L392 304L310 352L228 304Z" fill="#00D8FF" fillOpacity="0.1" stroke="#00D8FF" strokeOpacity="0.5" />
        <path d="M254 304L310 272L366 304L310 336L254 304Z" fill="#1F73FF" fillOpacity="0.26" stroke="#70B8FF" />
        <path d="M310 256V148" stroke="#00D8FF" strokeOpacity="0.38" />
        <path d="M226 304L146 236M392 304L480 242M310 352V412" stroke="#1F73FF" strokeOpacity="0.34" />
        {[
          { x: 78, y: 152, label: 'M6 40H54M14 31L26 20L36 29L50 10', icon: 'chart' },
          { x: 240, y: 34, label: 'M30 8L54 22H6L30 8ZM12 27H48M16 32V52M30 32V52M44 32V52M10 56H50', icon: 'bank' },
          { x: 398, y: 72, label: 'M18 27C18 19 24 13 32 13C40 13 46 19 46 27C46 35 40 41 32 41C24 41 18 35 18 27ZM10 55C15 46 23 42 32 42C41 42 49 46 54 55', icon: 'team' },
          { x: 468, y: 214, label: 'M32 8V18M32 46V56M8 32H18M46 32H56M16 16L23 23M41 41L48 48M48 16L41 23M23 41L16 48M24 32C24 27 27 24 32 24C37 24 40 27 40 32C40 37 37 40 32 40C27 40 24 37 24 32Z', icon: 'gear' },
          { x: 142, y: 254, label: 'M12 34H52M18 34V50H46V34M22 28V18H42V28M28 18V10H36V18', icon: 'factory' },
        ].map(card => (
          <g key={card.icon} transform={`translate(${card.x} ${card.y})`}>
            <rect width="74" height="74" rx="12" fill="#071B31" fillOpacity="0.72" stroke="#00D8FF" strokeOpacity="0.52" />
            <path d={card.label} stroke="#00D8FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
          </g>
        ))}
        <path d="M106 412H515" stroke="#00D8FF" strokeOpacity="0.12" />
        <path d="M160 385H456" stroke="#70B8FF" strokeOpacity="0.2" />
      </svg>

      <div className={styles.dataWave} />
      <div className={styles.panelHalo} />
    </div>
  )
}

function SecurityNote() {
  return (
    <div className={styles.securityNote}>
      <div className={styles.securityGlyph}>
        <LockKeyhole size={24} strokeWidth={1.8} />
      </div>
      <p className={styles.securityText}>
        Verileriniz bizim için en değerli varlıktır.
        <br />
        Güvenle koruyoruz.
      </p>
    </div>
  )
}

type LoginExperienceProps = {
  embedded?: boolean
  redirectOnSuccess?: boolean
  autoFocus?: boolean
  className?: string
  signupRedirectPath?: string
}

export function LoginExperience({
  embedded = false,
  redirectOnSuccess = true,
  autoFocus = true,
  className,
  signupRedirectPath = '/app/sistem/kurulum',
}: LoginExperienceProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [signupFlow, setSignupFlow] = useState<SignupFlow>('new_company')
  const [step, setStep] = useState<'kimlik' | 'otp'>('kimlik')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginEnabled, setLoginEnabled] = useState(true)
  const [joinForm, setJoinForm] = useState<JoinFormState>(initialJoinForm)
  const [joinMatches, setJoinMatches] = useState<CompanyJoinMatch[]>([])
  const [selectedJoinCompanyId, setSelectedJoinCompanyId] = useState<string | null>(null)
  const [joinLookupLoading, setJoinLookupLoading] = useState(false)
  const [joinLookupMessage, setJoinLookupMessage] = useState<string | null>(null)
  const [joinRequestMessage, setJoinRequestMessage] = useState<string | null>(null)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [success, setSuccess] = useState(false)
  const [fallbackCode, setFallbackCode] = useState<string | null>(null)
  const [timer, setTimer] = useState(300)
  const [resendActive, setResendActive] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const userSelectedAuthModeRef = useRef(false)
  const isEmailLogin = normalizeAuthIdentifier(value)?.type === 'email'
  const modeCopy = AUTH_MODE_COPY[authMode]
  const joinRequestCompleted = authMode === 'signup'
    && signupFlow === 'join_company'
    && success
    && Boolean(joinRequestMessage)

  useEffect(() => {
    if (step === 'otp') startTimer()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [step])

  useEffect(() => {
    let active = true

    async function loadTenantStatus() {
      try {
        const response = await fetch('/api/auth/tenant-status', { cache: 'no-store' })
        const data = await response.json().catch(() => ({})) as TenantLoginStatusResponse
        const enabled = response.ok && Boolean(data.data?.login_enabled)

        if (!active) return

        setLoginEnabled(enabled)
        setAuthMode(current => {
          if (!enabled && current === 'login') return 'signup'
          if (enabled && !userSelectedAuthModeRef.current) return 'login'
          return current
        })
      } catch {
        if (!active) return

        setLoginEnabled(false)
        setAuthMode(current => current === 'login' ? 'signup' : current)
      }
    }

    loadTenantStatus()

    return () => {
      active = false
    }
  }, [])

  function startTimer() {
    setTimer(300)
    setResendActive(false)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimer(current => {
        if (current <= 241) setResendActive(true)
        if (current <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return current - 1
      })
    }, 1000)
  }

  function formatTimer(seconds: number) {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  }

  function switchAuthMode(nextMode: AuthMode) {
    if (nextMode === authMode) return
    if (nextMode === 'login' && !loginEnabled) return

    userSelectedAuthModeRef.current = true
    setAuthMode(nextMode)
    setStep('kimlik')
    setError('')
    setOtpError('')
    setSuccess(false)
    setFallbackCode(null)
    setJoinRequestMessage(null)
    setOtp(['', '', '', '', '', ''])
  }

  function switchSignupFlow(nextFlow: SignupFlow) {
    if (nextFlow === signupFlow) return
    setSignupFlow(nextFlow)
    setStep('kimlik')
    setError('')
    setOtpError('')
    setSuccess(false)
    setFallbackCode(null)
    setJoinRequestMessage(null)
    setOtp(['', '', '', '', '', ''])

    if (nextFlow === 'join_company') {
      setJoinForm(current => joinFormWithIdentifier(current, value))
    }
  }

  async function sendOtp(identifier: string, purpose: AuthMode = authMode) {
    const response = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, purpose }),
    })
    const data = await response.json().catch(() => ({})) as OtpSendResponse

    if (!response.ok) {
      const detail = [data.code, data.detail].filter(Boolean).join(' - ')
      throw new Error(
        detail
          ? `${data.error || 'Doğrulama kodu gönderilemedi.'} (${detail})`
          : data.error || 'Doğrulama kodu gönderilemedi.'
      )
    }

    return data.data || null
  }

  async function lookupCompanyJoinMatches(taxNumber = joinForm.tax_number) {
    const normalizedTaxNumber = onlyDigits(taxNumber, 10)
    setJoinForm(current => ({ ...current, tax_number: normalizedTaxNumber }))
    setSelectedJoinCompanyId(null)
    setJoinMatches([])
    setJoinLookupMessage(null)

    if (!/^\d{10}$/.test(normalizedTaxNumber)) {
      setJoinLookupMessage('VKN 10 haneli olmalıdır.')
      return []
    }

    setJoinLookupLoading(true)
    try {
      const response = await fetch('/api/auth/company-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lookup', tax_number: normalizedTaxNumber }),
      })
      const data = await response.json().catch(() => ({})) as CompanyJoinResponse
      if (!response.ok) throw new Error(data.error || 'Şirket sorgusu tamamlanamadı.')

      const matches = Array.isArray(data.data?.matches) ? data.data.matches : []
      setJoinMatches(matches)
      setSelectedJoinCompanyId(matches[0]?.company_id || null)
      setJoinLookupMessage(matches.length ? null : 'Bu VKN ile kayıtlı aktif şirket bulunamadı.')
      return matches
    } catch (cause) {
      const message = getErrorMessage(cause, 'Şirket sorgusu tamamlanamadı.')
      setJoinLookupMessage(message)
      return []
    } finally {
      setJoinLookupLoading(false)
    }
  }

  function startSignupSetup(identifier: string) {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams({ signupIdentity: identifier })
    window.location.href = `${signupRedirectPath}?${params.toString()}`
  }

  async function submitCompanyJoinRequest() {
    const selectedCompany = joinMatches.find(match => match.company_id === selectedJoinCompanyId)
    if (!selectedCompany) throw new Error('Devam etmek için VKN sorgusundan şirket seçin.')

    const response = await fetch('/api/auth/company-join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_request',
        tax_number: joinForm.tax_number,
        tenant_id: selectedCompany.tenant_id,
        company_id: selectedCompany.company_id,
        person: {
          first_name: joinForm.first_name,
          last_name: joinForm.last_name,
          nationality: 'TR',
          national_id: joinForm.national_id,
          gender: joinForm.gender,
          email: joinForm.email,
          phone: joinForm.phone,
        },
      }),
    })
    const data = await response.json().catch(() => ({})) as CompanyJoinResponse
    if (!response.ok) throw new Error(data.error || 'Kullanıcı kayıt talebi oluşturulamadı.')

    setJoinRequestMessage(data.data?.message || JOIN_REQUEST_SUCCESS_MESSAGE)
  }

  async function completeAuthFlow() {
    if (authMode === 'signup') {
      if (signupFlow === 'join_company') {
        await submitCompanyJoinRequest()
        if (timerRef.current) clearInterval(timerRef.current)
        setResendActive(false)
        setSuccess(true)
        return
      }

      const normalizedIdentifier = normalizeAuthIdentifier(value)
      if (!normalizedIdentifier) {
        setOtpError('Gecerli bir e-posta veya telefon numarasi giriniz.')
        return
      }

      setSuccess(true)
      startSignupSetup(normalizedIdentifier.value)
      return
    }

    setSuccess(true)
    if (!redirectOnSuccess) return

    if (typeof window !== 'undefined') {
      window.location.href = '/app'
    }
  }

  async function handleStep1() {
    if (authMode === 'login' && !loginEnabled) {
      setError('Kurulum henuz hazir degil. Once kayit baslatin.')
      return
    }

    const normalizedIdentifier = authMode === 'signup' && signupFlow === 'join_company'
      ? joinContactIdentifier(joinForm)
      : normalizeAuthIdentifier(value)
    if (!normalizedIdentifier) {
      setError('Geçerli bir e-posta veya telefon numarası giriniz.')
      return
    }

    setLoading(true)
    setError('')
    setFallbackCode(null)
    setJoinRequestMessage(null)
    setSuccess(false)
    setOtp(['', '', '', '', '', ''])
    try {
      if (authMode === 'signup') {
        if (signupFlow === 'join_company') {
          const selectedCompanyId = selectedJoinCompanyId
          let matches = joinMatches
          if (!matches.length && /^\d{10}$/.test(joinForm.tax_number)) {
            matches = await lookupCompanyJoinMatches(joinForm.tax_number)
          }

          const selectedCompany = matches.find(match => match.company_id === selectedCompanyId) || matches[0]
          const errorMessage = validateJoinForm(joinForm, selectedCompany?.company_id || null)
          if (errorMessage) {
            setError(errorMessage)
            return
          }

          setSelectedJoinCompanyId(selectedCompany.company_id)
          const contact = joinContactIdentifier(joinForm)
          if (!contact) {
            setError('Geçerli bir e-posta veya telefon numarası giriniz.')
            return
          }

          setValue(contact.value)
          const delivery = await sendOtp(contact.value, 'signup')
          setFallbackCode(delivery?.fallbackCode || null)
          setStep('otp')
          return
        }

        setValue(normalizedIdentifier.value)
        const delivery = await sendOtp(normalizedIdentifier.value, 'signup')
        setFallbackCode(delivery?.fallbackCode || null)

        setStep('otp')
        return
      }

      setValue(normalizedIdentifier.value)
      const delivery = await sendOtp(normalizedIdentifier.value, 'login')
      setFallbackCode(delivery?.fallbackCode || null)
      setStep('otp')
    } catch (cause) {
      console.error('Kullanıcı sorgulama hatası:', getErrorMessage(cause, 'Bilinmeyen hata'))
      setError(getErrorMessage(cause, 'Kullanıcı sorgusu tamamlanamadı. Lütfen tekrar deneyin.'))
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtpCode(code: string) {
    const normalizedIdentifier = normalizeAuthIdentifier(value)
    if (!normalizedIdentifier) throw new Error('Geçerli bir e-posta veya telefon numarası giriniz.')

    const response = await fetch('/api/auth/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: normalizedIdentifier.type, identifier: normalizedIdentifier.value, token: code, purpose: authMode }),
    })
    const data = await response.json().catch(() => ({})) as OtpVerifyResponse

    if (!response.ok) {
      throw new Error(data.error || 'Kod hatalı. Lütfen tekrar deneyin.')
    }

    if (authMode === 'login' && data.tenant?.tenant_id) {
      setStoredTenantId(data.tenant.tenant_id)
    }
  }

  async function handleOtpInput(index: number, val: string) {
    const digit = val.replace(/[^0-9]/g, '').slice(-1)
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()

    const code = newOtp.join('')
    if (code.length === 6) {
      setLoading(true)
      setOtpError('')
      try {
        if (fallbackCode && code !== fallbackCode) {
          setOtpError('Kod hatalı. Lütfen tekrar deneyin.')
          setOtp(['', '', '', '', '', ''])
          otpRefs.current[0]?.focus()
          return
        }

        await verifyOtpCode(code)
        await completeAuthFlow()
      } catch (cause) {
        setOtpError(getErrorMessage(cause, 'Kod hatalı. Lütfen tekrar deneyin.'))
        setOtp(['', '', '', '', '', ''])
        otpRefs.current[0]?.focus()
      } finally {
        setLoading(false)
      }
    }
  }

  async function submitOtpCode(code: string) {
    setLoading(true)
    setOtpError('')
    try {
      if (fallbackCode && code !== fallbackCode) {
        setOtpError('Kod hatalı. Lütfen tekrar deneyin.')
        setOtp(['', '', '', '', '', ''])
        otpRefs.current[0]?.focus()
        return
      }

      await verifyOtpCode(code)
      await completeAuthFlow()
    } catch (cause) {
      setOtpError(getErrorMessage(cause, 'Kod hatalı. Lütfen tekrar deneyin.'))
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  async function handleOtpPaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    const pastedCode = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pastedCode) return

    const nextOtp = ['', '', '', '', '', '']
    pastedCode.split('').forEach((digit, index) => {
      nextOtp[index] = digit
    })
    setOtp(nextOtp)

    if (pastedCode.length === 6) {
      await submitOtpCode(pastedCode)
      return
    }

    otpRefs.current[Math.min(pastedCode.length, 5)]?.focus()
  }

  async function handleResend() {
    setOtp(['', '', '', '', '', ''])
    setOtpError('')
    setLoading(true)
    try {
      const normalizedIdentifier = normalizeAuthIdentifier(value)
      if (!normalizedIdentifier) throw new Error('Geçerli bir e-posta veya telefon numarası giriniz.')
      const delivery = await sendOtp(normalizedIdentifier.value, authMode)
      setFallbackCode(delivery?.fallbackCode || null)
      startTimer()
    } catch (cause) {
      setOtpError(getErrorMessage(cause, 'Kod tekrar gönderilemedi.'))
    } finally {
      setLoading(false)
    }
  }

  return (
      <div className={cn('eden-auth-root', styles.root, styles.shell, embedded && styles.embedded, className)}>
        <AuthVisualBackground />

        <main className={styles.content}>
          <section className={styles.brandColumn} aria-label="Eden ERP">
            <div>
              <Image
                src="/brand/eden-logo-colored.png"
                alt="Eden ERP"
                width={280}
                height={125}
                className={styles.brandLogo}
                priority
              />
              <h1 className={styles.headline}>Eden ERP</h1>
              <p className={styles.intro}>
                Yapay zekâ destekli, bank native altyapısı ve uçtan uca entegrasyon ile işletmenizi geleceğe taşıyın.
              </p>
              <span className={styles.signalLine} />
            </div>

            <div className={styles.featureGrid}>
              {PLATFORM_FEATURES.map(feature => {
                const Icon = feature.icon
                return (
                  <article
                    key={feature.title}
                    className={styles.featureCard}
                    style={{ '--feature-color': feature.color } as CSSProperties}
                  >
                    <div className={styles.iconBox}>
                      <Icon size={25} strokeWidth={1.8} />
                    </div>
                    <h2 className={styles.cardTitle}>{feature.title}</h2>
                    <p className={styles.cardText}>{feature.desc}</p>
                  </article>
                )
              })}
            </div>

            <div className={styles.moduleGrid}>
              {MODULES.map(module => {
                const Icon = module.icon
                return (
                  <article
                    key={module.name}
                    className={styles.moduleCard}
                    style={{ '--feature-color': module.color } as CSSProperties}
                  >
                    <div className={styles.iconBox}>
                      <Icon size={22} strokeWidth={1.8} />
                    </div>
                    <div>
                      <h2 className={styles.cardTitle}>{module.name}</h2>
                      <p className={styles.cardText}>{module.desc}</p>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className={styles.trustStrip}>
              {TRUST_ITEMS.map(item => {
                const Icon = item.icon
                return (
                  <div key={item.title} className={styles.trustItem}>
                    <Icon className={styles.trustIcon} size={31} strokeWidth={1.7} />
                    <div>
                      <div className={styles.trustTitle}>{item.title}</div>
                      <div className={styles.trustText}>{item.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className={styles.panelColumn} aria-label="Giriş ve kayıt">
            <div className={styles.authPanel}>
              <div className={styles.panelInner}>
                <div className={styles.panelLogoWrap}>
                  <Image
                    src="/brand/eden-logo-colored.png"
                    alt="Eden ERP"
                    width={180}
                    height={80}
                    className={styles.panelLogo}
                    priority
                  />
                </div>

                {step === 'kimlik' ? (
                  <form
                    onSubmit={event => {
                      event.preventDefault()
                      if (!loading) void handleStep1()
                    }}
                  >
                    <AuthModeSwitch mode={authMode} onChange={switchAuthMode} loginEnabled={loginEnabled} />
                    <h2 className={styles.formTitle}>{modeCopy.title}</h2>
                    <p className={styles.formSubtitle}>
                      {authMode === 'signup'
                        ? 'Yeni bir şirket hesabı açabilir veya kayıtlı şirketinize katılma talebi gönderebilirsiniz.'
                        : modeCopy.subtitle}
                    </p>

                    {authMode === 'signup' && (
                      <div className={styles.signupOptions}>
                        {SIGNUP_FLOW_OPTIONS.map(option => {
                          const selected = signupFlow === option.value
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => switchSignupFlow(option.value)}
                              className={cn(styles.optionButton, selected && styles.selectedOption)}
                            >
                              <span className={styles.optionContent}>
                                <span className={styles.optionCheck}>
                                  <CheckCircle2 size={14} />
                                </span>
                                <span>
                                  <span className={styles.optionTitle}>{option.label}</span>
                                  <span className={styles.optionDescription}>{option.description}</span>
                                </span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {authMode === 'signup' && signupFlow === 'join_company' ? (
                      <div className={styles.joinStack}>
                        <div>
                          <label className={styles.label}>Şirket VKN</label>
                          <div className={styles.fieldRow}>
                            <input
                              type="text"
                              value={joinForm.tax_number}
                              onChange={event => {
                                setJoinForm(current => ({ ...current, tax_number: onlyDigits(event.target.value, 10) }))
                                setSelectedJoinCompanyId(null)
                                setJoinMatches([])
                                setJoinLookupMessage(null)
                                setError('')
                              }}
                              placeholder="10 haneli VKN"
                              className={textInputClass}
                              inputMode="numeric"
                              autoFocus={autoFocus}
                            />
                            <button
                              type="button"
                              onClick={() => lookupCompanyJoinMatches()}
                              disabled={joinLookupLoading}
                              className={styles.lookupButton}
                              title="VKN sorgula"
                              aria-label="VKN sorgula"
                            >
                              {joinLookupLoading ? <span className={styles.spinner} /> : <Search size={18} />}
                            </button>
                          </div>
                          {joinLookupMessage && <p className={styles.warningText} role="status">{joinLookupMessage}</p>}
                        </div>

                        {joinMatches.length > 0 && (
                          <div className={styles.joinStack}>
                            {joinMatches.map(match => {
                              const selected = selectedJoinCompanyId === match.company_id
                              return (
                                <button
                                  key={`${match.tenant_id}-${match.company_id}`}
                                  type="button"
                                  onClick={() => setSelectedJoinCompanyId(match.company_id)}
                                  className={cn(styles.matchButton, selected && styles.selectedOption)}
                                >
                                  <span className={styles.matchTitle}>{match.company_name}</span>
                                  <span className={styles.matchDescription}>{match.tenant_name}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}

                        <div className={styles.fieldGrid}>
                          <input
                            type="text"
                            value={joinForm.first_name}
                            onChange={event => setJoinForm(current => ({ ...current, first_name: event.target.value }))}
                            placeholder="Ad"
                            className={textInputClass}
                          />
                          <input
                            type="text"
                            value={joinForm.last_name}
                            onChange={event => setJoinForm(current => ({ ...current, last_name: event.target.value }))}
                            placeholder="Soyad"
                            className={textInputClass}
                          />
                        </div>

                        <input
                          type="text"
                          value={joinForm.national_id}
                          onChange={event => setJoinForm(current => ({ ...current, national_id: onlyDigits(event.target.value, 11) }))}
                          placeholder="TC kimlik no"
                          className={textInputClass}
                          inputMode="numeric"
                        />

                        <div className={styles.fieldGrid}>
                          <input
                            type="email"
                            value={joinForm.email}
                            onChange={event => setJoinForm(current => ({ ...current, email: event.target.value }))}
                            placeholder="E-posta"
                            className={textInputClass}
                            autoComplete="email"
                          />
                          <input
                            type="tel"
                            value={joinForm.phone}
                            onChange={event => setJoinForm(current => ({ ...current, phone: onlyDigits(event.target.value, 11) }))}
                            placeholder="Telefon"
                            className={textInputClass}
                            autoComplete="tel"
                          />
                        </div>

                        <select
                          value={joinForm.gender}
                          onChange={event => setJoinForm(current => ({ ...current, gender: event.target.value as JoinFormState['gender'] }))}
                          className={textInputClass}
                        >
                          <option value="male">Erkek</option>
                          <option value="female">Kadın</option>
                        </select>

                        {error && <p className={styles.errorText} role="alert">{error}</p>}
                      </div>
                    ) : (
                      <div className={styles.fieldGroup}>
                        <label className={styles.label}>Cep Telefonu veya E-posta</label>
                        <input
                          type="text"
                          value={value}
                          onChange={event => {
                            setValue(event.target.value)
                            setError('')
                          }}
                          placeholder="5554443322 veya ornek@eden.com"
                          className={textInputClass}
                          autoComplete="username"
                          autoFocus={autoFocus}
                        />
                        {error && <p className={styles.errorText} role="alert">{error}</p>}
                      </div>
                    )}

                    <button type="submit" disabled={loading} className={styles.primaryButton}>
                      {loading ? modeCopy.loadingLabel : modeCopy.primaryLabel}
                      {!loading && <ArrowRight size={19} />}
                    </button>
                    <p className={styles.helperText}>{modeCopy.helper}</p>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('kimlik')
                        setOtp(['', '', '', '', '', ''])
                        setFallbackCode(null)
                        setOtpError('')
                      }}
                      className={styles.backButton}
                    >
                      <ArrowLeft size={16} />
                      Geri
                    </button>
                    <h2 className={styles.formTitle}>{joinRequestCompleted ? 'Talep Alındı' : modeCopy.otpTitle}</h2>
                    <p className={styles.formSubtitle}>
                      {joinRequestCompleted
                        ? 'Başvurunuz onay sürecine alındı.'
                        : `${isEmailLogin ? `${value} adresine` : `${value} numarasına`} ${modeCopy.otpSubtitleSuffix}`}
                    </p>

                    {!joinRequestCompleted && fallbackCode && (
                      <div className={styles.infoPanel} role="status">
                        <div className={styles.temporaryCodeTitle}>{modeCopy.temporaryCodeTitle}</div>
                        <div className={styles.temporaryCode}>{fallbackCode}</div>
                        <div className={styles.temporaryText}>
                          SMS servisi bağlanana kadar bu geçici kodu kullanın.
                        </div>
                        {error && <div className={styles.embeddedError}>{error}</div>}
                      </div>
                    )}

                    {!joinRequestCompleted && !fallbackCode && error && (
                      <div className={styles.errorPanel} role="alert">{error}</div>
                    )}

                    {!joinRequestCompleted && (
                      <div className={styles.otpRow}>
                        {otp.map((digit, index) => (
                          <input
                            key={index}
                            ref={element => {
                              otpRefs.current[index] = element
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={event => handleOtpInput(index, event.target.value)}
                            onPaste={handleOtpPaste}
                            onKeyDown={event => {
                              if (event.key === 'Backspace' && !digit && index > 0) otpRefs.current[index - 1]?.focus()
                            }}
                            className={otpInputClass}
                            aria-label={`Kod hanesi ${index + 1}`}
                            autoComplete={index === 0 ? 'one-time-code' : 'off'}
                            autoFocus={autoFocus && index === 0}
                          />
                        ))}
                      </div>
                    )}

                    {!joinRequestCompleted && otpError && <p className={styles.errorText} role="alert">{otpError}</p>}
                    {success && (
                      <div className={styles.successPanel} role="status">
                        {joinRequestCompleted ? joinRequestMessage : redirectOnSuccess ? modeCopy.successMessage : 'Kod doğrulandı.'}
                      </div>
                    )}

                    {joinRequestCompleted && (
                      <button
                        type="button"
                        onClick={() => {
                          if (loginEnabled) {
                            switchAuthMode('login')
                            return
                          }
                          setStep('kimlik')
                          setSuccess(false)
                          setJoinRequestMessage(null)
                          setOtp(['', '', '', '', '', ''])
                          setFallbackCode(null)
                          setOtpError('')
                        }}
                        className={styles.primaryButton}
                      >
                        Giriş ekranına dön
                      </button>
                    )}

                    {!joinRequestCompleted && (
                      <div className={styles.otpMeta}>
                        <span>Kalan süre: <b>{formatTimer(timer)}</b></span>
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={!resendActive || loading}
                          className={styles.resendButton}
                        >
                          Kodu tekrar gönder
                        </button>
                      </div>
                    )}

                    {!joinRequestCompleted && fallbackCode && (
                      <p className={styles.temporaryNote}>
                        Telefon doğrulama servisi hazır olana kadar kod ekranda gösterilir.
                      </p>
                    )}
                  </>
                )}

                <SecurityNote />
              </div>
            </div>
          </section>
        </main>
      </div>
    )
}

export default LoginExperience
