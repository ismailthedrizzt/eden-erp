// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/documents/requirements/{module_key}/{operation_key}
import { NextRequest } from 'next/server'
import { proxyToFastApiDocuments } from '../../../_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ module_key: string; operation_key: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const { module_key, operation_key } = await context.params
  return proxyToFastApiDocuments(
    request,
    `/api/v1/documents/requirements/${module_key}/${operation_key}`
  )
}

