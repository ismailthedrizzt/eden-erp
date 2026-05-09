import type { BankProviderCredentials, BankProviderSyncInput, BankProviderSyncResult } from './bankIntegration.types'

export interface BankProvider {
  readonly code: string
  readonly displayName: string
  readonly supportsOAuth2: boolean
  sync(input: BankProviderSyncInput): Promise<BankProviderSyncResult>
  refreshCredentials?(credentials: BankProviderCredentials): Promise<BankProviderCredentials>
}
