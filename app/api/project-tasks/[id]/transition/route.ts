// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/tasks/project-tasks/{id}/transition
// NOTES: Project task status transitions are policy-checked by FastAPI.

import { NextRequest } from 'next/server'
import { proxyToFastApiProjects } from '../../_proxy'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return proxyToFastApiProjects(request, `/api/v1/tasks/project-tasks/${id}/transition`)
}
