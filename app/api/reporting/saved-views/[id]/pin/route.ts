// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/reporting/saved-views/{view_id}/pin
// NOTES: Reporting saved view pin route is proxy-only.

import { NextRequest } from 'next/server'
import { proxyToFastApiReporting } from '../../../_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyToFastApiReporting(request, `/api/v1/reporting/saved-views/${id}/pin`)
}

