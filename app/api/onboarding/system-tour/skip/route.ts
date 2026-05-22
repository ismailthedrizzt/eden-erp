import { NextRequest } from 'next/server'
import { handleSystemTourAction } from '../_shared'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return handleSystemTourAction(request, 'skip')
}
