import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export function portalBackendUnavailableResponse(status = 503) {
  return NextResponse.json(
    {
      error: 'Musteri portali backend servisi yapilandirilmamis.',
      code: 'PORTAL_BACKEND_NOT_CONFIGURED',
      message: 'Musteri portali backend servisi yapilandirilmamis.',
    },
    { status }
  )
}

export async function proxyToFastApiPortal(request: NextRequest, targetPath: string) {
  const response = await proxyToFastApi(request, targetPath)
  return response || portalBackendUnavailableResponse()
}

