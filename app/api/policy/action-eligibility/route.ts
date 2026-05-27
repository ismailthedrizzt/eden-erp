// BACKEND_MIGRATION_STATUS: keep_bff_proxy_with_legacy_fallback
// TARGET_BACKEND_MODULE: policy
// TARGET_FASTAPI_ENDPOINT: /api/v1/policy/action-eligibility
// NOTES: Action eligibility is canonical in FastAPI; this route is BFF/proxy only.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const response = await proxyToFastApi(request, '/api/v1/policy/action-eligibility')
  if (response) return response

  return NextResponse.json(
    {
      error: 'Islem uygunluk servisi henuz yapilandirilmamis.',
      code: 'FASTAPI_REQUIRED',
      message: 'Islem uygunluk servisi henuz yapilandirilmamis.',
    },
    { status: 501 }
  )
}
