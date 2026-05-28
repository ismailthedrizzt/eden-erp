import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export function reportingBackendUnavailableResponse(status = 503) {
  return NextResponse.json(
    {
      error: 'Raporlama backend servisi yapilandirilmamis.',
      code: 'REPORTING_BACKEND_NOT_CONFIGURED',
      message: 'Raporlama backend servisi yapilandirilmamis.',
    },
    { status }
  )
}

export async function proxyToFastApiReporting(request: NextRequest, targetPath: string) {
  const response = await proxyToFastApi(request, targetPath)
  return response || reportingBackendUnavailableResponse()
}
