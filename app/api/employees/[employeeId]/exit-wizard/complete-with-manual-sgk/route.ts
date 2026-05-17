import { NextRequest } from 'next/server'
import { completeEmployeeExit } from '@/lib/modules/employees/workLifecycle.server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  return completeEmployeeExit(request, employeeId, true)
}
