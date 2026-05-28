// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// NOTES: Global search and command palette have no legacy fallback.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export async function proxyToFastApiSearch(
  request: NextRequest,
  targetPath: string,
  init?: { method?: string; timeoutMs?: number; bodyText?: string }
) {
  const response = await proxyToFastApi(request, targetPath, init)
  return response || searchBackendUnavailable()
}

export function searchBackendUnavailable(status = 503) {
  return NextResponse.json(
    {
      error: 'Arama backend servisi yapilandirilmamis.',
      code: 'SEARCH_BACKEND_NOT_CONFIGURED',
      message: 'Arama backend servisi yapilandirilmamis.',
    },
    { status }
  )
}
