// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// TARGET_FASTAPI_ENDPOINT: /api/v1/admin/outbox/dispatch-once
// NOTES: Admin outbox dispatch proxy; no legacy fallback.

import { NextRequest } from 'next/server'
import { proxyToFastApiAdmin } from '../../_proxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return proxyToFastApiAdmin(request, '/api/v1/admin/outbox/dispatch-once')
}
