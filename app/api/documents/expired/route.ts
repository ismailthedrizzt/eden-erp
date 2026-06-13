// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/documents/expired
import { NextRequest } from 'next/server'
import { proxyToFastApiDocuments } from '../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiDocuments(request, '/api/v1/documents/expired')
}

