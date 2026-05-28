import { NextRequest } from 'next/server'
import { proxyToFastApiDocuments } from '../../_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyToFastApiDocuments(request, `/api/v1/documents/${id}/verify`)
}

