import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ data: [], message: 'Hesap/kart geçmişi audit altyapısına bağlanmak üzere hazır.' })
}
