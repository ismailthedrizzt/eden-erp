import type { SupabaseClient } from '@supabase/supabase-js'
import { SecureCredentialService } from './SecureCredentialService'
import { createBankProvider } from './providerFactory'
import type { BankConnection, BankSyncSummary, ProviderBankTransaction, ProviderCardTransaction } from './bankIntegration.types'

export class BankSyncService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly credentialService = new SecureCredentialService()
  ) {}

  async syncConnection(connectionId: string): Promise<BankSyncSummary> {
    const { data: connection, error } = await this.supabase
      .from('accounting_bank_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('is_deleted', false)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!connection) throw new Error('Bank connection not found.')
    if (connection.status !== 'active') throw new Error('Bank connection is not active.')

    const normalizedConnection = connection as BankConnection
    const credentials = await this.credentialService.getBankCredentials(normalizedConnection.credential_id)
    const provider = createBankProvider(normalizedConnection.provider_code)
    const result = await provider.sync({
      connection: normalizedConnection,
      credentials,
      cursor: normalizedConnection.sync_cursor,
    })

    const bankTransactionsUpserted = await this.upsertBankTransactions(normalizedConnection, result.bankTransactions)
    const cardTransactionsUpserted = await this.upsertCardTransactions(normalizedConnection, result.cardTransactions)

    await this.supabase
      .from('accounting_bank_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: result.providerStatus || 'success',
        sync_cursor: result.nextCursor || normalizedConnection.sync_cursor || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    return {
      connectionId,
      providerCode: normalizedConnection.provider_code,
      bankTransactionsUpserted,
      cardTransactionsUpserted,
      nextCursor: result.nextCursor || null,
    }
  }

  private async upsertBankTransactions(connection: BankConnection, transactions: ProviderBankTransaction[]) {
    if (transactions.length === 0) return 0

    const rows = transactions.map(transaction => ({
      connection_id: connection.id,
      company_id: connection.company_id || null,
      provider_code: connection.provider_code,
      external_account_id: transaction.externalAccountId || null,
      account_iban: transaction.accountIban || null,
      account_currency: transaction.accountCurrency || transaction.currency,
      external_transaction_id: transaction.externalTransactionId,
      transaction_date: transaction.transactionDate,
      value_date: transaction.valueDate || null,
      description: transaction.description || null,
      counterparty_name: transaction.counterpartyName || null,
      counterparty_iban: transaction.counterpartyIban || null,
      direction: transaction.direction,
      amount: transaction.amount,
      currency: transaction.currency,
      balance_after: transaction.balanceAfter || null,
      raw_provider_payload: transaction.raw || {},
      updated_at: new Date().toISOString(),
    }))

    const { error } = await this.supabase
      .from('accounting_bank_transactions')
      .upsert(rows, { onConflict: 'connection_id,external_transaction_id' })

    if (error) throw new Error(error.message)
    return rows.length
  }

  private async upsertCardTransactions(connection: BankConnection, transactions: ProviderCardTransaction[]) {
    if (transactions.length === 0) return 0

    const rows = transactions.map(transaction => ({
      connection_id: connection.id,
      company_id: connection.company_id || null,
      provider_code: connection.provider_code,
      external_card_id: transaction.externalCardId || null,
      masked_card_number: transaction.maskedCardNumber || null,
      card_currency: transaction.cardCurrency || transaction.currency,
      external_transaction_id: transaction.externalTransactionId,
      transaction_date: transaction.transactionDate,
      provision_date: transaction.provisionDate || null,
      merchant_name: transaction.merchantName || null,
      merchant_category: transaction.merchantCategory || null,
      description: transaction.description || null,
      direction: transaction.direction || 'debit',
      amount: transaction.amount,
      currency: transaction.currency,
      installment_count: transaction.installmentCount || null,
      raw_provider_payload: transaction.raw || {},
      updated_at: new Date().toISOString(),
    }))

    const { error } = await this.supabase
      .from('accounting_card_transactions')
      .upsert(rows, { onConflict: 'connection_id,external_transaction_id' })

    if (error) throw new Error(error.message)
    return rows.length
  }
}
