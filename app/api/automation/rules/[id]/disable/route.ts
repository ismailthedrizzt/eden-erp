// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/automation/rules/{rule_id}/disable
// NOTES: Automation rule disable route is proxy-only.

import { NextRequest } from 'next/server'
import { proxyToFastApiAutomation } from '../../../_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyToFastApiAutomation(request, `/api/v1/automation/rules/${id}/disable`)
}

