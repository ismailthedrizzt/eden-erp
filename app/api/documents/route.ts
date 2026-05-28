import { NextRequest } from 'next/server'
import { proxyToFastApiDocuments } from './_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiDocuments(request, '/api/v1/documents')
}

export async function POST(request: NextRequest) {
  return proxyToFastApiDocuments(request, '/api/v1/documents')
}

