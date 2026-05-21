'use client'

import { useEffect, useRef, useState, type ClipboardEvent, type ReactNode } from 'react'
import Image from 'next/image'
import {
  Building2,
  BrainCircuit,
  BriefcaseBusiness,
  Calculator,
  Factory,
  Landmark,
  LogIn,
  PackageCheck,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react'
import { setStoredTenantId } from '@/lib/tenancy/client'
import { cn } from '@/lib/utils'

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

const textInputClass =
  'w-full rounded-xl border border-[#28445c] bg-[#091826] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-white/35 focus:border-eden-blue focus:ring-2 focus:ring-eden-blue/25'

const otpInputClass =
  'h-11 w-8 rounded-xl border border-[#28445c] bg-[#091826] text-center text-lg font-bold text-white outline-none transition-all focus:border-eden-blue focus:ring-2 focus:ring-eden-blue/25 sm:h-14 sm:w-12 sm:text-xl'

type AuthMode = 'login' | 'signup'

type TenantAccessLookupResponse = {
  data?: {
    tenants?: Array<{
      tenant_id: string
      tenant_name: string
      role_label?: string | null
    }>
    message?: string
    status?: 'found' | 'no_tenants'
  }
  error?: string
}

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

function getErrorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback
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

function AuthModeSwitch({ mode, onChange, loginEnabled }: { mode: AuthMode; onChange: (mode: AuthMode) => void; loginEnabled: boolean }) {
  const options: Array<{ value: AuthMode; label: string; icon: ReactNode }> = [
    { value: 'login', label: 'Giriş Yap', icon: <LogIn size={15} /> },
    { value: 'signup', label: 'Kaydol', icon: <UserPlus size={15} /> },
  ]

  return (
    <div className="mb-6 grid grid-cols-2 rounded-xl border border-[#28445c] bg-[#091826] p-1">
      {options.map(option => {
        const selected = option.value === mode
        const disabled = option.value === 'login' && !loginEnabled
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            aria-disabled={disabled}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition',
              disabled
                ? 'cursor-not-allowed text-white/25'
                : selected
                ? 'bg-eden-blue text-white shadow-lg shadow-eden-blue/20'
                : 'text-white/55 hover:bg-white/5 hover:text-white'
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
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
  const [authMode, setAuthMode] = useState<AuthMode>('signup')
  const [step, setStep] = useState<'kimlik' | 'otp'>('kimlik')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loginEnabled, setLoginEnabled] = useState(false)
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
    setOtp(['', '', '', '', '', ''])
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

  async function lookupTenantAccess(identifier: string) {
    const response = await fetch('/api/auth/tenant-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
    })
    const data = await response.json().catch(() => ({})) as TenantAccessLookupResponse

    if (!response.ok) {
      throw new Error(data.error || 'Kullanıcı sorgusu tamamlanamadı.')
    }

    return data.data
  }

  function startSignupSetup(identifier: string) {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams({ signupIdentity: identifier })
    window.location.href = `${signupRedirectPath}?${params.toString()}`
  }

  function completeAuthFlow() {
    setSuccess(true)

    if (authMode === 'signup') {
      const normalizedIdentifier = normalizeAuthIdentifier(value)
      if (!normalizedIdentifier) {
        setOtpError('Gecerli bir e-posta veya telefon numarasi giriniz.')
        return
      }

      startSignupSetup(normalizedIdentifier.value)
      return
    }

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

    const normalizedIdentifier = normalizeAuthIdentifier(value)
    if (!normalizedIdentifier) {
      setError('Geçerli bir e-posta veya telefon numarası giriniz.')
      return
    }

    setLoading(true)
    setError('')
    setFallbackCode(null)
    setSuccess(false)
    setOtp(['', '', '', '', '', ''])
    try {
      if (authMode === 'signup') {
        setValue(normalizedIdentifier.value)
        const delivery = await sendOtp(normalizedIdentifier.value, 'signup')
        setFallbackCode(delivery?.fallbackCode || null)

        setStep('otp')
        return
      }

      const lookup = await lookupTenantAccess(normalizedIdentifier.value)
      const tenantCount = lookup?.tenants?.length || 0

      if (!tenantCount) {
        setError(lookup?.message || 'Henuz aktif sirket bulunmadigi icin giris gecici olarak pasif.')
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
        completeAuthFlow()
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
      completeAuthFlow()
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
    <div
      className={cn(
        'flex bg-[#08131f] text-white',
        embedded ? 'min-h-[720px] overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800' : 'min-h-screen',
        className
      )}
    >
      <div className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#07131f] via-[#10283b] to-[#1c617f] p-10 xl:p-14 lg:flex">
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="relative flex w-full max-w-2xl flex-col gap-7">
          <div>
            <Image
              src="/brand/eden-logo-colored.png"
              alt="Eden ERP"
              width={280}
              height={125}
              className="mb-5 h-auto w-56 object-contain drop-shadow-lg"
              priority
            />
            <h1 className="font-display text-4xl font-bold leading-tight text-white">Eden ERP</h1>
          </div>

          <div className="grid gap-3 xl:grid-cols-3">
            {PLATFORM_FEATURES.map(feature => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="rounded-xl border border-white/[0.12] bg-white/[0.07] p-4 text-left shadow-lg shadow-black/10 backdrop-blur">
                  <div
                    className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-white"
                    style={{ background: `${feature.color}26`, color: feature.color }}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="text-sm font-semibold text-white">{feature.title}</div>
                  <div className="mt-1.5 text-xs leading-5 text-white/50">{feature.desc}</div>
                </div>
              )
            })}
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {MODULES.map(module => {
              const Icon = module.icon
              return (
                <div key={module.name} className="flex min-h-[76px] items-center gap-3 rounded-xl border border-[#35657a]/60 bg-[#0f293b]/80 px-4 py-3 text-left shadow-lg shadow-black/10">
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${module.color}20`, color: module.color }}
                  >
                    <Icon size={19} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white/90">{module.name}</div>
                    <div className="mt-0.5 text-xs leading-5 text-white/[0.48]">{module.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-[#0b1724] p-6 sm:p-10 lg:w-[440px] lg:border-l lg:border-[#28445c]">
        <div className="w-full max-w-sm rounded-2xl border border-[#28445c] bg-[#0f2233]/92 p-6 shadow-2xl shadow-black/25 sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="mb-10 flex items-center gap-3">
            <Image
              src="/eden-icon-original.png"
              alt="Eden"
              width={44}
              height={44}
              className="h-11 w-11 flex-shrink-0 object-contain"
              priority
            />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-white/45">Eden Teknoloji</div>
              <div className="font-display text-base font-bold text-white">ERP Sistemi</div>
            </div>
          </div>

          {step === 'kimlik' ? (
            <>
              <AuthModeSwitch mode={authMode} onChange={switchAuthMode} loginEnabled={loginEnabled} />
              <h2 className="mb-1 font-display text-2xl font-bold text-white">{modeCopy.title}</h2>
              <p className="mb-7 text-sm text-white/55">{modeCopy.subtitle}</p>
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-white/60">
                  Cep Telefonu veya E-posta
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={event => {
                    setValue(event.target.value)
                    setError('')
                  }}
                  onKeyDown={event => event.key === 'Enter' && handleStep1()}
                  placeholder="5554443322 veya ornek@eden.com"
                  className={textInputClass}
                  autoComplete="username"
                  autoFocus={autoFocus}
                />
                {error && <p className="mt-1.5 text-xs text-red-300">{error}</p>}
              </div>
              <button
                type="button"
                onClick={handleStep1}
                disabled={loading}
                className="mb-3 w-full rounded-xl bg-eden-blue py-3 text-sm font-semibold text-white transition-colors hover:bg-eden-blue-dk disabled:opacity-60"
              >
                {loading ? modeCopy.loadingLabel : modeCopy.primaryLabel}
              </button>
              <p className="text-center text-xs text-white/40">
                {modeCopy.helper}
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setStep('kimlik')
                  setOtp(['', '', '', '', '', ''])
                  setFallbackCode(null)
                  setOtpError('')
                }}
                className="mb-6 flex items-center gap-1.5 text-sm text-white/55 transition-colors hover:text-white"
              >
                ← Geri
              </button>
              <h2 className="mb-1 font-display text-2xl font-bold text-white">{modeCopy.otpTitle}</h2>
              <p className="mb-7 text-sm text-white/55">
                {isEmailLogin ? `${value} adresine` : `${value} numarasına`} {modeCopy.otpSubtitleSuffix}
              </p>

              {fallbackCode && (
                <div className="mb-4 rounded-2xl border border-eden-blue/40 bg-[#10283a] px-4 py-3 text-sm text-sky-100">
                  <div className="mb-1 font-semibold">{modeCopy.temporaryCodeTitle}</div>
                  <div className="font-mono text-lg">{fallbackCode}</div>
                  <div className="mt-2 text-xs text-sky-100/70">
                    SMS servisi baglanana kadar bu gecici kodu kullanin.
                  </div>
                  {error && (
                    <div className="mt-3 rounded-xl border border-eden-blue/25 bg-[#0b1d2d] px-3 py-2 text-xs text-sky-100">
                      {error}
                    </div>
                  )}
                </div>
              )}

              {!fallbackCode && error && (
                <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
              )}

              <div className="mb-4 flex justify-between gap-1.5 sm:gap-2.5">
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

              {otpError && <p className="mb-3 text-xs text-red-300">{otpError}</p>}
              {success && (
                <div className="mb-3 rounded-xl border border-emerald-400/30 bg-emerald-500/15 py-3 text-center text-sm font-medium text-emerald-100">
                  {redirectOnSuccess ? modeCopy.successMessage : 'Kod doğrulandı.'}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-white/45">
                <span>Kalan süre: <b>{formatTimer(timer)}</b></span>
                <button
                  onClick={handleResend}
                  disabled={!resendActive || loading}
                  className={`transition-colors ${resendActive && !loading ? 'cursor-pointer text-sky-300 hover:text-white' : 'cursor-not-allowed opacity-50'}`}
                >
                  Kodu tekrar gönder
                </button>
              </div>
              {fallbackCode && (
                <p className="mt-4 rounded-lg border border-[#28445c] bg-[#091826] p-3 text-center text-xs text-white/45">
                  Telefon dogrulama servisi hazir olana kadar kod ekranda gosterilir.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default LoginExperience
