// BACKEND_MIGRATION_STATUS: proxy_to_fastapi_with_legacy_fallback
// TARGET_BACKEND_MODULE: action-center
// TARGET_FASTAPI_ENDPOINT: /api/v1/action-center/by-record
// NOTES: Record pending work query belongs in Python; TS remains fallback only.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { buildActionCenterContext } from '@/lib/action-center/actionCenterResolver'
import { listRecordActionItems } from '@/lib/action-center/actionCenterService'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const fastApiResponse = await proxyToFastApi(request, '/api/v1/action-center/by-record')
  if (fastApiResponse) return fastApiResponse

  const context = await buildActionCenterContext(request)
  if (context instanceof NextResponse) return context

  const entityType = request.nextUrl.searchParams.get('entity_type')
  const entityId = request.nextUrl.searchParams.get('entity_id')
  if (!entityType || !entityId) {
    return NextResponse.json({
      error: 'Kayit bilgisi eksik.',
      code: 'ACTION_CENTER_RECORD_REQUIRED',
    }, { status: 400 })
  }

  const result = await listRecordActionItems(context, entityType, entityId)
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
