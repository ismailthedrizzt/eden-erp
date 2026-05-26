import { NextRequest, NextResponse } from 'next/server'
import { buildActionCenterContext, parseActionCenterQuery } from '@/lib/action-center/actionCenterResolver'
import { listActionCenterItems } from '@/lib/action-center/actionCenterService'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const context = await buildActionCenterContext(request)
  if (context instanceof NextResponse) return context

  const query = parseActionCenterQuery(request.nextUrl.searchParams)
  const result = await listActionCenterItems(context, query)
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
