// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/admin/portal/users/{portal_user_id}

import { NextRequest } from 'next/server'
import { proxyToFastApiAdminPortal } from '../../_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return proxyToFastApiAdminPortal(request, `/api/v1/admin/portal/users/${id}`)
}

