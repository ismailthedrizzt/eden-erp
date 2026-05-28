// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/hr/employees/{id}/documents/{documentId}

import { NextRequest } from 'next/server'
import { proxyToFastApiHr } from '../../../../_proxy'

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { id, documentId } = await params
  return proxyToFastApiHr(request, `/api/v1/hr/employees/${id}/documents/${documentId}`)
}
