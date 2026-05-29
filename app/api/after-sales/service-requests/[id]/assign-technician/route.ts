// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/after-sales/service-requests/{id}/assign-technician

import { NextRequest } from 'next/server'
import { proxyToFastApiAfterSales } from '../../../_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyToFastApiAfterSales(request, `/api/v1/after-sales/service-requests/${id}/assign-technician`)
}
