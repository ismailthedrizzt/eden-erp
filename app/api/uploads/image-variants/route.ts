// BACKEND_MIGRATION_STATUS: guarded_proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/uploads/image-variants
// NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI.

import { NextRequest, NextResponse } from 'next/server'
import { fastApiUnavailableResponse, proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { requirePermissionForProxy } from '@/lib/security/permissionProxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const permissionDenied = await requirePermissionForProxy(request, 'documents.manage')
  if (permissionDenied instanceof NextResponse) return permissionDenied

  const response = await proxyToFastApi(request, '/api/v1/uploads/image-variants', { internal: true })
  return response || fastApiUnavailableResponse()
}
