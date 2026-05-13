import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { systemParameterDefinitions } from '@/lib/system/systemParameters.config'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'system_parameters.view')
  if (permission instanceof NextResponse) return permission

  const { data, error } = await supabase
    .from('system_parameters')
    .select('*')

  if (error && !isMissingTableError(error)) return NextResponse.json({ error: error.message }, { status: 500 })

  const values = new Map((data || []).map(row => [row.parameter_key, row]))
  return NextResponse.json({
    data: systemParameterDefinitions.map(definition => ({
      ...definition,
      value: values.get(definition.key)?.value?.value ?? definition.defaultValue,
      descriptionOverride: values.get(definition.key)?.description || null,
      updatedAt: values.get(definition.key)?.updated_at || null,
    })),
    warning: error && isMissingTableError(error) ? 'system_parameters tablosu bulunamadı; varsayılan değerler gösteriliyor.' : undefined,
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'system_parameters.edit')
  if (permission instanceof NextResponse) return permission

  const body = await request.json().catch(() => ({}))
  const definition = systemParameterDefinitions.find(item => item.key === body.key)
  if (!definition) return NextResponse.json({ error: 'Parametre tanımı bulunamadı.' }, { status: 404 })

  const value = normalizeValue(body.value, definition)
  const payload = {
    parameter_key: definition.key,
    module_key: definition.moduleKey,
    page_key: definition.pageKey,
    value: { value },
    description: body.description || definition.description || null,
    updated_by: permission.userId,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('system_parameters')
    .upsert(payload, { onConflict: 'parameter_key' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

function normalizeValue(value: unknown, definition: typeof systemParameterDefinitions[number]) {
  if (definition.type === 'boolean') return value === true || value === 'true'
  if (definition.type === 'number') return String(Number(value || 0))
  const text = String(value ?? definition.defaultValue)
  if (definition.type === 'enum' && definition.options?.length && !definition.options.includes(text)) return definition.defaultValue
  return text
}

function isMissingTableError(error: any) {
  return error?.code === '42P01' || String(error?.message || '').includes('Could not find the table')
}
