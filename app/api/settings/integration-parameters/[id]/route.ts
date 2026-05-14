import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { isMissingTableError, missingTableResponse } from '../../../accounting/_banking'
import { INTEGRATION_PARAMETER_SELECT, normalizeIntegrationParameter } from '../_shared'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'integration_parameters.view')
  if (permission instanceof NextResponse) return permission

  const { data, error } = await supabase.from('integration_parameters').select(INTEGRATION_PARAMETER_SELECT).eq('id', id).eq('is_deleted', false).single()
  if (error) {
    if (isMissingTableError(error)) return missingTableResponse('integration_parameters')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'integration_parameters.edit')
  if (permission instanceof NextResponse) return permission

  const payload = normalizeIntegrationParameter(await request.json())
  const { data, error } = await supabase
    .from('integration_parameters')
    .update({ ...payload, updated_by: permission.userId })
    .eq('id', id)
    .select(INTEGRATION_PARAMETER_SELECT)
    .single()

  if (error) {
    if (isMissingTableError(error)) return missingTableResponse('integration_parameters')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
