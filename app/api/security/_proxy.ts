import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export function securityBackendUnavailableResponse(status = 503) {
  return NextResponse.json(
    {
      error: 'Guvenlik/RBAC backend servisi yapilandirilmamis.',
      code: 'SECURITY_BACKEND_NOT_CONFIGURED',
      message: 'Guvenlik/RBAC backend servisi yapilandirilmamis.',
    },
    { status }
  )
}

export async function proxyToFastApiSecurity(request: NextRequest, targetPath: string) {
  const response = await proxyToFastApi(request, targetPath)
  return response || securityBackendUnavailableResponse()
}
