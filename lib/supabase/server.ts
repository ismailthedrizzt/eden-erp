import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Deprecated legacy compatibility module.
// Canonical data access is FastAPI/local PostgreSQL through the Next BFF proxy.
// Do not add new imports from this file; existing imports are tracked as
// migration inventory until they are moved to FastAPI/local DB endpoints.

type CookieToSet = {
  name: string
  value: string
  options?: Record<string, unknown>
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component - cookies set edilemez, middleware halleder
          }
        },
      },
    }
  )
}

// Service role client - sadece API routes'ta kullan
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )
}
