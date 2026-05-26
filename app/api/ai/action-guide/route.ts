import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveActionGuide } from '@/lib/ai/actionGuide'
import { getAuthenticatedWorkspaceContext } from '@/lib/user-state/server'

export const runtime = 'nodejs'

const ActionGuideRequestSchema = z.object({
  query: z.string().trim().min(1).max(500),
  context: z.record(z.string(), z.unknown()).optional().default({}),
})

export async function POST(request: NextRequest) {
  const context = await getAuthenticatedWorkspaceContext(request)
  if (context instanceof NextResponse) return context

  const parsed = ActionGuideRequestSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({
      error: 'Ne yapmak istediğinizi kısaca yazın.',
      code: 'ACTION_GUIDE_QUERY_REQUIRED',
      details: parsed.error.flatten(),
    }, { status: 400 })
  }

  const result = resolveActionGuide(parsed.data.query, {
    ...(parsed.data.context as any),
    tenantId: context.workspaceId,
  })

  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
