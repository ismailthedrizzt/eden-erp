// BACKEND_MIGRATION_STATUS: keep_upload_adapter
// CANONICAL_BACKEND: Next.js BFF/upload adapter
// TARGET_FASTAPI_ENDPOINT: none
// Upload/media adapter route; handles multipart, media, thumbnail, or response normalization at the BFF edge.
import { NextRequest } from 'next/server'
import { proxyDocumentUpload } from '../_upload'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return proxyDocumentUpload(request, '/api/v1/documents/upload')
}

