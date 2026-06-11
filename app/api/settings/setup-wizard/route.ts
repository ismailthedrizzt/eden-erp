// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/setup/wizard
// NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI.

import { NextRequest, NextResponse } from 'next/server'
import { fastApiUnavailableResponse, proxyJsonToFastApi, proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { SETUP_INTENT_COOKIE_NAME, verifySetupIntentToken } from '@/lib/auth/setupIntent'

export const runtime = 'nodejs'

function normalizeIdentity(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

function submittedSetupIdentity(payload: Record<string, unknown>) {
  const direct = normalizeIdentity(payload.email)
    || normalizeIdentity(payload.phone)
    || normalizeIdentity(payload.contact_email)
    || normalizeIdentity(payload.contact_phone)

  if (direct) return direct

  const owner = payload.owner && typeof payload.owner === 'object'
    ? payload.owner as Record<string, unknown>
    : null
  return normalizeIdentity(owner?.email) || normalizeIdentity(owner?.phone)
}

export async function GET(request: NextRequest) {
  const response = await proxyToFastApi(request, '/api/v1/setup/wizard', { internal: true })
  return response || fastApiUnavailableResponse()
}

export async function POST(request: NextRequest) {
  const setupIntent = verifySetupIntentToken(request.cookies.get(SETUP_INTENT_COOKIE_NAME)?.value)
  if (!setupIntent) {
    return NextResponse.json(
      { error: 'Setup intent required', code: 'SETUP_INTENT_REQUIRED' },
      { status: 401, headers: { 'cache-control': 'no-store, max-age=0' } }
    )
  }

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload', code: 'INVALID_JSON_PAYLOAD' },
      { status: 400, headers: { 'cache-control': 'no-store, max-age=0' } }
    )
  }

  const submittedIdentity = submittedSetupIdentity(payload)
  const verifiedIdentity = normalizeIdentity(setupIntent.identifier)
  if (submittedIdentity && submittedIdentity !== verifiedIdentity) {
    return NextResponse.json(
      { error: 'Setup identity mismatch', code: 'SETUP_IDENTITY_MISMATCH' },
      { status: 403, headers: { 'cache-control': 'no-store, max-age=0' } }
    )
  }

  const response = await proxyJsonToFastApi(request, '/api/v1/setup/wizard', payload, { internal: true })
  return response || fastApiUnavailableResponse()
}
