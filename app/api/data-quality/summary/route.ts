import { NextRequest } from 'next/server'
import { proxyToFastApiDataQuality } from '../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiDataQuality(request, '/api/v1/data-quality/summary')
}

