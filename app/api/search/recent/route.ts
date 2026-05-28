import { NextRequest } from 'next/server'
import { proxyToFastApiSearch } from '../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiSearch(request, '/api/v1/search/recent')
}

export async function POST(request: NextRequest) {
  return proxyToFastApiSearch(request, '/api/v1/search/recent', { method: 'POST' })
}
