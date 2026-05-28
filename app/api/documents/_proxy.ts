// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// NOTES: Documents has no legacy fallback; storage and document policy live in FastAPI.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export async function proxyToFastApiDocuments(
  request: NextRequest,
  targetPath: string,
  init?: { method?: string; timeoutMs?: number; bodyText?: string }
) {
  const response = await proxyToFastApi(request, targetPath, init)
  return response || documentsBackendUnavailable()
}

export function documentsBackendUnavailable(status = 503) {
  return NextResponse.json(
    {
      error: 'Belge servisi su anda yapilandirilmamis.',
      code: 'DOCUMENTS_BACKEND_NOT_CONFIGURED',
      message: 'Belge servisi su anda yapilandirilmamis.',
    },
    { status }
  )
}

