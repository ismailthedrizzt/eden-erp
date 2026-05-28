import { NextRequest } from 'next/server'
import { proxyToFastApiImportExport } from '../_proxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return proxyToFastApiImportExport(request, '/api/v1/import/jobs')
}
