import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieToSet = {
  name: string
  value: string
  options?: Parameters<NextResponse['cookies']['set']>[2]
}

const LOGIN_BYPASS_ENABLED = process.env.EDEN_LOGIN_DISABLED !== 'false'
const DEMO_AUTH_COOKIE_OPTIONS = {
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
  sameSite: 'lax' as const,
}

function withDemoAuth(response: NextResponse) {
  response.cookies.set('demo_auth', 'true', DEMO_AUTH_COOKIE_OPTIONS)
  return response
}

export async function middleware(request: NextRequest) {
  const isAuthPage = request.nextUrl.pathname.startsWith('/login')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')
  const isPwaAsset = [
    '/manifest.json',
    '/sw.js',
    '/workbox-',
    '/offline',
    '/icons/',
    '/eden-icon-original.png',
  ].some(path => request.nextUrl.pathname.startsWith(path))

  if (LOGIN_BYPASS_ENABLED && !isApiRoute && !isPwaAsset) {
    if (isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/app'
      return withDemoAuth(NextResponse.redirect(url))
    }

    return withDemoAuth(NextResponse.next({ request }))
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const auth = supabase.auth as typeof supabase.auth & {
    getUser: () => Promise<{ data: { user: any } }>
  }

  let user = null
  try {
    const { data } = await auth.getUser()
    user = data.user
  } catch {
    // Supabase env veya baglanti hazir degilse uygulama en azindan acilabilsin.
  }

  const isPublic = isAuthPage || isApiRoute || isPwaAsset
  const isDemo = request.cookies.get('demo_auth')?.value === 'true'

  // Giriş yapılmamış ve korunan sayfaya erişim → Login'e yönlendir
  if (!user && !isDemo && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Giriş yapılmış veya demo giriş yapılmışsa login sayfasına erişim → Ana sayfaya yönlendir
  if ((user || isDemo) && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*\\.js|icons|eden-icon-original.png).*)',
  ],
}
