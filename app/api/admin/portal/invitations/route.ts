// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/admin/portal/invitations

import { NextRequest } from 'next/server'
import { proxyToFastApiAdminPortal } from '../_proxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return proxyToFastApiAdminPortal(request, '/api/v1/admin/portal/invitations')
}

