// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// NOTES: Admin Console has no legacy fallback.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export async function proxyToFastApiAdmin(
  request: NextRequest,
  targetPath: string,
  init?: { method?: string; timeoutMs?: number; bodyText?: string }
) {
  const response = await proxyToFastApi(request, targetPath, init)
  return response || adminBackendUnavailable()
}

export function adminBackendUnavailable(status = 503) {
  return NextResponse.json(
    {
      error: 'Admin backend servisi yapilandirilmamis.',
      code: 'ADMIN_BACKEND_NOT_CONFIGURED',
      message: 'Admin backend servisi yapilandirilmamis.',
    },
    { status }
  )
}

