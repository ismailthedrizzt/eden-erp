import { NextRequest } from 'next/server'
import { proxyToFastApiSecurity } from '../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiSecurity(request, '/api/v1/security/roles')
}

export async function POST(request: NextRequest) {
  return proxyToFastApiSecurity(request, '/api/v1/security/roles')
}
