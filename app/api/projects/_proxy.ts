import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export function projectBackendUnavailableResponse(status = 503) {
  return NextResponse.json(
    {
      error: 'Proje/Gorev backend servisi yapilandirilmamis.',
      code: 'PROJECT_BACKEND_NOT_CONFIGURED',
      message: 'Proje/Gorev backend servisi yapilandirilmamis.',
    },
    { status }
  )
}

export async function proxyToFastApiProjects(request: NextRequest, targetPath: string) {
  const response = await proxyToFastApi(request, targetPath)
  return response || projectBackendUnavailableResponse()
}
