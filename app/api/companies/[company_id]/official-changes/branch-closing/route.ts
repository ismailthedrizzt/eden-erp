// BACKEND_MIGRATION_STATUS: keep_bff_proxy_with_legacy_fallback
// TARGET_BACKEND_MODULE: branches
// TARGET_FASTAPI_ENDPOINT: /api/v1/companies/{company_id}/branch-closings
// NOTES: Proxies to FastAPI when FASTAPI_BASE_URL is configured; TS fallback is temporary migration bridge.

import { NextRequest } from 'next/server'
import { isFastApiEnabled, proxyToFastApi } from '@/lib/backend/fastApiProxy'
import { stripOperationControlFields } from '@/lib/operations/idempotency'
import {
  CompanyBranchClosingSchema,
  runCompanyBranchClosingOrchestrator,
} from '@/lib/operations/orchestrators/companyBranchClosing.orchestrator'
import {
  orchestratorError,
  orchestratorResultToNextResponse,
} from '@/lib/operations/orchestrators/orchestratorResponse'
import { createServiceClient } from '@/lib/supabase/server'
import { requireBranchPolicy } from '@/lib/security/policies/branchPolicies'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id: companyId } = await params
  if (isFastApiEnabled()) {
    const proxied = await proxyToFastApi(request, `/api/v1/companies/${companyId}/branch-closings`)
    if (proxied) return proxied
  }
  console.warn('FastAPI backend not configured; using legacy TS fallback for branch closing.')

  const rawBody = await request.json().catch(() => ({}))
  const parsed = CompanyBranchClosingSchema.safeParse(stripOperationControlFields(rawBody))

  if (!parsed.success) {
    return orchestratorResultToNextResponse(orchestratorError(
      'Sube kapanisi verileri gecerli degil.',
      'VALIDATION_FAILED',
      400,
      { validation: parsed.error.flatten() }
    ))
  }

  const supabase = createServiceClient()
  const policy = await requireBranchPolicy({
    request,
    supabase,
    actionKey: 'branch.closingStart',
    companyId,
    branchId: parsed.data.branch_id,
  })
  if (policy instanceof Response) return policy

  const result = await runCompanyBranchClosingOrchestrator({
    request,
    companyId,
    input: parsed.data,
    rawBody,
  })

  return orchestratorResultToNextResponse(result)
}
