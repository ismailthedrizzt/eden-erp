// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// TARGET_FASTAPI_ENDPOINT: /api/v1/admin/integrations/{integration_key}/test
// NOTES: Admin integration test proxy; no legacy fallback.

import { NextRequest } from 'next/server'
import { proxyToFastApiAdmin } from '../../../_proxy'

export const runtime = 'nodejs'

type Params = { params: Promise<{ integration_key: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { integration_key } = await params
  return proxyToFastApiAdmin(
    request,
    `/api/v1/admin/integrations/${encodeURIComponent(integration_key)}/test`
  )
}
