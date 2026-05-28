import { NextRequest } from 'next/server'
import { proxyToFastApiNotifications } from '../notifications/_proxy'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  return proxyToFastApiNotifications(request, `/api/v1/reminders${request.nextUrl.search}`)
}

export async function POST(request: NextRequest) {
  return proxyToFastApiNotifications(request, '/api/v1/reminders', {
    method: 'POST',
    bodyText: await request.text(),
  })
}

