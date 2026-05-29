// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// NOTES: Data Quality has no legacy fallback.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export async function proxyToFastApiDataQuality(
  request: NextRequest,
  targetPath: string,
  init?: { method?: string; timeoutMs?: number; bodyText?: string }
) {
  const response = await proxyToFastApi(request, targetPath, init)
  return response || dataQualityBackendUnavailable()
}

export function dataQualityBackendUnavailable(status = 503) {
  return NextResponse.json(
    {
      error: 'Veri kalitesi backend servisi yapilandirilmamis.',
      code: 'DATA_QUALITY_BACKEND_NOT_CONFIGURED',
      message: 'Veri kalitesi backend servisi yapilandirilmamis.',
    },
    { status }
  )
}

