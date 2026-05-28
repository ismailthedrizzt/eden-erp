// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/after-sales/company/{company_id}/summary
// NOTES: After-sales company summary route is proxy-only.

import { NextRequest } from 'next/server'
import { proxyToFastApiAfterSales } from '../../../_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ companyId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const { companyId } = await context.params
  return proxyToFastApiAfterSales(request, `/api/v1/after-sales/company/${companyId}/summary`)
}
