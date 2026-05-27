// BACKEND_MIGRATION_STATUS: keep_bff_proxy_with_legacy_fallback
// TARGET_BACKEND_MODULE: policy
// TARGET_FASTAPI_ENDPOINT: /api/v1/policy/evaluate
// NOTES: Policy decisions are canonical in FastAPI; this route is BFF/proxy only.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const response = await proxyToFastApi(request, '/api/v1/policy/evaluate')
  if (response) return response

  return NextResponse.json(
    {
      error: 'Yetki kontrol servisi henuz yapilandirilmamis.',
      code: 'FASTAPI_REQUIRED',
      message: 'Yetki kontrol servisi henuz yapilandirilmamis.',
    },
    { status: 501 }
  )
}
