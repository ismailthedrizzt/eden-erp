// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/data-quality/by-entity/{entity_type}/{entity_id}
import { NextRequest } from 'next/server'
import { proxyToFastApiDataQuality } from '../../../_proxy'

export const runtime = 'nodejs'

type Params = { params: Promise<{ entity_type: string; entity_id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { entity_type, entity_id } = await params
  return proxyToFastApiDataQuality(
    request,
    `/api/v1/data-quality/by-entity/${encodeURIComponent(entity_type)}/${encodeURIComponent(entity_id)}`
  )
}

