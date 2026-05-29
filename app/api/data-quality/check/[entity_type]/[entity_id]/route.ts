import { NextRequest } from 'next/server'
import { proxyToFastApiDataQuality } from '../../../_proxy'

export const runtime = 'nodejs'

type Params = { params: Promise<{ entity_type: string; entity_id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { entity_type, entity_id } = await params
  return proxyToFastApiDataQuality(
    request,
    `/api/v1/data-quality/check/${encodeURIComponent(entity_type)}/${encodeURIComponent(entity_id)}`,
    { timeoutMs: 20000 }
  )
}
