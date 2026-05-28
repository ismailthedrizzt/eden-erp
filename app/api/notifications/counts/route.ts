import { NextRequest } from 'next/server'
import { proxyToFastApiNotifications } from '../_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiNotifications(request, '/api/v1/notifications/counts')
}

