// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/crm/master/persons/search
// NOTES: Master person lookup is proxy-only.

import { NextRequest } from 'next/server'
import { proxyToFastApiCrm } from '../../../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiCrm(request, '/api/v1/crm/master/persons/search')
}
