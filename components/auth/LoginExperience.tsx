'use client'

import { useEffect, useRef, useState, type ClipboardEvent, type ReactNode } from 'react'
import { LogIn, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

const MODULES = [
  { color: '#34d399', name: 'İnsan Kaynakları', desc: 'Teşkilat, kadro, çalışan yönetimi' },
  { color: '#60a5fa', name: 'Muhasebe', desc: 'Nakit akışı, borç takip, raporlar' },
  { color: '#fb923c', name: 'Üretim & Teknik Servis', desc: 'İş emirleri, servis takibi' },
  { color: '#a78bfa', name: 'Stok & Satış', desc: 'Ürünler, teklifler, siparişler' },
]

const textInputClass =
  'w-full rounded-xl border border-[#28445c] bg-[#091826] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-white/35 focus:border-eden-blue focus:ring-2 focus:ring-eden-blue/25'

const otpInputClass =
  'h-11 w-8 rounded-xl border border-[#28445c] bg-[#091826] text-center text-lg font-bold text-white outline-none transition-all focus:border-eden-blue focus:ring-2 focus:ring-eden-blue/25 sm:h-14 sm:w-12 sm:text-xl'

type AuthMode = 'login' | 'signup'

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

function AuthModeSwitch({ mode, onChange }: { mode: AuthMode; onChange: (mode: AuthMode) => void }) {
  const options: Array<{ value: AuthMode; label: string; icon: ReactNode }> = [
    { value: 'login', label: 'Giriş Yap', icon: <LogIn size={15} /> },
    { value: 'signup', label: 'Kaydol', icon: <UserPlus size={15} /> },
  ]

  return (
    <div className="mb-6 grid grid-cols-2 rounded-xl border border-[#28445c] bg-[#091826] p-1">
      {options.map(option => {
        const selected = option.value === mode
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition',
              selected
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
}

export function LoginExperience({
  embedded = false,
  redirectOnSuccess = true,
  autoFocus = true,
  className,
}: LoginExperienceProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [step, setStep] = useState<'kimlik' | 'otp'>('kimlik')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [success, setSuccess] = useState(false)
  const [fallbackCode, setFallbackCode] = useState<string | null>(null)
  const [timer, setTimer] = useState(300)
  const [resendActive, setResendActive] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isEmailLogin = value.includes('@')
  const modeCopy = AUTH_MODE_COPY[authMode]

  useEffect(() => {
    if (step === 'otp') startTimer()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [step])

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

  function createFallbackCode() {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setFallbackCode(code)
    return code
  }

  function switchAuthMode(nextMode: AuthMode) {
    if (nextMode === authMode) return

    setAuthMode(nextMode)
    setStep('kimlik')
    setError('')
    setOtpError('')
    setSuccess(false)
    setFallbackCode(null)
    setOtp(['', '', '', '', '', ''])
  }

  async function sendEmailOtp(email: string) {
    const response = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const detail = [data.code, data.detail].filter(Boolean).join(' - ')
      throw new Error(
        detail
          ? `${data.error || 'Doğrulama kodu gönderilemedi.'} (${detail})`
          : data.error || 'Doğrulama kodu gönderilemedi.'
      )
    }
  }

  async function handleStep1() {
    const trimmedValue = value.trim()
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)
    const isPhone = /^[0-9]{10,11}$/.test(trimmedValue.replace(/\s/g, ''))
    if (!isEmail && !isPhone) {
      setError('Geçerli bir e-posta veya telefon numarası giriniz.')
      return
    }

    setLoading(true)
    setError('')
    setFallbackCode(null)
    setSuccess(false)
    setOtp(['', '', '', '', '', ''])
    try {
      if (isEmail) {
        await sendEmailOtp(trimmedValue.toLowerCase())
        setStep('otp')
        return
      }

      const code = createFallbackCode()
      setStep('otp')
      setError(modeCopy.demoCodeMessage)
      console.log('Geçici OTP kodu:', code)
    } catch (cause) {
      console.error('Kod gönderim hatası:', getErrorMessage(cause, 'Bilinmeyen hata'))
      setError(getErrorMessage(cause, 'Kod gönderilemedi. Lütfen tekrar deneyin.'))
    } finally {
      setLoading(false)
    }
  }

  async function verifyEmailCode(code: string) {
    const response = await fetch('/api/auth/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email', identifier: value.trim().toLowerCase(), token: code }),
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.error || 'Kod hatalı. Lütfen tekrar deneyin.')
    }
  }

  function completeLogin() {
    setSuccess(true)
    if (!redirectOnSuccess) return

    if (typeof window !== 'undefined') {
      document.cookie = 'demo_auth=true; path=/; max-age=3600; sameSite=lax'
      window.location.href = '/app'
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
        if (fallbackCode && code === fallbackCode) {
          completeLogin()
          return
        }

        if (isEmailLogin) {
          await verifyEmailCode(code)
          completeLogin()
          return
        }

        setOtpError('Kod hatalı. Lütfen tekrar deneyin.')
        setOtp(['', '', '', '', '', ''])
        otpRefs.current[0]?.focus()
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
      if (fallbackCode && code === fallbackCode) {
        completeLogin()
        return
      }

      if (isEmailLogin) {
        await verifyEmailCode(code)
        completeLogin()
        return
      }

      setOtpError('Kod hatalı. Lütfen tekrar deneyin.')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
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
      if (isEmailLogin) {
        await sendEmailOtp(value.trim().toLowerCase())
      } else {
        createFallbackCode()
      }
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
      <div className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#0a1623] via-[#102b40] to-[#216688] p-16 lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(14,140,97,0.14),transparent_58%)]" />
        <div className="relative max-w-sm text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-eden-blue shadow-lg">
            <svg width="44" height="44" fill="none" stroke="white" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 4.5-9 4.5-9-4.5L12 3zM3 12l9 4.5 9-4.5M3 17l9 4.5 9-4.5" />
            </svg>
          </div>
          <h1 className="mb-3 font-display text-3xl font-bold text-white">Eden Teknoloji</h1>
          <p className="mb-10 text-sm leading-relaxed text-white/60">
            Kurumsal ERP platformuna erişmek veya yeni kullanıcı kaydı başlatmak için kurumsal e-posta adresinizi ya da kayıtlı telefon numaranızı kullanın.
          </p>
          <div className="flex flex-col gap-3">
            {MODULES.map(module => (
              <div key={module.name} className="flex items-center gap-3 rounded-xl border border-[#35657a]/70 bg-[#10283a]/70 px-4 py-3 text-left">
                <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: module.color }} />
                <div>
                  <div className="text-sm font-medium text-white/85">{module.name}</div>
                  <div className="mt-0.5 text-xs text-white/45">{module.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-[#0b1724] p-6 sm:p-10 lg:w-[440px] lg:border-l lg:border-[#28445c]">
        <div className="w-full max-w-sm rounded-2xl border border-[#28445c] bg-[#0f2233]/92 p-6 shadow-2xl shadow-black/25 sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-eden-blue">
              <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 4.5-9 4.5-9-4.5L12 3z" />
              </svg>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-white/45">Eden Teknoloji</div>
              <div className="font-display text-base font-bold text-white">ERP Sistemi</div>
            </div>
          </div>

          {step === 'kimlik' ? (
            <>
              <AuthModeSwitch mode={authMode} onChange={switchAuthMode} />
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
                    Bu kod, SMS gelmediğinde demo amaçlı kullanılabilir.
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
                  Demo kodu ekrandaki geçici koddur. Gerçek SMS Supabase&apos;de active.
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
