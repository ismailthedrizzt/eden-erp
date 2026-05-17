import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

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

export async function GET() {
  const supabase = createServiceClient()
  const [companies, employees, ownershipTransactions] = await Promise.all([
    safeList(
      supabase,
      'companies',
      'id,short_name,trade_name,record_status,company_status,updated_at,created_at,is_deleted',
      query => query.in('record_status', ['draft', 'liquidation']).eq('is_deleted', false).limit(25)
    ),
    safeList(
      supabase,
      'employees',
      'id,first_name,last_name,record_status,employment_status,updated_at,created_at',
      query => query.in('record_status', ['draft']).limit(25)
    ),
    safeList(
      supabase,
      'ownership_transactions',
      'id,transaction_no,transaction_type,approval_status,workflow_status,updated_at,created_at,is_deleted',
      query => query.in('approval_status', ['draft', 'pending_approval']).eq('is_deleted', false).limit(25)
    ),
  ])

  const error = [companies.error, employees.error, ownershipTransactions.error].find(Boolean)
  if (error) return NextResponse.json({ error: error.message, code: error.code || 'PENDING_NOTIFICATIONS_FAILED' }, { status: 500 })

  const items: PendingActionItem[] = [
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
      title: [employee.first_name, employee.last_name].filter(Boolean).join(' ') || 'Çalışan kaydı',
      subtitle: 'İşe giriş wizardı bekliyor',
      statusLabel: 'Taslak',
      href: `/app/ik/personel?pending=entry&id=${employee.id}`,
      severity: 'info',
      createdAt: employee.updated_at || employee.created_at,
    } satisfies PendingActionItem)),
    ...(ownershipTransactions.data || []).map((transaction: any) => {
      const pendingApproval = transaction.approval_status === 'pending_approval'
      return {
        id: `ownership-${transaction.id}`,
        type: 'ownership_transaction',
        title: transaction.transaction_no || transaction.transaction_type || 'Ortaklık işlemi',
        subtitle: pendingApproval ? 'Onay bekliyor' : 'Onaya gönderilmeyi bekliyor',
        statusLabel: pendingApproval ? 'Onay Bekliyor' : 'Taslak',
        href: `/app/sirket/ortaklik-islemleri?pending=${transaction.approval_status}&id=${transaction.id}`,
        severity: pendingApproval ? 'warning' : 'info',
        createdAt: transaction.updated_at || transaction.created_at,
      } satisfies PendingActionItem
    }),
  ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

  return NextResponse.json({
    data: {
      count: items.length,
      items: items.slice(0, 30),
    },
  })
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

function isMissingSourceError(error: any) {
  const message = String(error?.message || '')
  return error?.code === '42P01'
    || error?.code === '42703'
    || message.includes('Could not find the table')
    || message.includes('Could not find')
}
