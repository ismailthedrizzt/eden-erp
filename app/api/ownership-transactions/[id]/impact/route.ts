import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { OWNERSHIP_TRANSACTION_SELECT } from '../../_shared'

const CURRENT_OWNERSHIP_IMPACT_SELECT = 'company_id,partner_id,display_name,current_share_ratio,current_voting_ratio,current_profit_ratio'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data: transaction, error } = await supabase.from('ownership_transactions').select(OWNERSHIP_TRANSACTION_SELECT).eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message, code: error.code || 'FETCH_FAILED' }, { status: 500 })

  const { data: beforeRows } = await supabase
    .from('v_current_ownership')
    .select(CURRENT_OWNERSHIP_IMPACT_SELECT)
    .eq('company_id', transaction.company_id)

  const afterRows = simulateImpact(beforeRows || [], transaction)
  const warnings = [
    ...new Set([
      ...((transaction.warnings || []) as string[]),
      ...buildWarnings(afterRows),
    ]),
  ]

  return NextResponse.json({
    data: {
      before: beforeRows || [],
      after: afterRows,
      warnings,
    },
  })
}

function simulateImpact(rows: any[], transaction: any) {
  const map = new Map(rows.map(row => [row.partner_id, { ...row }]))
  const apply = (partnerId: string | null | undefined, direction: 1 | -1) => {
    if (!partnerId) return
    const row = map.get(partnerId) || {
      company_id: transaction.company_id,
      partner_id: partnerId,
      display_name: 'Seçili ortak',
      current_share_ratio: 0,
      current_voting_ratio: 0,
      current_profit_ratio: 0,
    }
    row.current_share_ratio = Math.max(0, Number(row.current_share_ratio || 0) + Number(transaction.share_ratio || 0) * direction)
    row.current_voting_ratio = Math.max(0, Number(row.current_voting_ratio || 0) + Number(transaction.voting_ratio || 0) * direction)
    row.current_profit_ratio = Math.max(0, Number(row.current_profit_ratio || 0) + Number(transaction.profit_ratio || 0) * direction)
    map.set(partnerId, row)
  }

  apply(transaction.to_partner_id, 1)
  if (['Pay Devri', 'Kısmi Pay Devri', 'Ortaklıktan Çıkış'].includes(transaction.transaction_type)) {
    apply(transaction.from_partner_id, -1)
  }
  apply(transaction.affected_partner_id, 1)
  return Array.from(map.values())
}

function buildWarnings(rows: any[]) {
  const warnings: string[] = []
  const totalShare = rows.reduce((sum, row) => sum + Number(row.current_share_ratio || 0), 0)
  const totalVoting = rows.reduce((sum, row) => sum + Number(row.current_voting_ratio || 0), 0)
  if (rows.length && Math.abs(totalShare - 100) > 0.01) warnings.push('Toplam hisse 100% değcity')
  if (rows.length && Math.abs(totalVoting - 100) > 0.01) warnings.push('Toplam oy hakkı 100% değcity')
  return warnings
}
