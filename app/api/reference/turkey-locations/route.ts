// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/search/turkey-locations
// NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const response = await proxyToFastApi(request, '/api/v1/search/turkey-locations')
  if (response && response.ok) return response

  const scope = request.nextUrl.searchParams.get('scope')
  return NextResponse.json(
    scope === 'provinces' ? { provinces: [] } : { districts: [] },
    { status: 200, headers: { 'cache-control': 'no-store, max-age=0' } }
  )
}
