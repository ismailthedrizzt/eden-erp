import { NextRequest } from 'next/server'
import { proxyToFastApiSearch } from '../../../_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ entity_type: string; entity_id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const { entity_type, entity_id } = await context.params
  return proxyToFastApiSearch(
    request,
    `/api/v1/search/by-entity/${encodeURIComponent(entity_type)}/${encodeURIComponent(entity_id)}`
  )
}
