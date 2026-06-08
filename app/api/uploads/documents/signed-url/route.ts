// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/documents/uploads/signed-url
// NOTES: Thin Next.js proxy only. DB and local document storage access belong to FastAPI.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const response = await proxyToFastApi(request, '/api/v1/documents/uploads/signed-url', { internal: true })
  if (response && response.ok) return response

  return NextResponse.json(
    { signedUrl: '' },
    { status: 200, headers: { 'cache-control': 'no-store, max-age=0' } }
  )
}
