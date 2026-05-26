import { NextRequest, NextResponse } from 'next/server'
import {
  ensureUserRegistrationRequestSchema,
  isTenantRegistrationAdmin,
} from '@/lib/auth/userRegistrationRequests'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthenticatedWorkspaceContext } from '@/lib/user-state/server'

type PendingActionItem = {
  id: string
  type: string
  title: string
  subtitle: string
  statusLabel: string
  href: string
  severity: 'info' | 'warning'
  createdAt?: string
}

export async function GET(request: NextRequest) {
  const context = await getAuthenticatedWorkspaceContext(request)
  if (context instanceof NextResponse) return context

  const { supabase, userId, workspaceId } = context
  const processTasks = await fetchPendingProcessTasks(supabase, workspaceId, userId)
  if (processTasks.error) {
    return NextResponse.json({ error: processTasks.error.message, code: processTasks.error.code || 'PENDING_PROCESS_TASKS_FAILED' }, { status: 500 })
  }
  const processTaskItems = (processTasks.data || []).map((task: any) => ({
    id: `process-task-${task.id}`,
    type: 'process_task',
    title: task.title || 'Surec gorevi',
    subtitle: task.description || processTaskSubtitle(task),
    statusLabel: processTaskStatusLabel(task.status),
    href: task.process_instance_id ? `/app/surecler/${task.process_instance_id}` : '/app/surecler',
    severity: task.status === 'overdue' ? 'warning' : 'info',
    createdAt: task.due_at || task.updated_at || task.created_at,
  } satisfies PendingActionItem))

  const isAdmin = await isTenantRegistrationAdmin(supabase, userId, workspaceId)
  if (!isAdmin) {
    return NextResponse.json({
      data: {
        count: processTaskItems.length,
        items: processTaskItems.slice(0, 30),
      },
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  await ensureUserRegistrationRequestSchema()

  const [companies, partners, employees, ownershipTransactions, userRegistrationRequests] = await Promise.all([
    safeList(
      supabase,
      'companies',
      'id,short_name,trade_name,record_status,company_status,updated_at,created_at,is_deleted',
      query => query.in('record_status', ['draft', 'liquidation']).eq('is_deleted', false).eq('tenant_id', workspaceId).limit(25)
    ),
    fetchPendingPartners(supabase, workspaceId),
    fetchPendingEmployees(supabase, workspaceId),
    safeList(
      supabase,
      'ownership_transactions',
      'id,transaction_no,transaction_type,approval_status,workflow_status,updated_at,created_at,is_deleted',
      query => query.in('approval_status', ['draft', 'pending_approval']).eq('is_deleted', false).eq('tenant_id', workspaceId).limit(25)
    ),
    fetchPendingUserRegistrationRequests(supabase, workspaceId),
  ])

  const error = [companies.error, partners.error, employees.error, ownershipTransactions.error, userRegistrationRequests.error].find(Boolean)
  if (error) return NextResponse.json({ error: error.message, code: error.code || 'PENDING_NOTIFICATIONS_FAILED' }, { status: 500 })

  const items: PendingActionItem[] = [
    ...processTaskItems,
    ...(companies.data || []).map((company: any) => {
      const status = company.record_status || company.company_status
      const isLiquidation = status === 'liquidation'
      return {
        id: `company-${company.id}`,
        type: 'company_lifecycle',
        title: company.short_name || company.trade_name || 'Şirket kaydı',
        subtitle: isLiquidation ? 'Terkin işlemi bekliyor' : 'Şirket açılışı bekliyor',
        statusLabel: isLiquidation ? 'Tasfiye Halinde' : 'Taslak',
        href: `/app/sirket/companies?pending=${isLiquidation ? 'deregistration' : 'opening'}&id=${company.id}`,
        severity: isLiquidation ? 'warning' : 'info',
        createdAt: company.updated_at || company.created_at,
      } satisfies PendingActionItem
    }),
    ...(employees.data || []).map((employee: any) => ({
      id: `employee-${employee.id}`,
      type: 'employee_entry',
      title: employee.display_name || 'Çalışan kaydı',
      subtitle: 'İşe giriş bekliyor',
      statusLabel: 'Taslak',
      href: `/app/ik/personel?pending=entry&id=${employee.id}`,
      severity: 'info',
      createdAt: employee.updated_at || employee.created_at,
    } satisfies PendingActionItem)),
    ...(partners.data || []).map((partner: any) => ({
      id: `partner-${partner.id}`,
      type: 'partner_entry',
      title: partner.display_name || partner.partner_name || 'Ortak kaydı',
      subtitle: `${partner.company_name || 'Şirket'} için ortaklık kaydı bekliyor`,
      statusLabel: 'Taslak',
      href: `/app/sirket/companies/partners?pending=entry&id=${partner.id}`,
      severity: 'info',
      createdAt: partner.updated_at || partner.created_at,
    } satisfies PendingActionItem)),
    ...(ownershipTransactions.data || []).map((transaction: any) => {
      const pendingApproval = transaction.approval_status === 'pending_approval'
      return {
        id: `ownership-${transaction.id}`,
        type: 'ownership_transaction',
        title: transaction.transaction_no || transaction.transaction_type || 'Ortaklık işlemi',
        subtitle: pendingApproval ? 'Onay bekliyor' : 'Onaya gönderilmeyi bekliyor',
        statusLabel: pendingApproval ? 'Onay Bekliyor' : 'Taslak',
        href: `/app/sirket/companies/partners?pending=ownership_transaction&transaction_id=${transaction.id}`,
        severity: pendingApproval ? 'warning' : 'info',
        createdAt: transaction.updated_at || transaction.created_at,
      } satisfies PendingActionItem
    }),
    ...(userRegistrationRequests.data || []).map((registrationRequest: any) => ({
      id: `user-registration-${registrationRequest.id}`,
      type: 'user_registration_request',
      title: registrationRequest.full_name || [registrationRequest.first_name, registrationRequest.last_name].filter(Boolean).join(' ') || 'Kullanıcı kayıt talebi',
      subtitle: `${registrationRequest.company_name || 'Şirket'} için kullanıcı talebi`,
      statusLabel: 'Onay Bekliyor',
      href: `/app/sistem/kullanici-talepleri?id=${registrationRequest.id}`,
      severity: 'warning',
      createdAt: registrationRequest.created_at,
    } satisfies PendingActionItem)),
  ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

  return NextResponse.json({
    data: {
      count: items.length,
      items: items.slice(0, 30),
    },
  })
}

async function fetchPendingProcessTasks(supabase: ReturnType<typeof createServiceClient>, workspaceId: string, userId: string | null) {
  let query = supabase
    .from('process_tasks')
    .select('id,process_instance_id,module_key,entity_type,entity_id,step_key,title,description,status,assigned_to,assigned_role,assigned_permission,due_at,updated_at,created_at,is_deleted')
    .in('status', ['open', 'in_progress', 'overdue'])
    .eq('is_deleted', false)
    .eq('tenant_id', workspaceId)
    .limit(25)
  if (userId) query = query.or(`assigned_to.is.null,assigned_to.eq.${userId}`)
  const result = await query
  if (result.error && isMissingSourceError(result.error)) return { data: [], error: null }
  return result
}

function processTaskSubtitle(task: any) {
  if (task.module_key === 'branches') return 'Sube sureci icin gorev bekliyor'
  return 'Surec adimi icin gorev bekliyor'
}

function processTaskStatusLabel(status: string) {
  if (status === 'in_progress') return 'Devam Ediyor'
  if (status === 'overdue') return 'Gecikmis'
  return 'Acik Gorev'
}

async function safeList(
  supabase: ReturnType<typeof createServiceClient>,
  table: string,
  select: string,
  apply: (query: any) => any
) {
  const result = await apply(supabase.from(table).select(select))
  if (result.error && isMissingSourceError(result.error)) return { data: [], error: null }
  return result
}

async function fetchPendingPartners(supabase: ReturnType<typeof createServiceClient>, workspaceId: string) {
  const result = await supabase
    .from('company_partners')
    .select('id,company_id,display_name,partner_name,record_status,status,updated_at,created_at,is_deleted')
    .or('record_status.eq.draft,status.eq.Taslak,status.eq.taslak,status.eq.draft')
    .eq('is_deleted', false)
    .eq('tenant_id', workspaceId)
    .limit(25)

  if (result.error) {
    if (isMissingSourceError(result.error)) return { data: [], error: null }
    return result
  }

  const partners = result.data || []
  const companyIds = Array.from(new Set(
    partners
      .map((partner: any) => partner.company_id)
      .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
  ))

  if (companyIds.length === 0) return { data: partners, error: null }

  const companies = await safeList(
    supabase,
    'companies',
    'id,short_name,trade_name',
    query => query.in('id', companyIds)
  )
  if (companies.error) return companies

  const companyById = new Map((companies.data || []).map((company: any) => [company.id, company]))
  return {
    data: partners.map((partner: any) => {
      const company = companyById.get(partner.company_id) as Record<string, any> | undefined
      return {
        ...partner,
        company_name: company?.short_name || company?.trade_name || '',
      }
    }),
    error: null,
  }
}

async function fetchPendingEmployees(supabase: ReturnType<typeof createServiceClient>, workspaceId: string) {
  const result = await supabase
    .from('employees')
    .select('id,person_id,record_status,employment_status,updated_at,created_at')
    .in('record_status', ['draft'])
    .eq('tenant_id', workspaceId)
    .limit(25)

  if (result.error) {
    if (isMissingSourceError(result.error)) return { data: [], error: null }
    return result
  }

  const employees = result.data || []
  const personIds = Array.from(new Set(
    employees
      .map((employee: any) => employee.person_id)
      .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
  ))

  if (personIds.length === 0) return { data: employees, error: null }

  const people = await safeList(
    supabase,
    'persons',
    'id,first_name,last_name,full_name',
    query => query.in('id', personIds)
  )
  if (people.error) return people

  const personById = new Map((people.data || []).map((person: any) => [person.id, person]))
  return {
    data: employees.map((employee: any) => {
      const person = personById.get(employee.person_id) as Record<string, any> | undefined
      return {
        ...employee,
        first_name: person?.first_name || '',
        last_name: person?.last_name || '',
        display_name: person?.full_name || [person?.first_name, person?.last_name].filter(Boolean).join(' '),
      }
    }),
    error: null,
  }
}

async function fetchPendingUserRegistrationRequests(supabase: ReturnType<typeof createServiceClient>, workspaceId: string) {
  const result = await supabase
    .from('user_registration_requests')
    .select('id,company_id,first_name,last_name,full_name,email,phone,status,created_at')
    .eq('tenant_id', workspaceId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(25)

  if (result.error) {
    if (isMissingSourceError(result.error)) return { data: [], error: null }
    return result
  }

  const requests = result.data || []
  const companyIds = Array.from(new Set(
    requests
      .map((item: any) => item.company_id)
      .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
  ))

  if (companyIds.length === 0) return { data: requests, error: null }

  const companies = await safeList(
    supabase,
    'companies',
    'id,short_name,trade_name',
    query => query.in('id', companyIds)
  )
  if (companies.error) return companies

  const companyById = new Map((companies.data || []).map((company: any) => [company.id, company]))
  return {
    data: requests.map((item: any) => {
      const company = companyById.get(item.company_id) as Record<string, any> | undefined
      return {
        ...item,
        company_name: company?.short_name || company?.trade_name || '',
      }
    }),
    error: null,
  }
}

function isMissingSourceError(error: any) {
  const message = String(error?.message || '')
  return error?.code === '42P01'
    || error?.code === '42703'
    || message.includes('Could not find the table')
    || message.includes('Could not find')
}
