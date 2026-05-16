import type { BankProviderCredentials, BankProviderSyncInput, BankProviderSyncResult } from './bankIntegration.types'

export interface BankProvider {
  readonly code: string
  readonly displayName: string
  readonly supportsOAuth2: boolean
  sync(input: BankProviderSyncInput): Promise<BankProviderSyncResult>
  testConnection?(input: BankProviderSyncInput): Promise<BankProviderTestResult>
  refreshCredentials?(credentials: BankProviderCredentials): Promise<BankProviderCredentials>
}

export interface BankProviderTestResult {
  ok: boolean
  providerStatus: string
  message?: string
  accountCount?: number
}
