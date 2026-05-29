// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/ai/copilot/feedback
// NOTES: AI feedback route is proxy-only.

import { NextRequest } from 'next/server'
import { proxyToFastApiAiCopilot } from '../_proxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return proxyToFastApiAiCopilot(request, '/api/v1/ai/copilot/feedback')
}
