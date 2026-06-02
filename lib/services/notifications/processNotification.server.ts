import 'server-only'

import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { withTenantInsertScopeForTable, type TenantContext } from '@/lib/tenancy/server'

type WorkNotificationSource = Record<string, any>

export async function createProcessTaskNotification(
  supabase: SupabaseClient,
  tenantContext: TenantContext,
  task: WorkNotificationSource
) {
  const userIds = await resolveNotificationUserIds(supabase, tenantContext, {
    directUserId: task.assigned_to,
    roleKey: task.assigned_role,
    permissionKey: task.assigned_permission,
  })
  if (!userIds.length) return
  const payload = processTaskPayload(task)
  await insertNotifications(supabase, tenantContext, userIds, payload)
}

export async function createProcessApprovalNotification(
  supabase: SupabaseClient,
  tenantContext: TenantContext,
  approval: WorkNotificationSource
) {
  const userIds = await resolveNotificationUserIds(supabase, tenantContext, {
    directUserId: approval.approver_id,
    roleKey: approval.approver_role,
    permissionKey: approval.approver_permission,
  })
  if (!userIds.length) return
  const payload = processApprovalPayload(approval)
  await insertNotifications(supabase, tenantContext, userIds, payload)
}

export async function dismissWorkNotifications(
  supabase: SupabaseClient,
  tenantContext: TenantContext,
  targets: { taskId?: string | null; approvalId?: string | null; processInstanceId?: string | null }
) {
  const filters = [
    targets.taskId ? `task_id.eq.${targets.taskId}` : '',
    targets.approvalId ? `approval_id.eq.${targets.approvalId}` : '',
    targets.processInstanceId ? `process_instance_id.eq.${targets.processInstanceId}` : '',
  ].filter(Boolean)
  if (!filters.length) return

  await supabase
    .from('notifications')
    .update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
    .eq('tenant_id', tenantContext.tenantId)
    .in('status', ['unread', 'read'])
    .or(filters.join(','))
}

async function insertNotifications(
  supabase: SupabaseClient,
  tenantContext: TenantContext,
  userIds: string[],
  payload: Record<string, any>
) {
  const rows = Array.from(new Set(userIds.filter(Boolean))).map(userId =>
    withTenantInsertScopeForTable({
      id: randomUUID(),
      tenant_id: tenantContext.tenantId,
      user_id: userId,
      status: 'unread',
      delivered_channels: ['in_app'],
      delivery_status: 'delivered',
      ...payload,
    }, 'notifications', tenantContext)
  )
  if (!rows.length) return
  await supabase.from('notifications').insert(rows)
}

async function resolveNotificationUserIds(
  supabase: SupabaseClient,
  tenantContext: TenantContext,
  input: { directUserId?: string | null; roleKey?: string | null; permissionKey?: string | null }
) {
  const userIds = new Set<string>()
  if (input.directUserId) userIds.add(String(input.directUserId))

  if (input.roleKey) {
    const { data: roles } = await supabase
      .from('security_roles')
      .select('id')
      .eq('tenant_id', tenantContext.tenantId)
      .eq('role_key', input.roleKey)
      .eq('status', 'active')
    const roleIds = (roles || []).map((role: any) => role.id).filter(Boolean)
    await addSecurityRoleUsers(supabase, tenantContext, userIds, roleIds)
  }

  if (input.permissionKey) {
    const { data: permissions } = await supabase
      .from('security_role_permissions')
      .select('role_id')
      .eq('tenant_id', tenantContext.tenantId)
      .eq('permission_key', input.permissionKey)
      .eq('granted', true)
    const roleIds = (permissions || []).map((row: any) => row.role_id).filter(Boolean)
    await addSecurityRoleUsers(supabase, tenantContext, userIds, roleIds)
  }

  return Array.from(userIds)
}

async function addSecurityRoleUsers(
  supabase: SupabaseClient,
  tenantContext: TenantContext,
  userIds: Set<string>,
  roleIds: string[]
) {
  if (!roleIds.length) return
  const { data: assignments } = await supabase
    .from('security_user_roles')
    .select('user_id')
    .eq('tenant_id', tenantContext.tenantId)
    .in('role_id', roleIds)
  const assignedIds = (assignments || []).map((row: any) => row.user_id).filter(Boolean)
  const { data: profiles } = assignedIds.length
    ? await supabase.from('security_users_profile').select('id,auth_user_id').in('id', assignedIds)
    : { data: [] as any[] }
  const profileMap = new Map((profiles || []).map((profile: any) => [profile.id, profile.auth_user_id || profile.id]))
  assignedIds.forEach((id: string) => userIds.add(String(profileMap.get(id) || id)))
}

function processTaskPayload(task: WorkNotificationSource) {
  const metadata = cardMetadata(task, task.title || 'İşlem bekliyor')
  return {
    company_id: task.company_id || null,
    module_key: task.module_key || 'process',
    notification_type: 'process_task_created',
    title: metadata.record_label,
    message: metadata.message,
    severity: 'info',
    priority: 'normal',
    action_required: true,
    action_key: 'open_process_task',
    action_label: 'Aç',
    target_page: metadata.target_page,
    related_entity_type: metadata.entity_type || null,
    related_entity_id: metadata.entity_id || null,
    related_record_label: metadata.record_label,
    process_instance_id: task.process_instance_id || null,
    task_id: task.id || null,
    due_at: task.due_at || null,
    metadata_json: metadata,
  }
}

function processApprovalPayload(approval: WorkNotificationSource) {
  const metadata = cardMetadata(approval, 'Onay bekliyor')
  return {
    company_id: approval.company_id || null,
    module_key: approval.module_key || 'process',
    notification_type: 'approval_requested',
    title: metadata.record_label,
    message: metadata.message,
    severity: 'warning',
    priority: 'high',
    action_required: true,
    action_key: 'open_process_approval',
    action_label: 'Aç',
    target_page: metadata.target_page,
    related_entity_type: metadata.entity_type || null,
    related_entity_id: metadata.entity_id || null,
    related_record_label: metadata.record_label,
    process_instance_id: approval.process_instance_id || null,
    task_id: approval.task_id || null,
    approval_id: approval.id || null,
    metadata_json: metadata,
  }
}

function cardMetadata(row: WorkNotificationSource, defaultAction: string) {
  const payload = objectValue(row.payload_json)
  const entityType = text(row.entity_type) || text(payload.entity_type) || text(row.related_entity_type)
  const entityId = text(row.entity_id) || text(payload.entity_id) || text(row.related_entity_id)
  const entityTypeLabel = entityLabel(entityType)
  const recordLabel = text(payload.related_record_label)
    || text(payload.record_label)
    || text(payload.display_name)
    || text(payload.full_name)
    || text(row.related_record_label)
    || text(row.title)
    || entityId
    || 'Kayıt'
  const recordStatusLabel = statusLabel(text(payload.record_status_label) || text(payload.status_label) || text(payload.record_status))
  const cardType = [recordStatusLabel, entityTypeLabel].filter(Boolean).join(' ') || 'Kayıt'
  const pendingAction = text(payload.pending_action_label) || text(payload.operation_label) || text(row.title) || defaultAction
  const targetPage = text(payload.target_page) || recordTargetPage(entityType, entityId) || processTargetPage(row)
  return {
    ...payload,
    entity_type: entityType,
    entity_id: entityId,
    entity_type_label: entityTypeLabel,
    record_status_label: recordStatusLabel,
    record_label: recordLabel,
    card_type: cardType,
    pending_action_label: pendingAction,
    target_page: targetPage,
    message: `${cardType}, ${pendingAction}`,
  }
}

function recordTargetPage(entityType: string, entityId: string) {
  if (!entityType || !entityId) return ''
  const targets: Record<string, string> = {
    company: '/app/sirket/companies',
    branch: '/app/sirket/companies/branches',
    company_branch: '/app/sirket/companies/branches',
    partner: '/app/sirket/companies/partners',
    company_partner: '/app/sirket/companies/partners',
    representative: '/app/sirket/companies/representatives',
    company_representative: '/app/sirket/companies/representatives',
    employee: '/app/ik/personel',
    hr_employee: '/app/ik/personel',
  }
  return targets[entityType] ? `${targets[entityType]}?id=${entityId}&action=notification` : ''
}

function processTargetPage(row: WorkNotificationSource) {
  return row.process_instance_id ? `/app/surecler/${row.process_instance_id}` : '/app/surecler'
}

function entityLabel(entityType: string) {
  const labels: Record<string, string> = {
    company: 'Şirket',
    branch: 'Şube',
    company_branch: 'Şube',
    partner: 'Ortak',
    company_partner: 'Ortak',
    representative: 'Temsilci',
    company_representative: 'Temsilci',
    employee: 'Çalışan',
    hr_employee: 'Çalışan',
    person: 'Gerçek Kişi',
  }
  return labels[entityType] || 'Kayıt'
}

function statusLabel(value: string) {
  const normalized = value.toLocaleLowerCase('tr-TR')
  if (normalized === 'draft' || normalized === 'taslak') return 'Taslak'
  if (normalized === 'active' || normalized === 'aktif') return 'Aktif'
  if (normalized === 'passive' || normalized === 'pasif') return 'Pasif'
  if (normalized === 'pending' || normalized === 'pending_approval' || normalized === 'waiting_approval') return 'Onayda'
  return value
}

function objectValue(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}
