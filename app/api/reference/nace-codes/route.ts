import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'nace_reference.view')
  if (permission instanceof NextResponse) return permission

  const { searchParams } = new URL(request.url)
  const queryText = searchParams.get('q')

  let query = supabase
    .from('nace_codes')
    .select('*')
    .eq('is_active', true)
    .order('nace_code', { ascending: true })
    .limit(50)

  if (queryText) query = query.or(`nace_code.ilike.%${queryText}%,description.ilike.%${queryText}%`)

  const { data, error } = await query
  if (error) {
    if (isMissingTableError(error)) {
      return NextResponse.json({
        data: [],
        warning: 'NACE referans listesi oluşturulamadı. Lütfen admin tarafından resmi liste yükleyin.',
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: data || [],
    warning: (data || []).length === 0 ? 'NACE referans listesi oluşturulamadı. Lütfen admin tarafından resmi liste yükleyin.' : undefined,
  })
}

function isMissingTableError(error: any) {
  return error?.code === '42P01' || String(error?.message || '').includes('Could not find the table')
}
