// BACKEND_MIGRATION_STATUS: proxy_to_fastapi_with_legacy_fallback
// TARGET_BACKEND_MODULE: integrity
// TARGET_FASTAPI_ENDPOINT: /api/v1/integrity/check
// NOTES: Integrity checks are canonical in FastAPI; this route is BFF/proxy only.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const response = await proxyToFastApi(request, '/api/v1/integrity/check')
  if (response) return response

  return NextResponse.json(
    {
      error: 'Veri tutarliligi kontrol servisi henuz yapilandirilmamis.',
      code: 'FASTAPI_REQUIRED',
      message: 'Veri tutarliligi kontrol servisi henuz yapilandirilmamis.',
    },
    { status: 501 }
  )
}
