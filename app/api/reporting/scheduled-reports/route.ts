// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/reporting/scheduled-reports
// NOTES: Reporting scheduled reports collection route is proxy-only.

import { NextRequest } from 'next/server'
import { proxyToFastApiReporting } from '../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiReporting(request, '/api/v1/reporting/scheduled-reports')
}

export async function POST(request: NextRequest) {
  return proxyToFastApiReporting(request, '/api/v1/reporting/scheduled-reports')
}

