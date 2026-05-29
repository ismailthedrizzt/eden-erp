// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/hr/leave-requests

import { NextRequest } from 'next/server'
import { proxyToFastApiHr } from '../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiHr(request, '/api/v1/hr/leave-requests')
}

export async function POST(request: NextRequest) {
  return proxyToFastApiHr(request, '/api/v1/hr/leave-requests')
}
