import { NextRequest } from 'next/server'
import { getEmployeeWizardContext } from '@/lib/modules/employees/workLifecycle.server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  return getEmployeeWizardContext(request, employeeId, 'entry')
}
