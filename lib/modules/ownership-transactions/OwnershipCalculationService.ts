import type { CurrentOwnershipRow, OwnershipTransaction } from './ownershipTransactions.types'

const APPROVED_ACTIVE = new Set(['approved'])

export interface OwnershipCalculationResult {
  current_share_ratio: number
  current_voting_ratio: number
  current_profit_ratio: number
  current_capital_amount: number
  current_share_units: number
  main_owner?: CurrentOwnershipRow
  ultimate_controller?: CurrentOwnershipRow
  rows: CurrentOwnershipRow[]
  warnings: string[]
}

export class OwnershipCalculationService {
  static calculateCurrentOwnership(transactions: OwnershipTransaction[], partnerNames: Record<string, string> = {}): OwnershipCalculationResult {
    const today = new Date().toISOString().slice(0, 10)
    const rows = new Map<string, CurrentOwnershipRow>()

    const getRow = (companyId: string, partnerId: string) => {
      const existing = rows.get(partnerId)
      if (existing) return existing
      const next: CurrentOwnershipRow = {
        company_id: companyId,
        partner_id: partnerId,
        display_name: partnerNames[partnerId] || 'Ortak',
        current_share_ratio: 0,
        current_voting_ratio: 0,
        current_profit_ratio: 0,
        current_capital_amount: 0,
        current_share_units: 0,
        has_veto_right: false,
        has_board_nomination_right: false,
        has_privileged_share: false,
        warnings: [],
      }
      rows.set(partnerId, next)
      return next
    }

    transactions
      .filter(item => APPROVED_ACTIVE.has(item.approval_status) && item.status === 'active' && !item.is_deleted && (item.effective_date || item.transaction_date) <= today)
      .forEach(item => {
        if (item.to_partner_id) {
          this.applyDelta(getRow(item.company_id, item.to_partner_id), item, 1)
        }
        if (item.from_partner_id && ['Pay Devri', 'Kısmi Pay Devri', 'Ortaklıktan Çıkış'].includes(item.transaction_type)) {
          this.applyDelta(getRow(item.company_id, item.from_partner_id), item, -1)
        }
        if (item.affected_partner_id) {
          this.applyDelta(getRow(item.company_id, item.affected_partner_id), item, 1)
        }
      })

    const calculatedRows = Array.from(rows.values()).map(row => ({
      ...row,
      current_share_ratio: Math.max(0, row.current_share_ratio),
      current_voting_ratio: Math.max(0, row.current_voting_ratio),
      current_profit_ratio: Math.max(0, row.current_profit_ratio),
      current_capital_amount: Math.max(0, row.current_capital_amount),
      current_share_units: Math.max(0, row.current_share_units),
    }))

    const warnings = this.buildWarnings(calculatedRows)
    const main_owner = calculatedRows.find(row => row.current_share_ratio > 50 || row.current_voting_ratio > 50)
    const ultimate_controller = main_owner

    return {
      current_share_ratio: calculatedRows.reduce((sum, row) => sum + row.current_share_ratio, 0),
      current_voting_ratio: calculatedRows.reduce((sum, row) => sum + row.current_voting_ratio, 0),
      current_profit_ratio: calculatedRows.reduce((sum, row) => sum + row.current_profit_ratio, 0),
      current_capital_amount: calculatedRows.reduce((sum, row) => sum + row.current_capital_amount, 0),
      current_share_units: calculatedRows.reduce((sum, row) => sum + row.current_share_units, 0),
      main_owner,
      ultimate_controller,
      rows: calculatedRows,
      warnings,
    }
  }

  private static applyDelta(row: CurrentOwnershipRow, item: OwnershipTransaction, direction: 1 | -1) {
    row.current_share_ratio += Number(item.share_ratio || 0) * direction
    row.current_voting_ratio += Number(item.voting_ratio || 0) * direction
    row.current_profit_ratio += Number(item.profit_ratio || 0) * direction
    row.has_veto_right = row.has_veto_right || !!item.has_veto_right
    row.has_board_nomination_right = row.has_board_nomination_right || !!item.has_board_nomination_right
    row.has_privileged_share = row.has_privileged_share || !!item.has_privileged_share
    row.last_transaction_date = item.transaction_date
  }

  private static buildWarnings(rows: CurrentOwnershipRow[]) {
    const warnings: string[] = []
    const totalShare = rows.reduce((sum, row) => sum + row.current_share_ratio, 0)
    const totalVoting = rows.reduce((sum, row) => sum + row.current_voting_ratio, 0)
    if (Math.abs(totalShare - 100) > 0.01) warnings.push('Toplam hisse 100% değil')
    if (Math.abs(totalVoting - 100) > 0.01) warnings.push('Toplam oy hakkı 100% değil')
    return warnings
  }
}
