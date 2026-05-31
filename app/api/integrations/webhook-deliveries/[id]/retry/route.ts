// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/integrations/webhook-deliveries/{delivery_id}/retry
// NOTES: Webhook delivery retry route is proxy-only.

import { NextRequest } from 'next/server'
import { proxyToFastApiIntegrations } from '../../../_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyToFastApiIntegrations(request, `/api/v1/integrations/webhook-deliveries/${id}/retry`)
}

