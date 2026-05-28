import { NextRequest } from 'next/server'
import { proxyToFastApiOnboarding } from '../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiOnboarding(request, '/api/v1/onboarding/user')
}

export async function PATCH(request: NextRequest) {
  return proxyToFastApiOnboarding(request, '/api/v1/onboarding/user', { method: 'PATCH' })
}
