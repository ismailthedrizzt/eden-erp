// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/tasks/my-project-tasks
// NOTES: User project tasks are separate from process engine task routes.

import { NextRequest } from 'next/server'
import { proxyToFastApiProjects } from '../../project-tasks/_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiProjects(request, '/api/v1/tasks/my-project-tasks')
}
