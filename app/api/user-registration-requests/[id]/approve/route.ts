import { NextRequest, NextResponse } from 'next/server'
import {
  ensureBasicUserRole,
  ensureUserRegistrationRequestSchema,
  isTenantRegistrationAdmin,
  normalizeRegistrationEmail,
  normalizeRegistrationPhone,
  sendUserCreatedNotifications,
} from '@/lib/auth/userRegistrationRequests'
import { getAuthenticatedWorkspaceContext } from '@/lib/user-state/server'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const context = await getAuthenticatedWorkspaceContext(request)
  if (context instanceof NextResponse) return context

  const { supabase, userId, workspaceId } = context
  await ensureUserRegistrationRequestSchema()

  const isAdmin = await isTenantRegistrationAdmin(supabase, userId, workspaceId)
  if (!isAdmin) {
    return NextResponse.json({ error: 'Bu talebi onaylama yetkiniz yok.', code: 'PERMISSION_DENIED' }, { status: 403 })
  }

  try {
    const { data: registrationRequest, error: requestError } = await supabase
      .from('user_registration_requests')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', workspaceId)
      .maybeSingle()

    if (requestError) throw new Error(requestError.message)
    if (!registrationRequest?.id) {
      return NextResponse.json({ error: 'Kullanıcı kayıt talebi bulunamadı.', code: 'REQUEST_NOT_FOUND' }, { status: 404 })
    }
    if (registrationRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Bu talep artık beklemede değil.', code: 'REQUEST_NOT_PENDING' }, { status: 409 })
    }

    const person = await findOrCreatePersonForRequest(supabase, registrationRequest)
    const role = await ensureBasicUserRole(supabase)
    const hasDefaultMembership = await userHasDefaultMembership(supabase, person.id)

    const { data: membership, error: membershipError } = await supabase
      .from('tenant_memberships')
      .upsert({
        tenant_id: workspaceId,
        user_id: person.id,
        role_key: registrationRequest.requested_role_key || role.role_key,
        status: 'active',
        is_default: !hasDefaultMembership,
        metadata_json: {
          source: 'user_registration_request',
          request_id: registrationRequest.id,
          company_id: registrationRequest.company_id,
        },
      }, { onConflict: 'tenant_id,user_id,role_key' })
      .select('id')
      .single()

    if (membershipError) throw new Error(membershipError.message)

    const { data: userRole, error: userRoleError } = await supabase
      .from('user_roles')
      .upsert({
        instance_id: workspaceId,
        user_id: person.id,
        role_id: role.id,
        status: 'active',
      }, { onConflict: 'instance_id,user_id,role_id' })
      .select('id')
      .single()

    if (userRoleError) throw new Error(userRoleError.message)

    const notificationResults = await sendUserCreatedNotifications(supabase, {
      tenantId: workspaceId,
      personId: person.id,
      requestId: registrationRequest.id,
      fullName: person.full_name || registrationRequest.full_name || [registrationRequest.first_name, registrationRequest.last_name].filter(Boolean).join(' '),
      email: registrationRequest.email,
      phone: registrationRequest.phone,
    })

    const { data: updatedRequest, error: updateError } = await supabase
      .from('user_registration_requests')
      .update({
        status: 'approved',
        created_person_id: person.id,
        created_membership_id: membership?.id || null,
        created_user_role_id: userRole?.id || null,
        reviewed_by: userId || null,
        reviewed_at: new Date().toISOString(),
        notification_results: notificationResults,
        updated_at: new Date().toISOString(),
      })
      .eq('id', registrationRequest.id)
      .eq('tenant_id', workspaceId)
      .select('*')
      .single()

    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({
      data: {
        request: updatedRequest,
        person,
        membership,
        notifications: notificationResults,
      },
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kullanıcı oluşturulamadı.', code: 'REQUEST_APPROVE_FAILED' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

async function findOrCreatePersonForRequest(supabase: any, request: Record<string, any>) {
  const email = normalizeRegistrationEmail(request.email)
  const phone = normalizeRegistrationPhone(request.phone)
  const fullName = request.full_name || [request.first_name, request.last_name].filter(Boolean).join(' ').trim()

  const { data: existing, error: findError } = await supabase
    .from('persons')
    .select('id, first_name, last_name, full_name, national_id, nationality, gender, phone, email')
    .eq('tenant_id', request.tenant_id)
    .eq('national_id', request.national_id)
    .eq('is_deleted', false)
    .maybeSingle()

  if (findError) throw new Error(findError.message)

  if (existing?.id) {
    const patch: Record<string, any> = {
      first_name: existing.first_name || request.first_name,
      last_name: existing.last_name || request.last_name,
      full_name: existing.full_name || fullName,
      nationality: existing.nationality || request.nationality || 'TR',
      gender: existing.gender || request.gender || null,
      phone: existing.phone || phone || null,
      email: existing.email || email || null,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('persons')
      .update(patch)
      .eq('id', existing.id)
      .select('id, first_name, last_name, full_name, national_id, nationality, gender, phone, email')
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  const { data, error } = await supabase
    .from('persons')
    .insert({
      tenant_id: request.tenant_id,
      first_name: request.first_name,
      last_name: request.last_name,
      full_name: fullName,
      nationality: request.nationality || 'TR',
      national_id: request.national_id,
      gender: request.gender || null,
      phone: phone || null,
      email: email || null,
      status: 'active',
      is_deleted: false,
      metadata_json: {
        source: 'user_registration_request',
        request_id: request.id,
        company_id: request.company_id,
      },
    })
    .select('id, first_name, last_name, full_name, national_id, nationality, gender, phone, email')
    .single()

  if (error) throw new Error(error.message)
  return data
}

async function userHasDefaultMembership(supabase: any, personId: string) {
  const { data, error } = await supabase
    .from('tenant_memberships')
    .select('id')
    .eq('user_id', personId)
    .eq('status', 'active')
    .eq('is_default', true)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return Boolean(data?.id)
}
