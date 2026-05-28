import { NextRequest } from 'next/server'
import { proxyToFastApiNotifications } from '../../../../../notifications/_proxy'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  return proxyToFastApiNotifications(request, `/api/v1/system/email/messages/${id}/retry`, {
    method: 'POST',
    bodyText: await request.text(),
  })
}

