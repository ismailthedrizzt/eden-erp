import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { NaceReferenceImportService } from '@/lib/modules/companies/nace/naceReference.service'

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'nace_reference.import')
  if (permission instanceof NextResponse) return permission

  const contentType = request.headers.get('content-type') || ''
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Dosya zorunludur' }, { status: 400 })

    const service = new NaceReferenceImportService(supabase as any)
    const result = await service.importBuffer(Buffer.from(await file.arrayBuffer()), file.name, {
      sourceName: String(formData.get('sourceName') || 'Admin tarafından yüklenen resmi dosya'),
      sourceUrl: String(formData.get('sourceUrl') || ''),
      sourceReference: String(formData.get('sourceReference') || ''),
      columnMap: {
        code: String(formData.get('codeColumn') || ''),
        description: String(formData.get('descriptionColumn') || ''),
        hazardClass: String(formData.get('hazardClassColumn') || ''),
      },
    })
    return NextResponse.json({ data: result })
  }

  const body = await request.json().catch(() => ({}))
  if (!body.csv) return NextResponse.json({ error: 'CSV metni veya multipart dosya zorunludur' }, { status: 400 })

  const service = new NaceReferenceImportService(supabase as any)
  const result = await service.importBuffer(Buffer.from(String(body.csv), 'utf8'), body.filename || 'nace.csv', {
    sourceName: body.sourceName || 'Admin tarafından yüklenen resmi dosya',
    sourceUrl: body.sourceUrl || null,
    sourceReference: body.sourceReference || null,
    columnMap: body.columnMap || {},
  })

  return NextResponse.json({ data: result })
}
