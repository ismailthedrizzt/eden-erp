// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/projects/summary
// NOTES: Project Management summary route is proxy-only; no legacy fallback.

import { NextRequest } from 'next/server'
import { proxyToFastApiProjects } from '../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiProjects(request, '/api/v1/projects/summary')
}
