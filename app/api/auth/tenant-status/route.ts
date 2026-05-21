import { NextResponse } from 'next/server'
import { lookupTenantLoginStatus } from '@/lib/auth/tenantUserLookup'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = createServiceClient()
    const status = await lookupTenantLoginStatus(supabase)

    return NextResponse.json({ data: status })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login status could not be checked.' },
      { status: 500 }
    )
  }
}
