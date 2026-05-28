// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/crm/stakeholders/{stakeholder_id}
// NOTES: CRM stakeholder detail/update/archive route is proxy-only.

import { NextRequest } from 'next/server'
import { proxyToFastApiCrm } from '../../_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyToFastApiCrm(request, `/api/v1/crm/stakeholders/${id}`)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyToFastApiCrm(request, `/api/v1/crm/stakeholders/${id}`)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyToFastApiCrm(request, `/api/v1/crm/stakeholders/${id}`)
}
