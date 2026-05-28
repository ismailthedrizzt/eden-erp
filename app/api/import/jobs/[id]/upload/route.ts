import { NextRequest, NextResponse } from 'next/server'
import { proxyJsonToFastApi } from '@/lib/backend/fastApiProxy'
import { importExportBackendUnavailable, proxyToFastApiImportExport } from '../../../_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return proxyToFastApiImportExport(request, `/api/v1/import/jobs/${id}/upload`, { timeoutMs: 30000 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Dosya bulunamadi.', code: 'IMPORT_FILE_REQUIRED', message: 'Dosya bulunamadi.' },
      { status: 400 }
    )
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  const sourceFileName = String(formData.get('source_file_name') || file.name)
  const explicitType = String(formData.get('file_type') || '').toLowerCase()
  const payload = {
    source_file_name: sourceFileName,
    file_type: explicitType === 'csv' || explicitType === 'xlsx' ? explicitType : undefined,
    content_base64: buffer.toString('base64'),
  }
  const response = await proxyJsonToFastApi(request, `/api/v1/import/jobs/${id}/upload`, payload, { timeoutMs: 30000 })
  return response || importExportBackendUnavailable()
}
