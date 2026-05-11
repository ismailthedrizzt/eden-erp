import { NextRequest, NextResponse } from 'next/server'
import { createEmailOtp } from '@/lib/auth/emailOtp'
import { EdenMailError, sendEdenMail } from '@/lib/mail/edenMail'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  const { email } = await request.json().catch(() => ({ email: '' }))
  const normalizedEmail = String(email || '').trim().toLowerCase()

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return NextResponse.json({ error: 'Gecerli bir e-posta adresi giriniz.' }, { status: 400 })
  }

  try {
    const { otp, cookieName, cookieValue, maxAge } = createEmailOtp(normalizedEmail)

    await sendEdenMail({
      to: normalizedEmail,
      subject: 'Eden ERP dogrulama kodu',
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
          <h2 style="margin:0 0 12px">Eden ERP dogrulama kodu</h2>
          <p>Giris islemini tamamlamak icin asagidaki 6 haneli kodu kullanin.</p>
          <div style="font-size:28px;font-weight:700;letter-spacing:6px;margin:20px 0">${otp}</div>
          <p style="color:#6b7280;font-size:13px">Bu kod 5 dakika gecerlidir.</p>
        </div>
      `,
    })

    const response = NextResponse.json({ ok: true })
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
