// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/modules/{module_key}/activation
// NOTES: Module activation uses FastAPI policy and settings.modulesManage guard.

import { NextRequest } from 'next/server'
import { fastApiUnavailableResponse, proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ module_key: string }> }
) {
  const { module_key: moduleKey } = await params
  const response = await proxyToFastApi(request, `/api/v1/modules/${moduleKey}/activation`)
  return response || fastApiUnavailableResponse()
}
