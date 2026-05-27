// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: outbox
// TARGET_FASTAPI_ENDPOINT: python-worker:outbox-dispatch
// NOTES: Outbox dispatcher belongs in Python worker infrastructure; cron endpoint is a temporary trigger.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { dispatchPendingEvents } from '@/lib/outbox/outboxDispatcher'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    || request.nextUrl.searchParams.get('secret')

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Cron yetkisi gecersiz.', code: 'CRON_UNAUTHORIZED' }, { status: 401 })
  }

  const limit = Number(request.nextUrl.searchParams.get('limit') || 25)
  const supabase = createServiceClient()
  const result = await dispatchPendingEvents(supabase as any, {
    batchSize: Number.isFinite(limit) ? Math.max(1, Math.min(limit, 100)) : 25,
    maxRuntimeMs: 25000,
    lockTtlSeconds: 300,
    lockedBy: 'cron-outbox-dispatch',
  })

  return NextResponse.json({ ...result }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(request: NextRequest) {
  return POST(request)
}
