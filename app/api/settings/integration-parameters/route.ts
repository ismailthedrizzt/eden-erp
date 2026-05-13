import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { isMissingTableError, missingTableResponse } from '../../accounting/_banking'
import { normalizeIntegrationParameter } from './_shared'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'integration_parameters.view')
  if (permission instanceof NextResponse) return permission

  const { data, error } = await supabase
    .from('integration_parameters')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingTableError(error)) return missingTableResponse('integration_parameters')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] })
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'integration_parameters.edit')
  if (permission instanceof NextResponse) return permission

  const payload = normalizeIntegrationParameter(await request.json())
  if (!payload.integration_name) return NextResponse.json({ error: 'Entegrasyon adı zorunludur.' }, { status: 400 })

  const { data, error } = await supabase
    .from('integration_parameters')
    .insert({ ...payload, created_by: permission.userId, updated_by: permission.userId })
    .select('*')
    .single()

  if (error) {
    if (isMissingTableError(error)) return missingTableResponse('integration_parameters')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
