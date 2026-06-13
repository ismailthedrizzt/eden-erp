// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/data-quality/rules/{rule_key}
import { NextRequest } from 'next/server'
import { proxyToFastApiDataQuality } from '../../_proxy'

export const runtime = 'nodejs'

type Params = { params: Promise<{ rule_key: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { rule_key } = await params
  return proxyToFastApiDataQuality(request, `/api/v1/data-quality/rules/${encodeURIComponent(rule_key)}`)
}

