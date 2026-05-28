import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export function productsBackendUnavailableResponse(status = 503) {
  return NextResponse.json(
    {
      error: 'Urun/Hizmet backend servisi yapilandirilmamis.',
      code: 'PRODUCTS_BACKEND_NOT_CONFIGURED',
      message: 'Urun/Hizmet backend servisi yapilandirilmamis.',
    },
    { status }
  )
}

export async function proxyToFastApiProducts(request: NextRequest, targetPath: string) {
  const response = await proxyToFastApi(request, targetPath)
  return response || productsBackendUnavailableResponse()
}
