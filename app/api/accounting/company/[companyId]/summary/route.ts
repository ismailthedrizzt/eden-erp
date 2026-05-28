// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/accounting/company/{companyId}/summary
// NOTES: Company accounting summary is calculated by FastAPI Accounting domain.

import { NextRequest } from 'next/server'
import { fastApiUnavailableResponse, proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params
  const response = await proxyToFastApi(request, `/api/v1/accounting/company/${companyId}/summary`)
  return response || fastApiUnavailableResponse()
}
