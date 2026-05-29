// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/portal/documents/upload

import { NextRequest } from 'next/server'
import { proxyToFastApiPortal } from '../../_proxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return proxyToFastApiPortal(request, '/api/v1/portal/documents/upload')
}

