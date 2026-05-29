// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/crm/{path}

import { NextRequest } from 'next/server'
import { proxyToFastApiCrm } from '../_proxy'

export const runtime = 'nodejs'

function targetPath(params: { path?: string[] }) {
  return `/api/v1/crm/${(params.path || []).join('/')}`
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return proxyToFastApiCrm(request, targetPath(await params))
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return proxyToFastApiCrm(request, targetPath(await params))
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  return proxyToFastApiCrm(request, targetPath(await params))
}
