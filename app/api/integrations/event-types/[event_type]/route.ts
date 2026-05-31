// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/integrations/event-types/{event_type}
// NOTES: Integration event type detail route is proxy-only.

import { NextRequest } from 'next/server'
import { proxyToFastApiIntegrations } from '../../_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ event_type: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const { event_type } = await context.params
  return proxyToFastApiIntegrations(request, `/api/v1/integrations/event-types/${event_type}`)
}

