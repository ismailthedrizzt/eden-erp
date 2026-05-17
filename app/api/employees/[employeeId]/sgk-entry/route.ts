import { NextRequest, NextResponse } from 'next/server'
import { isCompanySgk } from '@/lib/modules/employees/workLifecycle'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  if (body.sgk_responsibility && !isCompanySgk(body.sgk_responsibility)) {
    return NextResponse.json({ error: 'SGK girişi sadece SGK sorumlusu Şirket ise çalışır.' }, { status: 400 })
  }
  return NextResponse.json({ data: { status: 'pending_integration', message: 'SGK entegrasyonu devam ediyor. Bu özellik tamamlandığında aktif olacaktır.' } })
}
