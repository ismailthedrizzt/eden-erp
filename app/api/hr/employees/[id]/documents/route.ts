// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/hr/employees/{id}/documents

import { NextRequest } from 'next/server'
import { proxyToFastApiHr } from '../../../_proxy'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return proxyToFastApiHr(request, `/api/v1/hr/employees/${id}/documents`)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return proxyToFastApiHr(request, `/api/v1/hr/employees/${id}/documents`)
}
