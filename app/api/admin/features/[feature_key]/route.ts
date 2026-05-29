// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// TARGET_FASTAPI_ENDPOINT: /api/v1/admin/features/{feature_key}
// NOTES: Admin feature flag update proxy; no legacy fallback.

import { NextRequest } from 'next/server'
import { proxyToFastApiAdmin } from '../../_proxy'

export const runtime = 'nodejs'

type Params = { params: Promise<{ feature_key: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { feature_key } = await params
  return proxyToFastApiAdmin(request, `/api/v1/admin/features/${encodeURIComponent(feature_key)}`)
}
