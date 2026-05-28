// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/products/{product_id}
// NOTES: Product catalog detail/update/delete route is proxy-only.

import { NextRequest } from 'next/server'
import { proxyToFastApiProducts } from '../_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyToFastApiProducts(request, `/api/v1/products/${id}`)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyToFastApiProducts(request, `/api/v1/products/${id}`)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyToFastApiProducts(request, `/api/v1/products/${id}`)
}
