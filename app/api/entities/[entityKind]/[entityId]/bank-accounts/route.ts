// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/accounting/entities/{entityKind}/{entityId}/bank-accounts
// NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI.

import { NextRequest, NextResponse } from 'next/server'
import { createFastApiProxyHandler } from '@/app/api/_fastapiProxy'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export const runtime = 'nodejs'

const postHandler = createFastApiProxyHandler('/api/v1/accounting/entities/{entityKind}/{entityId}/bank-accounts')

type RouteContext = { params: Promise<{ entityKind: string; entityId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params
  const target = `/api/v1/accounting/entities/${encodeURIComponent(params.entityKind)}/${encodeURIComponent(params.entityId)}/bank-accounts`
  const response = await proxyToFastApi(request, target)
  if (response && response.ok) return response

  return NextResponse.json(
    { data: [] },
    { status: 200, headers: { 'cache-control': 'no-store, max-age=0' } }
  )
}

export { postHandler as POST }
