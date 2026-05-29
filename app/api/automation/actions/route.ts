// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/automation/actions
// NOTES: Automation actions registry route is proxy-only.

import { NextRequest } from 'next/server'
import { proxyToFastApiAutomation } from '../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiAutomation(request, '/api/v1/automation/actions')
}

