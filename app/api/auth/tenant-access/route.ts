// BACKEND_MIGRATION_STATUS: keep_session_bootstrap
// CANONICAL_BACKEND: Next.js BFF/session adapter
// TARGET_FASTAPI_ENDPOINT: none
// Session/auth bootstrap route; may read auth/session context but does not own canonical ERP mutation.
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { lookupTenantUserAccess } from '@/lib/auth/tenantUserLookup'
import { enforceRateLimit } from '@/lib/security/rateLimit'

export const runtime = 'nodejs'

const RequestSchema = z.object({
  identifier: z.string().trim().min(3, 'Gecerli bir e-posta veya telefon numarasi giriniz.'),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = RequestSchema.parse(await request.json())
    const limited = enforceRateLimit(request, 'tenant-access', parsed.identifier, { limit: 12, windowMs: 10 * 60 * 1000 })
    if (limited) return limited

    const result = await lookupTenantUserAccess(parsed.identifier)

    return NextResponse.json({ data: result }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Form verileri gecersiz.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kullanici sorgusu tamamlanamadi.' },
      { status: 400 }
    )
  }
}
