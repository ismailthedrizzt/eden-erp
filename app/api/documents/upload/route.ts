import { NextRequest } from 'next/server'
import { proxyDocumentUpload } from '../_upload'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return proxyDocumentUpload(request, '/api/v1/documents/upload')
}

