import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export function hrBackendUnavailableResponse(status = 503) {
  return NextResponse.json(
    {
      error: 'İK backend servisi yapılandırılmamış.',
      code: 'HR_BACKEND_NOT_CONFIGURED',
      message: 'İK backend servisi yapılandırılmamış.',
    },
    { status }
  )
}

export async function proxyToFastApiHr(request: NextRequest, targetPath: string) {
  const response = await proxyToFastApi(request, targetPath)
  return response || hrBackendUnavailableResponse()
}
