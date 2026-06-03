// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/ownership/transactions
// NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const response = await proxyToFastApi(request, '/api/v1/ownership/transactions')
  if (response && response.ok) return response

  return NextResponse.json(
    { data: [], meta: { page: 1, pageSize: 0, total: 0, totalPages: 0 } },
    { status: 200, headers: { 'cache-control': 'no-store, max-age=0' } }
  )
}

export async function POST(request: NextRequest) {
  const response = await proxyToFastApi(request, '/api/v1/ownership/transactions')
  if (response) return response

  return NextResponse.json(
    { error: 'Backend servisi yapilandirilmamis veya ulasilamiyor.' },
    { status: 503 }
  )
}
