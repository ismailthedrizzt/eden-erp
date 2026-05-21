import 'server-only'
import { createHmac, randomInt, timingSafeEqual } from 'crypto'

const OTP_TTL_SECONDS = 5 * 60
const OTP_COOKIE_NAME = 'eden_email_otp'

type OtpPayload = {
  email: string
  hash: string
  expiresAt: number
}

function getOtpSecret() {
  const secret = process.env.OTP_SECRET || (process.env.NODE_ENV === 'production' ? '' : process.env.CRON_SECRET)

  if (!secret) {
    throw new Error('OTP_SECRET tanimli degil.')
  }

  return secret
}

function sign(value: string) {
  return createHmac('sha256', getOtpSecret()).update(value).digest('base64url')
}

function hashOtp(email: string, otp: string, expiresAt: number) {
  return sign(`${email.toLowerCase()}:${otp}:${expiresAt}`)
}

export function createEmailOtp(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const otp = String(randomInt(100000, 1000000))
  const expiresAt = Date.now() + OTP_TTL_SECONDS * 1000
  const payload: OtpPayload = {
    email: normalizedEmail,
    hash: hashOtp(normalizedEmail, otp, expiresAt),
    expiresAt,
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const token = `${encodedPayload}.${sign(encodedPayload)}`

  return {
    otp,
    cookieName: OTP_COOKIE_NAME,
    cookieValue: token,
    maxAge: OTP_TTL_SECONDS,
  }
}

export function verifyEmailOtp(cookieValue: string | undefined, email: string, otp: string) {
  if (!cookieValue) return false

  const [encodedPayload, signature] = cookieValue.split('.')
  if (!encodedPayload || !signature || !safeEqual(signature, sign(encodedPayload))) return false

  let payload: OtpPayload
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
  } catch {
    return false
  }

  const normalizedEmail = email.trim().toLowerCase()
  if (payload.email !== normalizedEmail || Date.now() > payload.expiresAt) return false

  const expected = Buffer.from(payload.hash)
  const actual = Buffer.from(hashOtp(normalizedEmail, otp, payload.expiresAt))

  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export { OTP_COOKIE_NAME }

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}
