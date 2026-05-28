// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// NOTES: Data import/export has no legacy fallback.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export async function proxyToFastApiImportExport(request: NextRequest, targetPath: string, init?: { method?: string; timeoutMs?: number; bodyText?: string }) {
  const response = await proxyToFastApi(request, targetPath, init)
  return response || importExportBackendUnavailable()
}

export function importExportBackendUnavailable(status = 503) {
  return NextResponse.json(
    {
      error: 'Veri aktarim servisi su anda yapilandirilmamis.',
      code: 'IMPORT_EXPORT_BACKEND_NOT_CONFIGURED',
      message: 'Veri aktarim servisi su anda yapilandirilmamis.',
    },
    { status }
  )
}
