import { NextRequest } from 'next/server'
import { getCompanyLifecycleEvents } from '@/lib/modules/companies/companyLifecycle.server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id } = await params
  return getCompanyLifecycleEvents(request, company_id)
}
