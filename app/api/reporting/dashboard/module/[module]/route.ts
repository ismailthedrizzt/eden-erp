// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/reporting/dashboard/module/{module_key}
// NOTES: Module dashboard route is proxy-only.

import { NextRequest } from 'next/server'
import { proxyToFastApiReporting } from '../../../_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ module: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const { module } = await context.params
  return proxyToFastApiReporting(request, `/api/v1/reporting/dashboard/module/${module}`)
}
