import type { CapitalPaymentMovement, CapitalPaymentSummary, OwnershipTransaction } from './ownershipTransactions.types'

const PAID_MOVEMENT_TYPES = new Set(['Sermaye Ödemesi', 'Sermaye Borcu Mahsubu'])

export class CapitalPaymentReconciliationService {
  static summarize(transaction: Partial<OwnershipTransaction> | null | undefined, movements: CapitalPaymentMovement[] = []): CapitalPaymentSummary {
    const committedCapital = Number(transaction?.committed_capital_amount ?? transaction?.capital_amount ?? 0)
    const paidCapital = movements
      .filter(movement => PAID_MOVEMENT_TYPES.has(movement.movement_type))
      .reduce((sum, movement) => sum + Number(movement.amount || 0), 0)
    const advance = movements
      .filter(movement => movement.movement_type === 'Sermaye Avansı')
      .reduce((sum, movement) => sum + Number(movement.amount || 0), 0)
    const remainingCapitalDebt = Math.max(committedCapital - paidCapital, 0)
    const overpayment = Math.max(paidCapital - committedCapital, 0)
    const hasUnclassifiedOverpayment = overpayment > 0 && !movements.some(movement => movement.capital_relation_type === 'Fazla Ödeme Sınıflandırması')

    return {
      committedCapital,
      paidCapital,
      remainingCapitalDebt,
      overpayment,
      paymentStatus: this.resolveStatus(committedCapital, paidCapital, advance, hasUnclassifiedOverpayment),
    }
  }

  private static resolveStatus(committedCapital: number, paidCapital: number, advance: number, hasUnclassifiedOverpayment: boolean): CapitalPaymentSummary['paymentStatus'] {
    if (hasUnclassifiedOverpayment) return 'Uyuşmazlık / İnceleme Gerekli'
    if (committedCapital <= 0 && advance > 0) return 'Sermaye Avansı Var'
    if (committedCapital <= 0) return 'Taahhüt Yok'
    if (paidCapital <= 0) return 'Ödeme Bekleniyor'
    if (paidCapital < committedCapital) return 'Kısmi Ödendi'
    if (paidCapital === committedCapital) return 'Tam Ödendi'
    return 'Fazla Ödeme Var'
  }
}
