// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/documents/{document_id}/media-access-url
// NOTES: Thin BFF proxy for canonical media access URL response.

import { NextRequest } from 'next/server'
import { proxyToFastApiDocuments } from '@/app/api/documents/_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyToFastApiDocuments(request, `/api/v1/documents/${id}/media-access-url`)
}
