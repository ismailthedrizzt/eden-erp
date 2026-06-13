// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/notifications/preferences
import { NextRequest } from 'next/server'
import { proxyToFastApiNotifications } from '../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiNotifications(request, '/api/v1/notifications/preferences')
}

export async function PATCH(request: NextRequest) {
  return proxyToFastApiNotifications(request, '/api/v1/notifications/preferences', {
    method: 'PATCH',
    bodyText: await request.text(),
  })
}

