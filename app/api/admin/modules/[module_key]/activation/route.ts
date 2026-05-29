// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// TARGET_FASTAPI_ENDPOINT: /api/v1/admin/modules/{module_key}/activation
// NOTES: Admin module activation proxy; no legacy fallback.

import { NextRequest } from 'next/server'
import { proxyToFastApiAdmin } from '../../../_proxy'

export const runtime = 'nodejs'

type Params = { params: Promise<{ module_key: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { module_key } = await params
  return proxyToFastApiAdmin(
    request,
    `/api/v1/admin/modules/${encodeURIComponent(module_key)}/activation`
  )
}
