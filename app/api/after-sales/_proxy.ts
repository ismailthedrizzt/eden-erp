import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export function afterSalesBackendUnavailableResponse(status = 503) {
  return NextResponse.json(
    {
      error: 'Satis sonrasi backend servisi yapilandirilmamis.',
      code: 'AFTER_SALES_BACKEND_NOT_CONFIGURED',
      message: 'Satis sonrasi backend servisi yapilandirilmamis.',
    },
    { status }
  )
}

export async function proxyToFastApiAfterSales(request: NextRequest, targetPath: string) {
  const response = await proxyToFastApi(request, targetPath)
  return response || afterSalesBackendUnavailableResponse()
}
