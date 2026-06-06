// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/contracts/{id}
// NOTES: Contract detail route is proxy-only; no legacy fallback.

import { NextRequest } from 'next/server'
import { proxyToFastApiContracts } from '../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToFastApiContracts(request, `/api/v1/contracts/${id}`)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToFastApiContracts(request, `/api/v1/contracts/${id}`)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToFastApiContracts(request, `/api/v1/contracts/${id}`)
}
