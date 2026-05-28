import { NextRequest } from 'next/server'
import { proxyToFastApiSecurity } from '../../../_proxy'

export const runtime = 'nodejs'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToFastApiSecurity(request, `/api/v1/security/roles/${id}/permissions`)
}
