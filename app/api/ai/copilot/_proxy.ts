import { NextRequest, NextResponse } from 'next/server'
import { proxyToFastApi } from '@/lib/backend/fastApiProxy'

export function aiCopilotBackendUnavailableResponse(status = 503) {
  return NextResponse.json(
    {
      error: 'AI Copilot backend servisi yapilandirilmamis.',
      code: 'AI_COPILOT_BACKEND_NOT_CONFIGURED',
      message: 'AI Copilot backend servisi yapilandirilmamis.',
    },
    { status }
  )
}

export async function proxyToFastApiAiCopilot(request: NextRequest, targetPath: string) {
  const response = await proxyToFastApi(request, targetPath, { timeoutMs: 20000 })
  return response || aiCopilotBackendUnavailableResponse()
}
