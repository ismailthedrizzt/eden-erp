import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  if (body.sgk_responsibility && body.sgk_responsibility !== 'sgk_company') {
    return NextResponse.json({ error: 'SGK girişi sadece SGK Bildirim Sorumlusu Şirket Yapacak ise çalışır.' }, { status: 400 })
  }
  return NextResponse.json({ data: { status: 'pending_integration', message: 'SGK giriş entegrasyonu onay sonrası bağlanacak.' } })
}
