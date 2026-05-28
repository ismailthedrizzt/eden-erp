// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/products
// NOTES: Product catalog list/create route is proxy-only; no legacy fallback.

import { NextRequest } from 'next/server'
import { proxyToFastApiProducts } from './_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiProducts(request, '/api/v1/products')
}

export async function POST(request: NextRequest) {
  return proxyToFastApiProducts(request, '/api/v1/products')
}
