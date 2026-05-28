import { NextRequest } from 'next/server'
import { proxyToFastApiImportExport } from '../../../_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyToFastApiImportExport(request, `/api/v1/bulk/actions/${id}/confirm`, { timeoutMs: 45000 })
}
