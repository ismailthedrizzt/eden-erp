// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/data-quality/duplicates/{group_id}/dismiss
import { NextRequest } from 'next/server'
import { proxyToFastApiDataQuality } from '../../../_proxy'

export const runtime = 'nodejs'

type Params = { params: Promise<{ group_id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { group_id } = await params
  return proxyToFastApiDataQuality(
    request,
    `/api/v1/data-quality/duplicates/${encodeURIComponent(group_id)}/dismiss`
  )
}

