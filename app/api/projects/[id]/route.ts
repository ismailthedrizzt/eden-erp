// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/projects/{id}
// NOTES: Project Management project detail route is proxy-only; no legacy fallback.

import { NextRequest } from 'next/server'
import { proxyToFastApiProjects } from '../_proxy'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return proxyToFastApiProjects(request, `/api/v1/projects/${id}`)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return proxyToFastApiProjects(request, `/api/v1/projects/${id}`)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return proxyToFastApiProjects(request, `/api/v1/projects/${id}`)
}
