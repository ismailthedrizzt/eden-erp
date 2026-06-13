// BACKEND_MIGRATION_STATUS: keep_upload_adapter
// CANONICAL_BACKEND: Next.js BFF/upload adapter
// TARGET_FASTAPI_ENDPOINT: none
// Upload/media adapter route; handles multipart, media, thumbnail, or response normalization at the BFF edge.
import { NextRequest } from 'next/server'
import { proxyDocumentUpload } from '../../../../_upload'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ entity_type: string; entity_id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { entity_type, entity_id } = await context.params
  return proxyDocumentUpload(request, `/api/v1/documents/by-entity/${entity_type}/${entity_id}/upload`)
}

