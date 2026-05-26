import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveActionGuide } from '@/lib/action-guide/intentMatcher'
import { getAuthenticatedWorkspaceContext } from '@/lib/user-state/server'
import {
  listModuleRuntimeStatuses,
  loadModuleFeatureContext,
} from '@/lib/modules/moduleFeatureResolver'

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

  const requestedContext = parsed.data.context as Record<string, any>
  const moduleFeatureContext = await loadModuleFeatureContext(context.supabase, {
    tenantId: context.workspaceId,
    userPermissions: Array.isArray(requestedContext.userPermissions) ? requestedContext.userPermissions : undefined,
  }).catch(() => ({ moduleLicenses: [] }))
  const moduleStatuses = listModuleRuntimeStatuses(moduleFeatureContext)

  const result = resolveActionGuide(parsed.data.query, {
    ...requestedContext,
    currentPage: parsed.data.currentPage ?? requestedContext.currentPage,
    selectedRecordType: parsed.data.selectedRecordType ?? requestedContext.selectedRecordType,
    selectedRecordId: parsed.data.selectedRecordId ?? requestedContext.selectedRecordId,
    selectedRecordStatus: parsed.data.selectedRecordStatus ?? requestedContext.selectedRecordStatus,
    companyId: parsed.data.companyId ?? requestedContext.companyId,
    branchId: parsed.data.branchId ?? requestedContext.branchId,
    tenantId: context.workspaceId,
    availableModules: moduleStatuses.filter(item => item.status === 'available').map(item => item.moduleKey),
    moduleStatuses: Object.fromEntries(moduleStatuses.map(item => [item.moduleKey, item.status])),
    moduleBlockingReasons: Object.fromEntries(moduleStatuses.map(item => [item.moduleKey, item.blocking_reasons])),
    moduleWarnings: Object.fromEntries(moduleStatuses.map(item => [item.moduleKey, item.warnings])),
  })

  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
