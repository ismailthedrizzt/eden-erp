import { NextRequest } from 'next/server'
import { proxyToFastApiDataQuality } from '../../_proxy'

export const runtime = 'nodejs'

type Params = { params: Promise<{ merge_id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { merge_id } = await params
  return proxyToFastApiDataQuality(request, `/api/v1/data-quality/merge/${encodeURIComponent(merge_id)}`)
}

