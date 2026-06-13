// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/notifications/{id}
import { NextRequest } from 'next/server'
import { proxyToFastApiNotifications } from '../_proxy'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params
  return proxyToFastApiNotifications(request, `/api/v1/notifications/${id}`)
}

