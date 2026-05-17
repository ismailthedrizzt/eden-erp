import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { EMPLOYEE_WORK_PERMISSIONS, fetchCurrentWorkRelation } from '@/lib/modules/employees/workLifecycle.server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, EMPLOYEE_WORK_PERMISSIONS.workRelationView)
  if (permission instanceof NextResponse) return permission

  const { data, error } = await fetchCurrentWorkRelation(supabase, employeeId)
  if (error) return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest, context: { params: Promise<{ employeeId: string }> }) {
  return upsertWorkRelation(request, context)
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ employeeId: string }> }) {
  return upsertWorkRelation(request, context)
}

async function upsertWorkRelation(request: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  const body = await request.json().catch(() => ({}))
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, EMPLOYEE_WORK_PERMISSIONS.workRelationEdit)
  if (permission instanceof NextResponse) return permission

  const current = await fetchCurrentWorkRelation(supabase, employeeId)
  if (current.error) return NextResponse.json({ error: current.error.message, code: current.error.code || 'FETCH_FAILED' }, { status: 500 })

  const payload = {
    ...body,
    employee_id: employeeId,
    updated_at: new Date().toISOString(),
    updated_by: permission.userId,
  }

  const result = current.data?.id
    ? await supabase.from('employee_work_relations').update(payload).eq('id', current.data.id).select().single()
    : await supabase.from('employee_work_relations').insert(payload).select().single()

  if (result.error) return NextResponse.json({ error: result.error.message, code: result.error.code || 'SAVE_FAILED' }, { status: 500 })
  return NextResponse.json({ data: result.data })
}
