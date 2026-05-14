import type { SupabaseClient } from '@supabase/supabase-js'
import { SecureCredentialService } from './SecureCredentialService'
import { createBankProvider } from './providerFactory'
import type { BankConnection, BankSyncSummary, ProviderBankAccount, ProviderBankTransaction, ProviderCardTransaction } from './bankIntegration.types'

const BANK_SYNC_CONNECTION_SELECT = 'id,company_id,bank_name,provider_code,integration_type,credential_id,status,base_url,environment'

export class BankSyncService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly credentialService = new SecureCredentialService()
  ) {}

  async syncConnection(connectionId: string): Promise<BankSyncSummary> {
    const { data: connection, error } = await this.supabase
      .from('bank_connections')
      .select(BANK_SYNC_CONNECTION_SELECT)
      .eq('id', connectionId)
      .eq('is_deleted', false)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }
    if (!connection) throw new Error('Banka bağlantısı bulunamadı.')
    if (connection.status !== 'active') throw new Error('Banka bağlantısı aktif değil.')
    if (!connection.credential_id) throw new Error('Banka bağlantısı için credential_id tanımlanmalıdır.')

    const normalizedConnection = {
      ...connection,
      provider_display_name: connection.bank_name,
      connection_type: connection.integration_type === 'card' ? 'card' : 'bank',
    } as BankConnection
    const credentials = await this.credentialService.getBankCredentials(connection.credential_id)
    const provider = createBankProvider(connection.provider_code)
    const result = await provider.sync({
      connection: normalizedConnection,
      credentials: {
        ...credentials,
        apiBaseUrl: connection.base_url || credentials.apiBaseUrl,
      },
      cursor: null,
    })

    const bankAccountsUpserted = await this.upsertBankAccounts(normalizedConnection, result.bankAccounts || [])
    const bankTransactionsUpserted = await this.upsertBankTransactions(normalizedConnection, result.bankTransactions)
    const cardTransactionsUpserted = await this.upsertCardTransactions(normalizedConnection, result.cardTransactions)

    await this.supabase
      .from('bank_connections')
      .update({
        connection_status: 'connected',
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    return {
      connectionId,
      providerCode: normalizedConnection.provider_code,
      bankAccountsUpserted,
      bankTransactionsUpserted,
      cardTransactionsUpserted,
      nextCursor: null,
    }
  }

  private async upsertBankAccounts(connection: BankConnection, accounts: ProviderBankAccount[]) {
    if (accounts.length === 0) return 0

    const now = new Date().toISOString()
    const { data: existingRows, error } = await this.supabase
      .from('bank_accounts')
      .select('id,iban,account_no')
      .eq('bank_connection_id', connection.id)
      .eq('is_deleted', false)

    if (error) {
      if (error.code === '42P01') return 0
      throw new Error(error.message)
    }

    const existingByKey = new Map<string, any>()
    ;(existingRows || []).forEach((row: any) => {
      for (const key of bankAccountKeys(row.iban, row.account_no)) existingByKey.set(key, row)
    })

    let count = 0
    for (const account of accounts) {
      const keys = bankAccountKeys(account.iban, account.accountNo)
      const existing = keys.map(key => existingByKey.get(key)).find(Boolean)
      const row = {
        company_id: connection.company_id || null,
        bank_connection_id: connection.id,
        iban: account.iban || null,
        account_no: account.accountNo || null,
        account_name: account.accountName || account.iban || account.accountNo || `${connection.bank_name || connection.provider_code} Hesabı`,
        branch_name: account.branchName || null,
        branch_code: account.branchCode || null,
        currency: account.currency || 'TRY',
        account_type: account.accountType || 'vadesiz',
        last_balance: account.lastBalance ?? account.availableBalance ?? null,
        last_sync_at: now,
        status: account.status === 'passive' ? 'passive' : 'active',
        updated_at: now,
      }

      const result = existing
        ? await this.supabase.from('bank_accounts').update(row).eq('id', existing.id)
        : await this.supabase.from('bank_accounts').insert({ ...row, created_at: now })

      if (result.error) throw new Error(result.error.message)
      count += 1
    }

    return count
  }

  private async upsertBankTransactions(connection: BankConnection, transactions: ProviderBankTransaction[]) {
    if (transactions.length === 0) return 0

    const rows = transactions.map(transaction => ({
      company_id: connection.company_id || null,
      bank_connection_id: connection.id,
      bank_account_id: null,
      source_type: 'bank_account',
      movement_type: transaction.direction === 'credit' ? 'incoming_transfer' : 'outgoing_transfer',
      movement_date: transaction.transactionDate,
      value_date: transaction.valueDate || null,
      description: transaction.description || null,
      counterparty_name: transaction.counterpartyName || null,
      counterparty_iban: transaction.counterpartyIban || null,
      reference_no: transaction.externalTransactionId,
      amount: transaction.amount,
      currency: transaction.currency,
      direction: transaction.direction,
      source: connection.provider_code,
      external_transaction_id: transaction.externalTransactionId,
      raw_data: transaction.raw || {},
      updated_at: new Date().toISOString(),
    }))

    const { error } = await this.supabase
      .from('financial_institution_movements')
      .upsert(rows, { onConflict: 'bank_connection_id,external_transaction_id' })

    if (error) throw new Error(error.message)
    return rows.length
  }

  private async upsertCardTransactions(connection: BankConnection, transactions: ProviderCardTransaction[]) {
    if (transactions.length === 0) return 0

    const rows = transactions.map(transaction => ({
      company_id: connection.company_id || null,
      bank_connection_id: connection.id,
      bank_card_id: null,
      source_type: 'card',
      movement_type: 'card_transaction',
      movement_date: transaction.transactionDate,
      value_date: transaction.provisionDate || null,
      description: transaction.description || transaction.merchantName || null,
      counterparty_name: transaction.merchantName || null,
      reference_no: transaction.externalTransactionId,
      amount: transaction.amount,
      currency: transaction.currency,
      direction: transaction.direction || 'debit',
      source: connection.provider_code,
      external_transaction_id: transaction.externalTransactionId,
      raw_data: transaction.raw || {},
      updated_at: new Date().toISOString(),
    }))

    const { error } = await this.supabase
      .from('financial_institution_movements')
      .upsert(rows, { onConflict: 'bank_connection_id,external_transaction_id' })

    if (error) throw new Error(error.message)
    return rows.length
  }
}

function bankAccountKeys(iban?: string | null, accountNo?: string | null) {
  return [
    iban ? `iban:${iban.trim().toUpperCase()}` : null,
    accountNo ? `account:${accountNo.trim()}` : null,
  ].filter(Boolean) as string[]
}
