// BACKEND_MIGRATION_STATUS: keep_bff_proxy
// TARGET_BACKEND_MODULE: action-guide
// TARGET_FASTAPI_ENDPOINT: /api/v1/action-guide
// NOTES: UI-specific BFF may remain, but deterministic resolver can later move to Python.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { buildActionGuideContext } from '@/lib/action-guide/actionGuideContext'
import { resolveActionGuide } from '@/lib/action-guide/actionGuideResolver'
import { getAuthenticatedWorkspaceContext } from '@/lib/user-state/server'

export const runtime = 'nodejs'

const ActionGuideRequestSchema = z.object({
  query: z.string().trim().max(500).optional().default(''),
  currentPage: z.string().optional().nullable(),
  selectedRecordType: z.string().optional().nullable(),
  selectedRecordId: z.string().optional().nullable(),
  selectedRecordStatus: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  organizationUnitId: z.string().optional().nullable(),
  facilityId: z.string().optional().nullable(),
  context: z.record(z.string(), z.unknown()).optional().default({}),
})

export async function POST(request: NextRequest) {
  const workspace = await getAuthenticatedWorkspaceContext(request)
  if (workspace instanceof NextResponse) return workspace

  const parsed = ActionGuideRequestSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({
      error: 'Islem rehberi istegi gecersiz.',
      code: 'ACTION_GUIDE_REQUEST_INVALID',
      details: parsed.error.flatten(),
    }, { status: 400 })
  }

  try {
    const guideContext = await buildActionGuideContext({
      request,
      supabase: workspace.supabase as any,
      userId: workspace.userId,
      tenantId: workspace.workspaceId,
      input: parsed.data,
    })
    const result = await resolveActionGuide(parsed.data, guideContext)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({
      error: 'Islem rehberi su anda cevap veremedi. Lutfen tekrar deneyin.',
      code: 'ACTION_GUIDE_FAILED',
    }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
