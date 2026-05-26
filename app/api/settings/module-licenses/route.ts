import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { listModuleContracts, getModuleContract } from '@/lib/modules/moduleRegistry'

const MODULE_LICENSE_SELECT = 'id,module_key,module_name,is_active,environment,created_at,updated_at'
const SUBMODULE_LICENSE_SELECT = 'id,module_key,submodule_key,submodule_name,is_active,environment,created_at,updated_at'

// GET /api/settings/module-licenses
export async function GET() {
  const supabase = createServiceClient()

  const [modulesRes, submodulesRes] = await Promise.all([
    supabase.from('module_licenses').select(MODULE_LICENSE_SELECT),
    supabase.from('submodule_licenses').select(SUBMODULE_LICENSE_SELECT)
  ])

  if (modulesRes.error) return NextResponse.json({ error: modulesRes.error.message }, { status: 500 })
  if (submodulesRes.error) return NextResponse.json({ error: submodulesRes.error.message }, { status: 500 })

  return NextResponse.json({
    modules: mergeContractModules(modulesRes.data || []),
    submodules: submodulesRes.data
  })
}

// PATCH /api/settings/module-licenses
export async function PATCH(request: Request) {
  const supabase = createServiceClient()
  const body = await request.json()

  if (body.type === 'module') {
    const { key, is_active, environment } = body
    const contract = getModuleContract(key)
    const updates = {
      module_key: key,
      module_name: contract?.name || key,
      ...(typeof is_active === 'boolean' ? { is_active } : {}),
      ...(environment ? { environment } : {}),
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase
      .from('module_licenses')
      .upsert(updates, { onConflict: 'module_key' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // If module is being disabled, also disable all its submodules
    if (typeof is_active === 'boolean' && !is_active) {
      await supabase
        .from('submodule_licenses')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('module_key', key)
    }

    return NextResponse.json({ success: true })
  }

  if (body.type === 'submodule') {
    const { moduleKey, submoduleKey, is_active, environment } = body
    const updates = {
      ...(typeof is_active === 'boolean' ? { is_active } : {}),
      ...(environment ? { environment } : {}),
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase
      .from('submodule_licenses')
      .update(updates)
      .eq('module_key', moduleKey)
      .eq('submodule_key', submoduleKey)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}

function mergeContractModules(rows: Record<string, any>[]) {
  const byKey = new Map(rows.map(row => [row.module_key, row]))
  for (const contract of listModuleContracts()) {
    if (byKey.has(contract.key)) continue
    byKey.set(contract.key, {
      id: `contract:${contract.key}`,
      module_key: contract.key,
      module_name: contract.name,
      is_active: contract.defaultEnabled,
      environment: 'all',
      created_at: null,
      updated_at: null,
      contract_only: true,
    })
  }
  return Array.from(byKey.values())
}
