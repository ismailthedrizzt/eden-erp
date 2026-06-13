// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/system/email/test
import { NextRequest } from 'next/server'
import { proxyToFastApiNotifications } from '../../../notifications/_proxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return proxyToFastApiNotifications(request, '/api/v1/system/email/test', {
    method: 'POST',
    bodyText: await request.text(),
  })
}

