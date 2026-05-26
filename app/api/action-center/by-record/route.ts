import { NextRequest, NextResponse } from 'next/server'
import { buildActionCenterContext } from '@/lib/action-center/actionCenterResolver'
import { listRecordActionItems } from '@/lib/action-center/actionCenterService'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
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
