// BACKEND_MIGRATION_STATUS: keep_session_bootstrap
// CANONICAL_BACKEND: Next.js BFF/session adapter
// TARGET_FASTAPI_ENDPOINT: none
// Session/auth bootstrap route; may read auth/session context but does not own canonical ERP mutation.
import { NextResponse } from 'next/server'
import { APP_SESSION_COOKIE_NAME } from '@/lib/auth/appSession'
import { OTP_COOKIE_NAME } from '@/lib/auth/emailOtp'
import { SETUP_INTENT_COOKIE_NAME } from '@/lib/auth/setupIntent'

export async function POST() {
  const response = NextResponse.json({ ok: true })

  response.cookies.set(APP_SESSION_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  response.cookies.set(OTP_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  response.cookies.set(SETUP_INTENT_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
  response.cookies.set('demo_auth', '', {
    path: '/',
    maxAge: 0,
  })

  return response
}
