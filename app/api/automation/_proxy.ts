import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export function automationBackendUnavailableResponse(status = 503) {
  return NextResponse.json(
    {
      error: 'Otomasyon backend servisi yapilandirilmamis.',
      code: 'AUTOMATION_BACKEND_NOT_CONFIGURED',
      message: 'Otomasyon backend servisi yapilandirilmamis.',
    },
    { status }
  )
}

export async function proxyToFastApiAutomation(request: NextRequest, targetPath: string) {
  const response = await proxyToFastApi(request, targetPath)
  return response || automationBackendUnavailableResponse()
}

