// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/reporting/reports/{report_key}/export
// NOTES: Reporting export preparation route is proxy-only.

import { NextRequest } from 'next/server'
import { proxyToFastApiReporting } from '../../../_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ report_key: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { report_key } = await context.params
  return proxyToFastApiReporting(request, `/api/v1/reporting/reports/${report_key}/export`)
}
