import { NextRequest } from 'next/server'
import { proxyToFastApiSearch } from '../_proxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return proxyToFastApiSearch(request, '/api/v1/search/query', { timeoutMs: 20000 })
}
