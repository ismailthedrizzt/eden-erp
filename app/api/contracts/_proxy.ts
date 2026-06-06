import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export function contractBackendUnavailableResponse(status = 503) {
  return NextResponse.json(
    {
      error: 'S?zle?me backend servisi yap?land?r?lmam??.',
      code: 'CONTRACT_BACKEND_NOT_CONFIGURED',
      message: 'S?zle?me backend servisi yap?land?r?lmam??.',
    },
    { status }
  )
}

export async function proxyToFastApiContracts(request: NextRequest, targetPath: string) {
  const response = await proxyToFastApi(request, targetPath)
  return response || contractBackendUnavailableResponse()
}
