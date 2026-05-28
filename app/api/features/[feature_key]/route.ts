// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/features/{feature_key}
// NOTES: Feature flag updates use FastAPI settings.modulesManage guard.

import { NextRequest } from 'next/server'
import { fastApiUnavailableResponse, proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ feature_key: string }> }
) {
  const { feature_key: featureKey } = await params
  const response = await proxyToFastApi(request, `/api/v1/features/${featureKey}`)
  return response || fastApiUnavailableResponse()
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ feature_key: string }> }
) {
  const { feature_key: featureKey } = await params
  const response = await proxyToFastApi(request, `/api/v1/features/${featureKey}`)
  return response || fastApiUnavailableResponse()
}
