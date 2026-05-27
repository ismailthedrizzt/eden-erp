// BACKEND_MIGRATION_STATUS: proxy_to_fastapi_with_legacy_fallback
// TARGET_BACKEND_MODULE: outbox
// TARGET_FASTAPI_ENDPOINT: /api/v1/system/outbox/dispatch
// NOTES: Outbox dispatcher belongs in Python worker infrastructure; TS dispatcher is fallback only.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { createServiceClient } from '@/lib/supabase/server'
import { dispatchPendingEvents } from '@/lib/outbox/outboxDispatcher'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const fastApiResponse = await proxyToFastApi(request, '/api/v1/system/outbox/dispatch', {
    method: 'POST',
    internal: true,
  })
  if (fastApiResponse) return fastApiResponse

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
