import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'
import type { LoginIdentifierType } from '@/lib/auth/tenantUserLookup'

const SETUP_INTENT_TTL_SECONDS = 30 * 60

export const SETUP_INTENT_COOKIE_NAME = 'eden_setup_intent'

type SetupIntentPayload = {
  identifier: string
  identifierType: LoginIdentifierType
  expiresAt: number
}

function getSetupIntentSecret() {
  const secret = process.env.SETUP_INTENT_SECRET
    || process.env.APP_SESSION_SECRET
    || process.env.OTP_SECRET
    || (process.env.NODE_ENV === 'production' ? '' : process.env.CRON_SECRET)

  if (!secret) {
    throw new Error('SETUP_INTENT_SECRET, APP_SESSION_SECRET veya OTP_SECRET tanimli degil.')
  }

  return secret
}

function sign(value: string) {
  return createHmac('sha256', getSetupIntentSecret()).update(value).digest('base64url')
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

export function setupIntentCookieOptions(maxAge = SETUP_INTENT_TTL_SECONDS) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge,
  }
}

export function createSetupIntentToken(
  identifier: string,
  identifierType: LoginIdentifierType,
  maxAge = SETUP_INTENT_TTL_SECONDS
) {
  const payload: SetupIntentPayload = {
    identifier: identifier.trim().toLowerCase(),
    identifierType,
    expiresAt: Date.now() + maxAge * 1000,
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encodedPayload}.${sign(encodedPayload)}`
}

export function verifySetupIntentToken(token: string | undefined) {
  if (!token) return null
  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature || !safeEqual(signature, sign(encodedPayload))) return null

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SetupIntentPayload
    if (!payload.identifier || !payload.identifierType || Date.now() > payload.expiresAt) return null
    return payload
  } catch {
    return null
  }
}
