import { createBrowserClient } from '@supabase/ssr'

// Deprecated legacy compatibility module.
// Canonical browser auth uses eden_app_session cookies issued by Next auth
// routes. Do not add new imports from this file.

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  return browserClient
}
