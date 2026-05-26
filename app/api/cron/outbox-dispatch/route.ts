import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { dispatchOutboxEvents } from '@/lib/outbox/outboxDispatcher'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    || request.nextUrl.searchParams.get('secret')

  if (secret && provided !== secret) {
    return NextResponse.json({ error: 'Cron yetkisi gecersiz.', code: 'CRON_UNAUTHORIZED' }, { status: 401 })
  }
  if (!secret && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'CRON_SECRET tanimli degil.', code: 'CRON_SECRET_MISSING' }, { status: 503 })
  }

  const limit = Number(request.nextUrl.searchParams.get('limit') || 25)
  const supabase = createServiceClient()
  const result = await dispatchOutboxEvents(supabase as any, {
    limit: Number.isFinite(limit) ? Math.max(1, Math.min(limit, 100)) : 25,
    lockedBy: 'cron-outbox-dispatch',
  })

  return NextResponse.json({ data: result, message: 'Outbox dispatch tamamlandi' }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
