export interface PreAccountingMatchService {
  tryMatchInvoice(movementId: string): Promise<void>
  tryMatchBankMovement(movementId: string): Promise<void>
  suggestCounterparty(input: string): Promise<Array<{ id: string; label: string; kind: 'person' | 'organization' }>>
  calculateRowHealth(movementId: string): Promise<string>
}

export const preAccountingMatchService: PreAccountingMatchService = {
  async tryMatchInvoice() {
    // Future: match e-fatura / e-arsiv lifecycle records.
  },
  async tryMatchBankMovement() {
    // Future: match bank, card and cash movements.
  },
  async suggestCounterparty() {
    // Future: rank master identities and role records by similarity.
    return []
  },
  async calculateRowHealth() {
    // Future: inspect document, invoice and bank match states.
    return 'manual_review_required'
  },
}
