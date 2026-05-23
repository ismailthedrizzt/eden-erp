import { NextRequest, NextResponse } from 'next/server'
import { backfillMissingDocumentThumbnails } from '@/lib/documents/documentThumbnailBackfill.server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = Number(request.nextUrl.searchParams.get('limit') || 25)
  const stats = await backfillMissingDocumentThumbnails({ limit })

  return NextResponse.json({ ok: true, ...stats })
}
