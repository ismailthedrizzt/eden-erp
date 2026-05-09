import type { BankProviderCredentials } from './bankIntegration.types'

export class SecureCredentialService {
  async getBankCredentials(credentialId: string): Promise<BankProviderCredentials> {
    const envKey = `BANK_CREDENTIAL_${credentialId.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase()}`
    const raw = process.env[envKey]

    if (!raw) {
      throw new Error('Bank credential could not be found in secure credential storage.')
    }

    try {
      return JSON.parse(raw) as BankProviderCredentials
    } catch {
      throw new Error('Bank credential payload is not valid JSON.')
    }
  }
}
