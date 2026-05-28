// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// NOTES: First-run onboarding state is tenant/user canonical backend state.

import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export async function proxyToFastApiOnboarding(
  request: NextRequest,
  targetPath: string,
  init?: { method?: string; timeoutMs?: number; bodyText?: string }
) {
  const response = await proxyToFastApi(request, targetPath, init)
  return response || onboardingBackendUnavailable()
}

export function onboardingBackendUnavailable(status = 503) {
  return NextResponse.json(
    {
      error: 'Ilk kurulum servisi su anda yapilandirilmamis.',
      code: 'ONBOARDING_BACKEND_NOT_CONFIGURED',
      message: 'Ilk kurulum servisi su anda yapilandirilmamis.',
    },
    { status }
  )
}
