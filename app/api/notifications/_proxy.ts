// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// NOTES: Notifications has no legacy fallback; delivery policy lives in FastAPI.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export async function proxyToFastApiNotifications(
  request: NextRequest,
  targetPath: string,
  init?: { method?: string; timeoutMs?: number; bodyText?: string }
) {
  const response = await proxyToFastApi(request, targetPath, init)
  return response || notificationsBackendUnavailable()
}

export function notificationsBackendUnavailable(status = 503) {
  return NextResponse.json(
    {
      error: 'Bildirim servisi su anda yapilandirilmamis.',
      code: 'NOTIFICATIONS_BACKEND_NOT_CONFIGURED',
      message: 'Bildirim servisi su anda yapilandirilmamis.',
    },
    { status }
  )
}

