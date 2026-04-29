import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// GET /api/settings/module-licenses
export async function GET() {
  const supabase = createServiceClient()

  const [modulesRes, submodulesRes] = await Promise.all([
    supabase.from('module_licenses').select('*'),
    supabase.from('submodule_licenses').select('*')
  ])

  if (modulesRes.error) return NextResponse.json({ error: modulesRes.error.message }, { status: 500 })
  if (submodulesRes.error) return NextResponse.json({ error: submodulesRes.error.message }, { status: 500 })

  return NextResponse.json({
    modules: modulesRes.data,
    submodules: submodulesRes.data
  })
}

// PATCH /api/settings/module-licenses
export async function PATCH(request: Request) {
  const supabase = createServiceClient()
  const body = await request.json()

  if (body.type === 'module') {
    const { key, is_active } = body
    const { error } = await supabase
      .from('module_licenses')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('module_key', key)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // If module is being disabled, also disable all its submodules
    if (!is_active) {
      await supabase
        .from('submodule_licenses')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('module_key', key)
    }

    return NextResponse.json({ success: true })
  }

  if (body.type === 'submodule') {
    const { moduleKey, submoduleKey, is_active } = body
    const { error } = await supabase
      .from('submodule_licenses')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('module_key', moduleKey)
      .eq('submodule_key', submoduleKey)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}
