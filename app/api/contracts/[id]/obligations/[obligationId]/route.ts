// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/contracts/{id}/obligations/{obligationId}
// NOTES: Contract obligation detail route is proxy-only; no legacy fallback.

import { NextRequest } from 'next/server'
import { proxyToFastApiContracts } from '../../../_proxy'

export const runtime = 'nodejs'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; obligationId: string }> }) {
  const { id, obligationId } = await params
  return proxyToFastApiContracts(request, `/api/v1/contracts/${id}/obligations/${obligationId}`)
}
