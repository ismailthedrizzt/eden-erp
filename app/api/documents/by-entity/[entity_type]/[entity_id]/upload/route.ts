import { NextRequest } from 'next/server'
import { proxyDocumentUpload } from '../../../../_upload'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ entity_type: string; entity_id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { entity_type, entity_id } = await context.params
  return proxyDocumentUpload(request, `/api/v1/documents/by-entity/${entity_type}/${entity_id}/upload`)
}

