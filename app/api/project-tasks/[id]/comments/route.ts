// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/tasks/project-tasks/{id}/comments
// NOTES: Project task comments are stored by FastAPI Project Management domain.

import { NextRequest } from 'next/server'
import { proxyToFastApiProjects } from '../../_proxy'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return proxyToFastApiProjects(request, `/api/v1/tasks/project-tasks/${id}/comments`)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return proxyToFastApiProjects(request, `/api/v1/tasks/project-tasks/${id}/comments`)
}
