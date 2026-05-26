import { NextRequest } from 'next/server'
import { stripOperationControlFields } from '@/lib/operations/idempotency'
import {
  CompanyBranchOpeningSchema,
  runCompanyBranchOpeningOrchestrator,
} from '@/lib/operations/orchestrators/companyBranchOpening.orchestrator'
import {
  orchestratorError,
  orchestratorResultToNextResponse,
} from '@/lib/operations/orchestrators/orchestratorResponse'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id: companyId } = await params
  const rawBody = await request.json().catch(() => ({}))
  const parsed = CompanyBranchOpeningSchema.safeParse(stripOperationControlFields(rawBody))

  if (!parsed.success) {
    return orchestratorResultToNextResponse(orchestratorError(
      'Sube acilisi verileri gecerli degil.',
      'VALIDATION_FAILED',
      400,
      { validation: parsed.error.flatten() }
    ))
  }

  const result = await runCompanyBranchOpeningOrchestrator({
    request,
    companyId,
    input: parsed.data,
    rawBody,
  })

  return orchestratorResultToNextResponse(result)
}
