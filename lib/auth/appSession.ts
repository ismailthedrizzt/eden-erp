const APP_SESSION_TTL_SECONDS = 60 * 60

export const APP_SESSION_COOKIE_NAME = 'eden_app_session'

export type AppSessionPayload = {
  sub: string
  userId?: string
  tenantId?: string
  email?: string
  phone?: string
  expiresAt: number
}

function getSessionSecret() {
  const secret = process.env.APP_SESSION_SECRET
    || process.env.SETUP_INTENT_SECRET
    || process.env.OTP_SECRET
    || (process.env.NODE_ENV === 'production' ? '' : process.env.CRON_SECRET)

  if (!secret) {
    throw new Error('APP_SESSION_SECRET, SETUP_INTENT_SECRET veya OTP_SECRET tanimli degil.')
  }

  return secret
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

async function sign(value: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))

  return bytesToBase64Url(new Uint8Array(signature))
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false

  let result = 0
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return result === 0
}

export function appSessionCookieOptions(maxAge = APP_SESSION_TTL_SECONDS) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge,
  }
}

export async function createAppSessionToken(payload: Omit<AppSessionPayload, 'expiresAt'>, maxAge = APP_SESSION_TTL_SECONDS) {
  const sessionPayload: AppSessionPayload = {
    ...payload,
    expiresAt: Date.now() + maxAge * 1000,
  }
  const encodedPayload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(sessionPayload)))
  const signature = await sign(encodedPayload)

  return `${encodedPayload}.${signature}`
}

export async function verifyAppSessionToken(token: string | undefined) {
  if (!token) return null

  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return null

  try {
    const expectedSignature = await sign(encodedPayload)
    if (!safeEqual(signature, expectedSignature)) return null

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload))) as AppSessionPayload
    if (!payload.sub || Date.now() > payload.expiresAt) return null

    return payload
  } catch {
    return null
  }
}
