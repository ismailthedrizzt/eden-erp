import { NextRequest, NextResponse } from 'next/server'
import { buildActionCenterContext } from '@/lib/action-center/actionCenterResolver'
import { getActionCenterCounts } from '@/lib/action-center/actionCenterService'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const context = await buildActionCenterContext(request)
  if (context instanceof NextResponse) return context

  const counts = await getActionCenterCounts(context)
  return NextResponse.json({ data: counts }, { headers: { 'Cache-Control': 'no-store' } })
}
