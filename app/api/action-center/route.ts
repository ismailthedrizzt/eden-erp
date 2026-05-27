// BACKEND_MIGRATION_STATUS: keep_bff_proxy_with_legacy_fallback
// TARGET_BACKEND_MODULE: action-center
// TARGET_FASTAPI_ENDPOINT: /api/v1/action-center
// NOTES: Unified pending work resolver belongs in Python; TS remains fallback only.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { buildActionCenterContext, parseActionCenterQuery } from '@/lib/action-center/actionCenterResolver'
import { listActionCenterItems } from '@/lib/action-center/actionCenterService'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const fastApiResponse = await proxyToFastApi(request, '/api/v1/action-center')
  if (fastApiResponse) return fastApiResponse

  const context = await buildActionCenterContext(request)
  if (context instanceof NextResponse) return context

  const query = parseActionCenterQuery(request.nextUrl.searchParams)
  const result = await listActionCenterItems(context, query)
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
