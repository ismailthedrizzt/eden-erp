// BACKEND_MIGRATION_STATUS: guarded_proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/ai/cv-extract
// NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI.

import { NextRequest, NextResponse } from 'next/server'
import { fastApiUnavailableResponse, proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { enforceRateLimit } from '@/lib/security/rateLimit'
import { requirePermissionForProxy } from '@/lib/security/permissionProxy'

export const runtime = 'nodejs'

const MAX_CV_BYTES = 8 * 1024 * 1024

function requestSubject(request: NextRequest) {
  return request.headers.get('authorization')
    || request.headers.get('x-user-id')
    || request.headers.get('x-forwarded-for')
    || 'anonymous'
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_CV_BYTES) {
    return NextResponse.json(
      { error: 'CV file is too large.', code: 'CV_FILE_TOO_LARGE', maxBytes: MAX_CV_BYTES },
      { status: 413, headers: { 'cache-control': 'no-store, max-age=0' } }
    )
  }

  const rateLimited = enforceRateLimit(request, 'ai-cv-extract', requestSubject(request), {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  })
  if (rateLimited) return rateLimited

  const permissionDenied = await requirePermissionForProxy(request, 'hr.manage')
  if (permissionDenied instanceof NextResponse) return permissionDenied

  const response = await proxyToFastApi(request, '/api/v1/ai/cv-extract', { internal: true })
  return response || fastApiUnavailableResponse()
}
