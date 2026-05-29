// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// TARGET_FASTAPI_ENDPOINT: /api/v1/admin/settings/{settings_key}
// NOTES: Admin setting update proxy; no legacy fallback.

import { NextRequest } from 'next/server'
import { proxyToFastApiAdmin } from '../../_proxy'

export const runtime = 'nodejs'

type Params = { params: Promise<{ settings_key: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { settings_key } = await params
  return proxyToFastApiAdmin(request, `/api/v1/admin/settings/${encodeURIComponent(settings_key)}`)
}
