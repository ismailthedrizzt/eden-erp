import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'nace_reference.admin')
  if (permission instanceof NextResponse) return permission

  const { data, error } = await supabase
    .from('nace_reference_update_logs')
    .select('id,job_name,source_name,source_url,status,message,imported_count,updated_count,deactivated_count,raw_metadata,created_at,created_by')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    if (error.code === '42P01' || String(error.message).includes('Could not find the table')) return NextResponse.json({ data: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] })
}
