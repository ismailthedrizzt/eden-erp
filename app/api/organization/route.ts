// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/organization/units
// NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI.

import { NextRequest } from 'next/server'
import { createFastApiProxyHandler } from '@/app/api/_fastapiProxy'
import { parseListQuery } from '@/lib/api/listEndpoint'
import { fastApiUnavailableResponse, proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

const handler = createFastApiProxyHandler('/api/v1/organization/units')

function order(field: 'name') {
  return field
}

export async function GET(request: NextRequest) {
  const query = parseListQuery(request.nextUrl.searchParams, { pageSize: 100, sort: order('name') })
  const canonicalQuery = new URLSearchParams()
  canonicalQuery.set('page', String(query.page))
  canonicalQuery.set('pageSize', String(query.pageSize))
  canonicalQuery.set('sort', query.sort || 'name')
  canonicalQuery.set('direction', query.direction || 'asc')
  if (query.search) canonicalQuery.set('search', query.search)

  const response = await proxyToFastApi(request, '/api/v1/organization/units', {
    internal: true,
    query: canonicalQuery,
  })
  return response || fastApiUnavailableResponse()
}

export { handler as POST, handler as PATCH, handler as DELETE }
