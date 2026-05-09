import type { BankProvider } from './BankProvider'
import type { BankProviderCredentials, BankProviderSyncInput, BankProviderSyncResult } from './bankIntegration.types'

export class GenericBankProvider implements BankProvider {
  readonly code: string = 'generic'
  readonly displayName: string = 'Generic Bank Provider'
  readonly supportsOAuth2 = true

  async refreshCredentials(credentials: BankProviderCredentials): Promise<BankProviderCredentials> {
    if (!credentials.refreshToken || !credentials.tokenEndpoint || !credentials.clientId || !credentials.clientSecret) {
      return credentials
    }

    // OAuth2 skeleton only. Bank-specific token response differences belong in future adapters.
    return credentials
  }

  async sync(_input: BankProviderSyncInput): Promise<BankProviderSyncResult> {
    return {
      bankTransactions: [],
      cardTransactions: [],
      nextCursor: null,
      providerStatus: 'generic_provider_ready',
    }
  }
}
