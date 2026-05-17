import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { EMPLOYEE_WORK_PERMISSIONS, fetchLifecycleEvents } from '@/lib/modules/employees/workLifecycle.server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, EMPLOYEE_WORK_PERMISSIONS.lifecycleView)
  if (permission instanceof NextResponse) return permission

  const { data, error } = await fetchLifecycleEvents(supabase, employeeId)
  if (error) return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  return NextResponse.json({ data: data || [] })
}
