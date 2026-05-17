import { NextRequest } from 'next/server'
import { completeEmployeeEntry } from '@/lib/modules/employees/workLifecycle.server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  return completeEmployeeEntry(request, employeeId, true)
}
