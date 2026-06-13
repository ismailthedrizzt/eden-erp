// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/documents/by-entity/{entity_type}/{entity_id}
import { NextRequest } from 'next/server'
import { proxyToFastApiDocuments } from '../../../_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ entity_type: string; entity_id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const { entity_type, entity_id } = await context.params
  return proxyToFastApiDocuments(request, `/api/v1/documents/by-entity/${entity_type}/${entity_id}`)
}

