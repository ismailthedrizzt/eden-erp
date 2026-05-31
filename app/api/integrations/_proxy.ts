import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export function integrationsBackendUnavailableResponse(status = 503) {
  return NextResponse.json(
    {
      error: 'Integration Hub backend servisi yapilandirilmamis.',
      code: 'INTEGRATIONS_BACKEND_NOT_CONFIGURED',
      message: 'Integration Hub backend servisi yapilandirilmamis.',
    },
    { status }
  )
}

export async function proxyToFastApiIntegrations(request: NextRequest, targetPath: string) {
  const response = await proxyToFastApi(request, targetPath)
  return response || integrationsBackendUnavailableResponse()
}

