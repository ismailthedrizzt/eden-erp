import { NextRequest } from 'next/server'
import { proxyDocumentUpload } from '../../_upload'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyDocumentUpload(request, `/api/v1/documents/${id}/new-version`)
}

