import { NextRequest, NextResponse } from 'next/server'
import { createEmailOtp } from '@/lib/auth/emailOtp'
import { lookupTenantUserAccess, normalizeLoginIdentifier } from '@/lib/auth/tenantUserLookup'
import { EdenMailError, sendEdenMail } from '@/lib/mail/edenMail'
import { enforceRateLimit } from '@/lib/security/rateLimit'

export async function POST(request: NextRequest) {
  const { email, identifier, purpose } = await request.json().catch(() => ({ email: '', identifier: '', purpose: 'login' }))
  const normalizedIdentifier = normalizeLoginIdentifier(String(identifier || email || ''))
  const actionLabel = purpose === 'signup' ? 'kayit islemini' : 'giris islemini'

  if (!normalizedIdentifier) {
    return NextResponse.json({ error: 'Gecerli bir e-posta veya telefon numarasi giriniz.' }, { status: 400 })
  }

  const limited = enforceRateLimit(
    request,
    `otp-send:${purpose === 'signup' ? 'signup' : 'login'}`,
    normalizedIdentifier.identifier,
    { limit: 5, windowMs: 10 * 60 * 1000 }
  )
  if (limited) return limited

  if (purpose !== 'signup') {
    try {
      const access = await lookupTenantUserAccess(normalizedIdentifier.identifier)
      if (!access.tenants.length) {
        return NextResponse.json({ error: access.message, code: 'USER_NOT_REGISTERED' }, { status: 403 })
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Kullanıcı sorgusu tamamlanamadı.' },
        { status: 500 }
      )
    }
  }

  try {
    const { otp, cookieName, cookieValue, maxAge } = createEmailOtp(normalizedIdentifier.identifier)
    const screenOtpAllowed = process.env.EDEN_ALLOW_SCREEN_OTP === 'true' || process.env.NODE_ENV !== 'production'

    if (normalizedIdentifier.type === 'email') {
      await sendEdenMail({
        to: normalizedIdentifier.identifier,
        subject: 'Eden ERP dogrulama kodu',
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
            <h2 style="margin:0 0 12px">Eden ERP dogrulama kodu</h2>
            <p>${actionLabel} tamamlamak icin asagidaki 6 haneli kodu kullanin.</p>
            <div style="font-size:28px;font-weight:700;letter-spacing:6px;margin:20px 0">${otp}</div>
            <p style="color:#6b7280;font-size:13px">Bu kod 5 dakika gecerlidir.</p>
          </div>
        `,
      })
    } else if (!screenOtpAllowed) {
      return NextResponse.json(
        {
          error: 'Telefon ile dogrulama icin SMS gonderimi henuz yapilandirilmadi.',
          code: 'SMS_OTP_NOT_CONFIGURED',
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const response = NextResponse.json({
      ok: true,
      data: normalizedIdentifier.type === 'phone'
        ? { delivery: 'screen', fallbackCode: otp }
        : { delivery: 'email' },
    })
    response.headers.set('Cache-Control', 'no-store')
    response.cookies.set(cookieName, cookieValue, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge,
    })

    return response
  } catch (e: any) {
    console.error('OTP mail gonderim hatasi:', e?.message ?? e)
    const isMissingMailKey = e instanceof EdenMailError && e.message.includes('EDEN_MAIL_API_KEY')
    const isMissingOtpSecret = e instanceof Error && e.message.includes('OTP_SECRET')
    const detail = e instanceof EdenMailError && e.status
      ? `Mail API HTTP ${e.status}`
      : isMissingMailKey
        ? 'EDEN_MAIL_API_KEY ortam degiskeni Vercel runtime ortaminda tanimli degil.'
        : isMissingOtpSecret
          ? 'OTP_SECRET ortam degiskeni Vercel runtime ortaminda tanimli degil.'
          : undefined

    return NextResponse.json({
      error: 'Dogrulama kodu e-posta ile gonderilemedi.',
      code: isMissingMailKey ? 'MAIL_API_KEY_MISSING' : isMissingOtpSecret ? 'OTP_SECRET_MISSING' : 'MAIL_SEND_FAILED',
      detail,
    }, { status: isMissingMailKey || isMissingOtpSecret ? 500 : 502 })
  }
}
