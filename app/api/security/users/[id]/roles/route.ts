import { NextRequest } from 'next/server'
import { proxyToFastApiSecurity } from '../../../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToFastApiSecurity(request, `/api/v1/security/users/${id}/roles`)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToFastApiSecurity(request, `/api/v1/security/users/${id}/roles`)
}
