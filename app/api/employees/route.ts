// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/hr/employees
// NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI.

import { NextRequest, NextResponse } from 'next/server'
import { createFastApiProxyHandler } from '@/app/api/_fastapiProxy'
import { listMetaFromRows, parseListQuery } from '@/lib/api/listEndpoint'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

const handler = createFastApiProxyHandler('/api/v1/hr/employees')

export async function GET(request: NextRequest) {
  const query = parseListQuery(request.nextUrl.searchParams, { pageSize: 50, sort: 'first_name' })
  const canonicalQuery = new URLSearchParams()
  canonicalQuery.set('page', String(query.page))
  canonicalQuery.set('pageSize', String(query.pageSize))
  canonicalQuery.set('sort', query.sort || 'first_name')
  canonicalQuery.set('direction', query.direction || 'asc')
  if (query.search) canonicalQuery.set('search', query.search)
  if (query.includePassive) canonicalQuery.set('include_passive', 'true')
  if (query.statuses?.length) canonicalQuery.set('statuses', query.statuses.join(','))

  const response = await proxyToFastApi(request, '/api/v1/hr/employees', {
    internal: true,
    query: canonicalQuery,
  })
  return response || NextResponse.json(
    { data: [], meta: listMetaFromRows(query, 0), code: 'FASTAPI_BACKEND_NOT_CONFIGURED' },
    { status: 503, headers: { 'cache-control': 'no-store, max-age=0' } }
  )
}

export { handler as POST }
