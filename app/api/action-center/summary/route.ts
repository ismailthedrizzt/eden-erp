import { NextRequest, NextResponse } from 'next/server'
import { buildActionCenterContext } from '@/lib/action-center/actionCenterResolver'
import { getActionCenterSummary } from '@/lib/action-center/actionCenterService'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const context = await buildActionCenterContext(request)
  if (context instanceof NextResponse) return context

  const summary = await getActionCenterSummary(context)
  return NextResponse.json({ data: summary }, { headers: { 'Cache-Control': 'no-store' } })
}
