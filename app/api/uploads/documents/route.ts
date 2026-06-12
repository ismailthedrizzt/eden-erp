// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/documents/upload
// NOTES: Thin multipart proxy only. Document validation, tenant scope and storage path generation belong to FastAPI.

import { NextRequest } from 'next/server'
import { proxyDocumentUpload } from '@/app/api/documents/_upload'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return proxyDocumentUpload(request, '/api/v1/documents/upload')
}
