import { NextRequest } from 'next/server'
import { proxyToFastApiDocuments } from '../_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyToFastApiDocuments(request, `/api/v1/documents/${id}`)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyToFastApiDocuments(request, `/api/v1/documents/${id}`, { method: 'PATCH' })
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyToFastApiDocuments(request, `/api/v1/documents/${id}`, { method: 'DELETE' })
}

