// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// TARGET_FASTAPI_ENDPOINT: /api/v1/admin/outbox/{event_id}/retry
// NOTES: Admin outbox retry proxy; no legacy fallback.

import { NextRequest } from 'next/server'
import { proxyToFastApiAdmin } from '../../../_proxy'

export const runtime = 'nodejs'

type Params = { params: Promise<{ event_id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { event_id } = await params
  return proxyToFastApiAdmin(request, `/api/v1/admin/outbox/${encodeURIComponent(event_id)}/retry`)
}
