import { NextRequest } from 'next/server'
import { completeCompanyWizard } from '@/lib/modules/companies/companyLifecycle.server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id } = await params
  return completeCompanyWizard(request, company_id, 'deregistration')
}
