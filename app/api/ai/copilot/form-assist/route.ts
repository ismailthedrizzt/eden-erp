// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/ai/copilot/form-assist
// NOTES: AI form assist returns suggestions only; submit remains normal domain validation.

import { NextRequest } from 'next/server'
import { proxyToFastApiAiCopilot } from '../_proxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return proxyToFastApiAiCopilot(request, '/api/v1/ai/copilot/form-assist')
}
