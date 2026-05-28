import { NextRequest } from 'next/server'
import { proxyToFastApiNotifications } from '../../../notifications/_proxy'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return proxyToFastApiNotifications(request, '/api/v1/system/email/test', {
    method: 'POST',
    bodyText: await request.text(),
  })
}

