import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('employee_work_relations')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('is_deleted', false)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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
  const { data, error } = await supabase
    .from('employee_work_relations')
    .upsert({ ...body, employee_id: employeeId, updated_at: new Date().toISOString() }, { onConflict: 'employee_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
