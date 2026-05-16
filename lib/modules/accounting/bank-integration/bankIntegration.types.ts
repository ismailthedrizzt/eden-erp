export type BankProviderCode =
  | 'generic'
  | 'garanti'
  | 'isbankasi'
  | 'akbank'
  | 'yapikredi'
  | 'qnb'
  | 'ziraat'

export type BankTransactionDirection = 'debit' | 'credit'
export type BankMatchStatus = 'waiting' | 'matched' | 'mismatch_amount' | 'mismatch_date' | 'mismatch_counterparty' | 'not_found' | 'manual_match' | 'ignored'

export interface BankConnection {
  id: string
  company_id?: string | null
  bank_name?: string | null
  provider_code: BankProviderCode | string
  provider_display_name: string
  connection_name?: string | null
  connection_type: 'bank' | 'card' | 'bank_and_card'
  credential_id?: string | null
  status: 'active' | 'paused' | 'revoked' | 'error'
  sync_cursor?: string | null
  metadata_json?: Record<string, unknown>
  base_url?: string | null
  environment?: string | null
}

export interface BankProviderCredentials {
  clientId?: string
  clientSecret?: string
  accessToken?: string
  refreshToken?: string
  tokenEndpoint?: string
  apiBaseUrl?: string
  redirectUri?: string
  scopes?: string[]
  consentId?: string
  extra?: Record<string, unknown>
}

export interface ProviderBankAccount {
  externalAccountId?: string | null
  iban?: string | null
  accountNo?: string | null
  accountName?: string | null
  branchCode?: string | null
  branchName?: string | null
  currency: string
  accountType?: string | null
  lastBalance?: number | null
  availableBalance?: number | null
  status?: string | null
  raw?: Record<string, unknown>
}

export interface BankProviderSyncInput {
  connection: BankConnection
  credentials: BankProviderCredentials
  cursor?: string | null
}

export interface ProviderBankTransaction {
  externalTransactionId: string
  externalAccountId?: string | null
  accountIban?: string | null
  accountCurrency?: string | null
  transactionDate: string
  valueDate?: string | null
  description?: string | null
  counterpartyName?: string | null
  counterpartyIban?: string | null
  direction: BankTransactionDirection
  amount: number
  currency: string
  balanceAfter?: number | null
  raw?: Record<string, unknown>
}

export interface ProviderCardTransaction {
  externalTransactionId: string
  externalCardId?: string | null
  maskedCardNumber?: string | null
  cardCurrency?: string | null
  transactionDate: string
  provisionDate?: string | null
  merchantName?: string | null
  merchantCategory?: string | null
  description?: string | null
  direction?: BankTransactionDirection
  amount: number
  currency: string
  installmentCount?: number | null
  raw?: Record<string, unknown>
}

export interface BankProviderSyncResult {
  bankAccounts?: ProviderBankAccount[]
  bankTransactions: ProviderBankTransaction[]
  cardTransactions: ProviderCardTransaction[]
  nextCursor?: string | null
  providerStatus?: string
}

export interface BankSyncSummary {
  connectionId: string
  providerCode: string
  bankAccountsUpserted?: number
  bankTransactionsUpserted: number
  cardTransactionsUpserted: number
  nextCursor?: string | null
}

export interface BankAndCardMovementRow {
  id: string
  source_type: 'bank' | 'card'
  connection_id: string
  provider_code: string
  external_transaction_id: string
  transaction_date: string
  description?: string | null
  counterparty_name?: string | null
  merchant_name?: string | null
  direction: BankTransactionDirection
  amount: number
  currency: string
  match_status: BankMatchStatus
  linked_movement_id?: string | null
}
