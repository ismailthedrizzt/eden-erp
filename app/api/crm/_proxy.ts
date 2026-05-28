import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export function crmBackendUnavailableResponse(status = 503) {
  return NextResponse.json(
    {
      error: 'CRM backend servisi yapilandirilmamis.',
      code: 'CRM_BACKEND_NOT_CONFIGURED',
      message: 'CRM backend servisi yapilandirilmamis.',
    },
    { status }
  )
}

export async function proxyToFastApiCrm(request: NextRequest, targetPath: string) {
  const response = await proxyToFastApi(request, targetPath)
  return response || crmBackendUnavailableResponse()
}
