// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// TARGET_FASTAPI_ENDPOINT: /api/v1/admin/outbox
// NOTES: Admin outbox proxy; no legacy fallback.

import { NextRequest } from 'next/server'
import { proxyToFastApiAdmin } from '../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiAdmin(request, '/api/v1/admin/outbox')
}
