import { NextRequest } from 'next/server'
import { proxyToFastApiOnboarding } from '../../_proxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return proxyToFastApiOnboarding(request, '/api/v1/onboarding/workspace/skip', { method: 'POST' })
}
