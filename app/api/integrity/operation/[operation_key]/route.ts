// BACKEND_MIGRATION_STATUS: proxy_to_fastapi_with_legacy_fallback
// TARGET_BACKEND_MODULE: integrity
// TARGET_FASTAPI_ENDPOINT: /api/v1/integrity/operation/{operation_key}
// NOTES: Operation integrity checks are canonical in FastAPI; this route is BFF/proxy only.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ operation_key: string }> }
) {
  const { operation_key: operationKey } = await params
  const response = await proxyToFastApi(request, `/api/v1/integrity/operation/${operationKey}`)
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
