import { NextRequest } from 'next/server'
import { proxyToFastApiNotifications } from '../_proxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return proxyToFastApiNotifications(request, '/api/v1/notifications/read-all', {
    method: 'POST',
    bodyText: await request.text(),
  })
}

