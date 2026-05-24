import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { APP_SESSION_COOKIE_NAME, verifyAppSessionToken } from '@/lib/auth/appSession'

type CookieToSet = {
  name: string
  value: string
  options?: Parameters<NextResponse['cookies']['set']>[2]
}

const LOGIN_BYPASS_ENABLED = process.env.EDEN_LOGIN_DISABLED === 'true'
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const PUBLIC_API_PREFIXES = [
  '/api/auth',
  '/api/cron',
  '/api/reference',
  '/api/settings/setup-wizard',
]

function isPathOrChild(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname.startsWith('/login')
  const isApiRoute = pathname.startsWith('/api')
  const isPublicApiRoute = isApiRoute && PUBLIC_API_PREFIXES.some(prefix => isPathOrChild(pathname, prefix))
  const isSetupWizardPage = pathname.startsWith('/app/sistem/kurulum')
  const isPwaAsset = [
    '/manifest.json',
    '/sw.js',
    '/workbox-',
    '/offline',
    '/brand/',
    '/icons/',
    '/eden-icon-original.png',
  ].some(path => pathname.startsWith(path))

  if (isApiRoute && UNSAFE_METHODS.has(request.method.toUpperCase()) && !isAllowedRequestOrigin(request)) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Request origin rejected', code: 'ORIGIN_REJECTED' }, { status: 403 }),
      request
    )
  }

  if (LOGIN_BYPASS_ENABLED && !isPwaAsset) {
    if (isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/app'
      return withSecurityHeaders(NextResponse.redirect(url), request)
    }

    return withSecurityHeaders(NextResponse.next({ request }), request)
  }

  const isPublic = isAuthPage || isPublicApiRoute || isPwaAsset || isSetupWizardPage
  const appSession = await verifyAppSessionToken(request.cookies.get(APP_SESSION_COOKIE_NAME)?.value)

  if (isPublic || appSession) {
    return withSecurityHeaders(NextResponse.next({ request }), request)
  }

  let supabaseResponse = withSecurityHeaders(NextResponse.next({ request }), request)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = withSecurityHeaders(NextResponse.next({ request }), request)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const auth = supabase.auth as typeof supabase.auth & {
    getUser: (jwt?: string) => Promise<{ data: { user: any } }>
  }

  let user = null
  try {
    const authorizationToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    const { data } = await auth.getUser(authorizationToken || undefined)
    user = data.user
  } catch {
    user = null
  }

  // Redirect unauthenticated protected requests.
  if (!user) {
    if (isApiRoute) {
      const response = NextResponse.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, { status: 401 })
      response.cookies.set(APP_SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0 })
      response.cookies.set('demo_auth', '', { path: '/', maxAge: 0 })
      return withSecurityHeaders(response, request)
    }

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const response = NextResponse.redirect(url)
    response.cookies.set(APP_SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0 })
    response.cookies.set('demo_auth', '', { path: '/', maxAge: 0 })
    return withSecurityHeaders(response, request)
  }

  return withSecurityHeaders(supabaseResponse, request)
}

function isAllowedRequestOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin) return true
  if (origin === request.nextUrl.origin) return true

  const configuredOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    ...(process.env.EDEN_ALLOWED_ORIGINS || '').split(','),
  ]
    .map(value => value?.trim())
    .filter(Boolean)

  if (configuredOrigins.includes(origin)) return true

  return process.env.NODE_ENV !== 'production' && isLocalDevOriginPair(origin, request.nextUrl.origin)
}

function isLocalDevOriginPair(origin: string, requestOrigin: string) {
  try {
    const originUrl = new URL(origin)
    const requestUrl = new URL(requestOrigin)
    const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1'])

    return (
      originUrl.protocol === requestUrl.protocol &&
      originUrl.port === requestUrl.port &&
      localHosts.has(originUrl.hostname) &&
      localHosts.has(requestUrl.hostname)
    )
  } catch {
    return false
  }
}

function withSecurityHeaders(response: NextResponse, request: NextRequest) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Content-Security-Policy', "frame-ancestors 'none'; base-uri 'self'; object-src 'none'")

  if (process.env.NODE_ENV === 'production' && request.nextUrl.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  if (request.nextUrl.pathname.startsWith('/api/auth') || UNSAFE_METHODS.has(request.method.toUpperCase())) {
    response.headers.set('Cache-Control', 'no-store')
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*\\.js|brand|icons|eden-icon-original.png).*)',
  ],
}
