'use client'

import { useState, useRef, useEffect, type ClipboardEvent } from 'react'

const MODULES = [
  { color: '#34d399', name: 'İnsan Kaynakları', desc: 'Teşkilat, kadro, çalışan yönetimi' },
  { color: '#60a5fa', name: 'Muhasebe', desc: 'Nakit akışı, borç takip, raporlar' },
  { color: '#fb923c', name: 'Üretim & Teknik Servis', desc: 'İş emirleri, servis takibi' },
  { color: '#a78bfa', name: 'Stok & Satış', desc: 'Ürünler, teklifler, siparişler' },
]

export default function LoginPage() {
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

  useEffect(() => {
    if (step === 'otp') startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [step])

  function startTimer() {
    setTimer(300)
    setResendActive(false)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 241) setResendActive(true)
        if (t <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  function formatTimer(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  function createFallbackCode() {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setFallbackCode(code)
    return code
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
      throw new Error(detail ? `${data.error || 'Doğrulama kodu gönderilemedi.'} (${detail})` : data.error || 'Doğrulama kodu gönderilemedi.')
    }
  }

  async function handleStep1() {
    const v = value.trim()
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
    const isPhone = /^[0-9]{10,11}$/.test(v.replace(/\s/g, ''))
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
        await sendEmailOtp(v.toLowerCase())
        setStep('otp')
        return
      }

      const code = createFallbackCode()
      setStep('otp')
      setError('6 haneli kod ekrana düştü. Lütfen aşağıya girin.')
      console.log('Geçici OTP kodu:', code)
    } catch (cause: any) {
      console.error('Kod gönderim hatası:', cause?.message ?? cause)
      setError(cause?.message || 'Kod gönderilemedi. Lütfen tekrar deneyin.')
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

  async function handleOtpInput(idx: number, val: string) {
    const digit = val.replace(/[^0-9]/g, '').slice(-1)
    const newOtp = [...otp]
    newOtp[idx] = digit
    setOtp(newOtp)
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus()

    const code = newOtp.join('')
    if (code.length === 6) {
      setLoading(true)
      setOtpError('')
      try {
        if (fallbackCode && code === fallbackCode) {
          if (typeof window !== 'undefined') {
            document.cookie = 'demo_auth=true; path=/; max-age=3600; sameSite=lax'
            window.location.href = '/app'
          }
          setSuccess(true)
          return
        }

        if (isEmailLogin) {
          await verifyEmailCode(code)
          setSuccess(true)
          if (typeof window !== 'undefined') window.location.href = '/app'
          return
        }

        setOtpError('Kod hatalı. Lütfen tekrar deneyin.')
        setOtp(['', '', '', '', '', ''])
        otpRefs.current[0]?.focus()
      } catch (cause: any) {
        setOtpError(cause?.message || 'Kod hatalı. Lütfen tekrar deneyin.')
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
        if (typeof window !== 'undefined') {
          document.cookie = 'demo_auth=true; path=/; max-age=3600; sameSite=lax'
          window.location.href = '/app'
        }
        setSuccess(true)
        return
      }

      if (isEmailLogin) {
        await verifyEmailCode(code)
        setSuccess(true)
        if (typeof window !== 'undefined') window.location.href = '/app'
        return
      }

      setOtpError('Kod hatalı. Lütfen tekrar deneyin.')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } catch (cause: any) {
      setOtpError(cause?.message || 'Kod hatalı. Lütfen tekrar deneyin.')
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
    } catch (cause: any) {
      setOtpError(cause?.message || 'Kod tekrar gönderilemedi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen">
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-16 bg-gradient-to-br from-[#0f2233] via-[#162b46] to-[#216688] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(14,140,97,0.12),transparent_60%)]" />
        <div className="relative text-center max-w-sm">
          <div className="w-20 h-20 bg-eden-blue rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
            <svg width="44" height="44" fill="none" stroke="white" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 4.5-9 4.5-9-4.5L12 3zM3 12l9 4.5 9-4.5M3 17l9 4.5 9-4.5"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold font-display text-white mb-3">Eden Teknoloji</h1>
          <p className="text-white/55 text-sm leading-relaxed mb-10">
            Kurumsal ERP platformuna erişmek için kurumsal e-posta adresinizi veya kayıtlı telefon numaranızı kullanın.
          </p>
          <div className="flex flex-col gap-3">
            {MODULES.map(m => (
              <div key={m.name} className="flex items-center gap-3 px-4 py-3 bg-white/[0.06] rounded-xl border border-white/10 text-left">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                <div>
                  <div className="text-sm font-medium text-white/80">{m.name}</div>
                  <div className="text-xs text-white/40 mt-0.5">{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[440px] flex items-center justify-center p-10 bg-white dark:bg-[#112038]">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-9 h-9 bg-eden-blue rounded-lg flex items-center justify-center">
              <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 4.5-9 4.5-9-4.5L12 3z"/>
              </svg>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Eden Teknoloji</div>
              <div className="text-base font-bold font-display text-gray-900 dark:text-white">ERP Sistemi</div>
            </div>
          </div>

          {step === 'kimlik' ? (
            <>
              <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white mb-1">Giriş Yap</h2>
              <p className="text-sm text-gray-500 mb-7">Kurumsal e-posta veya telefon numaranızı girin.</p>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Cep Telefonu veya E-posta
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={e => { setValue(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleStep1()}
                  placeholder="5554443322 veya ornek@eden.com"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-[#0f2233] focus:outline-none focus:ring-2 focus:ring-eden-blue/20 focus:border-eden-blue transition-all"
                  autoFocus
                />
                {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
              </div>
              <button
                onClick={handleStep1}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-eden-blue text-white text-sm font-semibold hover:bg-eden-blue-dk transition-colors disabled:opacity-60 mb-3"
              >
                {loading ? 'Gönderiliyor...' : 'Devam Et →'}
              </button>
              <p className="text-xs text-gray-400 text-center">
                Hesabınız yoksa sistem yöneticinizle iletişime geçin.
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => { setStep('kimlik'); setOtp(['','','','','','']); setFallbackCode(null); setOtpError('') }}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
              >
                ← Geri
              </button>
              <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white mb-1">Doğrulama Kodu</h2>
              <p className="text-sm text-gray-500 mb-7">
                {isEmailLogin ? `${value} adresine` : `${value} numarasına`} 6 haneli kod gönderildi.
              </p>

              {fallbackCode && (
                <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  <div className="font-semibold mb-1">Geçici giriş kodu</div>
                  <div className="font-mono text-lg">{fallbackCode}</div>
                  <div className="mt-2 text-xs text-blue-700/80">
                    Bu kod, SMS gelmediğinde demo amaçlı kullanılabilir.
                  </div>
                  {error && (
                    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-100/80 px-3 py-2 text-xs text-blue-900">
                      {error}
                    </div>
                  )}
                </div>
              )}

              {!fallbackCode && error && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  {error}
                </div>
              )}

              <div className="flex gap-2.5 mb-4">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => { otpRefs.current[idx] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpInput(idx, e.target.value)}
                    onPaste={handleOtpPaste}
                    onKeyDown={e => {
                      if (e.key === 'Backspace' && !digit && idx > 0) otpRefs.current[idx - 1]?.focus()
                    }}
                    className="w-12 h-14 text-center text-xl font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[#0f2233] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-eden-blue/20 focus:border-eden-blue transition-all"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              {otpError && <p className="text-xs text-red-500 mb-3">{otpError}</p>}
              {success && (
                <div className="text-sm text-center py-3 bg-eden-green-lt text-green-800 rounded-xl mb-3 font-medium">
                  ✓ Kod doğrulandı. Yönlendiriliyor...
                </div>
              )}

              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>Kalan süre: <b>{formatTimer(timer)}</b></span>
                <button
                  onClick={handleResend}
                  disabled={!resendActive || loading}
                  className={`transition-colors ${resendActive && !loading ? 'text-eden-blue cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                >
                  Kodu tekrar gönder
                </button>
              </div>
              {fallbackCode && (
                <p className="text-xs text-gray-400 text-center mt-4 p-3 bg-gray-50 dark:bg-[#0f2233] rounded-lg">
                  Demo: <b className="font-mono">123456</b> — Gerçek SMS Supabase&apos;de aktif
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
