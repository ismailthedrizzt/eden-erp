import { NextRequest, NextResponse } from 'next/server'
import {
  ensureUserRegistrationRequestSchema,
  isTenantRegistrationAdmin,
} from '@/lib/auth/userRegistrationRequests'
import { getAuthenticatedWorkspaceContext } from '@/lib/user-state/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const context = await getAuthenticatedWorkspaceContext(request)
  if (context instanceof NextResponse) return context

  const { supabase, userId, workspaceId } = context
  await ensureUserRegistrationRequestSchema()

  const isAdmin = await isTenantRegistrationAdmin(supabase, userId, workspaceId)
  if (!isAdmin) {
    return NextResponse.json({ error: 'Bu talepleri görüntüleme yetkiniz yok.', code: 'PERMISSION_DENIED' }, { status: 403 })
  }

  const status = request.nextUrl.searchParams.get('status') || 'pending'
  let query = supabase
    .from('user_registration_requests')
    .select(`
      id,
      tenant_id,
      company_id,
      company_tax_number,
      first_name,
      last_name,
      full_name,
      nationality,
      national_id,
      gender,
      email,
      phone,
      requested_role_key,
      status,
      created_person_id,
      reviewed_by,
      reviewed_at,
      approval_notes,
      rejection_reason,
      notification_results,
      created_at,
      updated_at,
      company:companies(id, trade_name, short_name, tax_number)
    `)
    .eq('tenant_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message, code: error.code || 'REQUESTS_FETCH_FAILED' }, { status: 500 })

  return NextResponse.json(
    { data: data || [] },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
