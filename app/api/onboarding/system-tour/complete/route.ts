// BACKEND_MIGRATION_STATUS: keep_ui_adapter
// CANONICAL_BACKEND: Next.js BFF/UI adapter
// TARGET_FASTAPI_ENDPOINT: none
// UI-state adapter only; writes user onboarding preferences/system events, not ERP domain or lifecycle state.
import { NextRequest } from 'next/server'
import { handleSystemTourAction } from '../_shared'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  return handleSystemTourAction(request, 'complete')
}
