import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveActionGuide } from '@/lib/action-guide/intentMatcher'
import { getAuthenticatedWorkspaceContext } from '@/lib/user-state/server'

export const runtime = 'nodejs'

const ActionGuideRequestSchema = z.object({
  query: z.string().trim().min(1).max(500),
  currentPage: z.string().optional().nullable(),
  selectedRecordType: z.string().optional().nullable(),
  selectedRecordId: z.string().optional().nullable(),
  selectedRecordStatus: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
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
    currentPage: parsed.data.currentPage ?? (parsed.data.context as any).currentPage,
    selectedRecordType: parsed.data.selectedRecordType ?? (parsed.data.context as any).selectedRecordType,
    selectedRecordId: parsed.data.selectedRecordId ?? (parsed.data.context as any).selectedRecordId,
    selectedRecordStatus: parsed.data.selectedRecordStatus ?? (parsed.data.context as any).selectedRecordStatus,
    companyId: parsed.data.companyId ?? (parsed.data.context as any).companyId,
    branchId: parsed.data.branchId ?? (parsed.data.context as any).branchId,
    tenantId: context.workspaceId,
  })

  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
