import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export function adminPortalBackendUnavailableResponse(status = 503) {
  return NextResponse.json(
    {
      error: 'Portal yonetim backend servisi yapilandirilmamis.',
      code: 'PORTAL_ADMIN_BACKEND_NOT_CONFIGURED',
      message: 'Portal yonetim backend servisi yapilandirilmamis.',
    },
    { status }
  )
}

export async function proxyToFastApiAdminPortal(request: NextRequest, targetPath: string) {
  const response = await proxyToFastApi(request, targetPath)
  return response || adminPortalBackendUnavailableResponse()
}

