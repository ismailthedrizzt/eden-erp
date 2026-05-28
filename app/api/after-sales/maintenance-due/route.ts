// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/after-sales/maintenance-due
// NOTES: Maintenance due route is proxy-only.

import { NextRequest } from 'next/server'
import { proxyToFastApiAfterSales } from '../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiAfterSales(request, '/api/v1/after-sales/maintenance-due')
}
