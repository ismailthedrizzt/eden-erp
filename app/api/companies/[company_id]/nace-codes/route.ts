// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/companies/{company_id}/nace-codes
// NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI.

import { NextRequest, NextResponse } from 'next/server'
import { createFastApiProxyHandler } from '@/app/api/_fastapiProxy'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

const postHandler = createFastApiProxyHandler('/api/v1/companies/{company_id}/nace-codes')

type RouteContext = { params: Promise<{ company_id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params
  const response = await proxyToFastApi(request, `/api/v1/companies/${encodeURIComponent(params.company_id)}/nace-codes`)
  if (response && response.ok) return response

  return NextResponse.json(
    { data: [], warning: 'Sirket NACE kodlari henuz hazir degil.' },
    { status: 200, headers: { 'cache-control': 'no-store, max-age=0' } }
  )
}

export { postHandler as POST }
