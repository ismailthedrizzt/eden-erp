import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OTP_COOKIE_NAME, verifyEmailOtp } from '@/lib/auth/emailOtp'
import { APP_SESSION_COOKIE_NAME, appSessionCookieOptions, createAppSessionToken } from '@/lib/auth/appSession'
import { createSetupIntentToken, SETUP_INTENT_COOKIE_NAME, setupIntentCookieOptions } from '@/lib/auth/setupIntent'
import { TENANT_ID_COOKIE, WORKSPACE_ID_COOKIE } from '@/lib/tenancy/constants'
import { lookupTenantUserAccess, normalizeLoginIdentifier } from '@/lib/auth/tenantUserLookup'
import { enforceRateLimit } from '@/lib/security/rateLimit'

// POST /api/auth/otp -> Verify OTP token
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const auth = supabase.auth as typeof supabase.auth & {
    verifyOtp: (params: unknown) => Promise<any>
  }
  const { type, identifier, token, purpose } = await request.json()
  const isSignup = purpose === 'signup'
  const normalizedIdentifier = normalizeLoginIdentifier(String(identifier || ''))

  if (!normalizedIdentifier || !token) {
    return NextResponse.json({ error: 'identifier ve token zorunludur.' }, { status: 400 })
  }

  const limited = enforceRateLimit(
    request,
    `otp-verify:${isSignup ? 'signup' : 'login'}`,
    normalizedIdentifier.identifier,
    { limit: 8, windowMs: 10 * 60 * 1000 }
  )
  if (limited) return limited

  try {
    if (type === 'email' || type === 'phone') {
      const isValidEmailOtp = verifyEmailOtp(request.cookies.get(OTP_COOKIE_NAME)?.value, normalizedIdentifier.identifier, token)

      if (isValidEmailOtp) {
        if (isSignup) {
          const response = NextResponse.json({ ok: true })
          response.headers.set('Cache-Control', 'no-store')
          response.cookies.set(
            SETUP_INTENT_COOKIE_NAME,
            createSetupIntentToken(normalizedIdentifier.identifier, normalizedIdentifier.type),
            setupIntentCookieOptions()
          )
          response.cookies.set(OTP_COOKIE_NAME, '', {
            path: '/',
            maxAge: 0,
          })

          return response
        }

        const tenantAccess = await lookupTenantUserAccess(normalizedIdentifier.identifier)
        if (!tenantAccess.tenants.length) {
          return NextResponse.json({ error: tenantAccess.message, code: 'TENANT_ACCESS_REQUIRED' }, { status: 403 })
        }

        const tenant = tenantAccess.tenants.find(item => item.is_default) || tenantAccess.tenants[0]
        const sessionToken = await createAppSessionToken({
          sub: tenantAccess.user_id || normalizedIdentifier.identifier,
          userId: tenantAccess.user_id || undefined,
          tenantId: tenant?.tenant_id,
          email: normalizedIdentifier.type === 'email' ? normalizedIdentifier.identifier : undefined,
          phone: normalizedIdentifier.type === 'phone' ? normalizedIdentifier.identifier : undefined,
        })
        const response = NextResponse.json({
          user: {
            id: tenantAccess.user_id,
            email: normalizedIdentifier.type === 'email' ? normalizedIdentifier.identifier : null,
            phone: normalizedIdentifier.type === 'phone' ? normalizedIdentifier.identifier : null,
            name: tenantAccess.display_name,
          },
          tenant,
        })
        response.headers.set('Cache-Control', 'no-store')
        response.cookies.set(APP_SESSION_COOKIE_NAME, sessionToken, appSessionCookieOptions())
        response.cookies.set(SETUP_INTENT_COOKIE_NAME, '', {
          path: '/',
          maxAge: 0,
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        })
        if (tenant?.tenant_id) {
          const tenantCookieOptions = {
            path: '/',
            sameSite: 'lax' as const,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 365,
          }
          response.cookies.set(TENANT_ID_COOKIE, tenant.tenant_id, tenantCookieOptions)
          response.cookies.set(WORKSPACE_ID_COOKIE, tenant.tenant_id, tenantCookieOptions)
        }
        response.cookies.set(OTP_COOKIE_NAME, '', {
          path: '/',
          maxAge: 0,
        })

        return response
      }
    }

    let result
    if (type === 'email') {
      result = await auth.verifyOtp({ email: normalizedIdentifier.identifier, token, type: 'email' })
    } else {
      const phone = normalizedIdentifier.identifier.startsWith('+') ? normalizedIdentifier.identifier : `+90${normalizedIdentifier.identifier.replace(/^0/, '')}`
      result = await auth.verifyOtp({ phone, token, type: 'sms' })
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 401 })
    }

    return NextResponse.json({ user: result.data.user })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
