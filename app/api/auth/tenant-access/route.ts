import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { lookupTenantUserAccess } from '@/lib/auth/tenantUserLookup'

export const runtime = 'nodejs'

const RequestSchema = z.object({
  identifier: z.string().trim().min(3, 'Gecerli bir e-posta veya telefon numarasi giriniz.'),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = RequestSchema.parse(await request.json())
    const result = await lookupTenantUserAccess(parsed.identifier)

    return NextResponse.json({ data: result })
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
