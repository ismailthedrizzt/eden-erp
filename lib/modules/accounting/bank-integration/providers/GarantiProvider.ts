import { GenericBankProvider } from '../GenericBankProvider'
import type {
  BankProviderCredentials,
  BankProviderSyncInput,
  BankProviderSyncResult,
  ProviderBankAccount,
} from '../bankIntegration.types'

type GarantiBalance = {
  type?: string
  Amount?: string
}

type GarantiAccount = {
  balances?: GarantiBalance[]
  customerNum?: number
  productName?: string
  accountType?: string
  accountMainType?: string
  accountSubType?: string
  unitNum?: number
  accountNum?: number
  IBAN?: string
  currencyCode?: string
  accountInstanceId?: string
  lastActivityDate?: string
  status?: string
}

type GarantiAccountInformationResponse = {
  result?: {
    returnCode?: number
    reasonCode?: number
    messageText?: string
    code?: number
    info?: string
  }
  accounts?: GarantiAccount[]
}

export class GarantiProvider extends GenericBankProvider {
  readonly code = 'garanti'
  readonly displayName = 'Garanti BBVA'

  async sync(input: BankProviderSyncInput): Promise<BankProviderSyncResult> {
    const apiBaseUrl = normalizeBaseUrl(input.connection.base_url || input.credentials.apiBaseUrl || 'https://apis.garantibbva.com.tr:443')
    const token = await this.getOneTimeAccessToken(input.credentials, apiBaseUrl)
    const consentId = readText(input.credentials.consentId) || readText(input.credentials.extra?.consentId)

    if (!consentId) {
      throw new Error('Garanti BBVA Account Information senkronu için consentId zorunludur.')
    }

    const accountFilters = readGarantiAccountFilters(input.credentials)
    const accounts = accountFilters.length > 0
      ? await Promise.all(accountFilters.map(filter => this.getAccountInformation(apiBaseUrl, token, consentId, filter)))
      : [await this.getAccountInformation(apiBaseUrl, token, consentId)]

    return {
      bankAccounts: accounts.flat(),
      bankTransactions: [],
      cardTransactions: [],
      nextCursor: null,
      providerStatus: 'account_information_synced',
    }
  }

  private async getOneTimeAccessToken(credentials: BankProviderCredentials, apiBaseUrl: string) {
    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error('Garanti BBVA OAuth clientId ve clientSecret zorunludur.')
    }

    const tokenEndpoint = credentials.tokenEndpoint || `${apiBaseUrl}/oauth2/token`
    const body = new URLSearchParams()
    body.set('grant_type', 'client_credentials')
    if (credentials.scopes?.length) body.set('scope', credentials.scopes.join(' '))

    const tokenAuthMethod = readText(credentials.extra?.tokenAuthMethod) || 'body'
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    }

    if (tokenAuthMethod === 'basic') {
      headers.Authorization = `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64')}`
    } else {
      body.set('client_id', credentials.clientId)
      body.set('client_secret', credentials.clientSecret)
    }

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
    })

    const payload = await readJson(response)
    if (!response.ok) {
      throw new Error(`Garanti BBVA token alınamadı: ${extractProviderMessage(payload) || response.statusText}`)
    }

    const token = readText(payload?.access_token)
    if (!token) throw new Error('Garanti BBVA token yanıtında access_token bulunamadı.')
    return token
  }

  private async getAccountInformation(
    apiBaseUrl: string,
    accessToken: string,
    consentId: string,
    filter: Record<string, string | number | undefined> = {}
  ): Promise<ProviderBankAccount[]> {
    const response = await fetch(`${apiBaseUrl}/balancesandmovements/accountinformation/account/v1/getaccountinformation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        consentId,
        ...cleanFilter(filter),
      }),
      cache: 'no-store',
    })

    const payload = await readJson(response) as GarantiAccountInformationResponse
    const returnCode = payload?.result?.returnCode || payload?.result?.code

    if (!response.ok || (returnCode && returnCode !== 200)) {
      throw new Error(`Garanti BBVA hesap bilgisi alınamadı: ${extractProviderMessage(payload) || response.statusText}`)
    }

    return (payload.accounts || []).map(mapGarantiAccount)
  }
}

function mapGarantiAccount(account: GarantiAccount): ProviderBankAccount {
  const balances = new Map((account.balances || []).map(balance => [balance.type, parseAmount(balance.Amount)]))
  const accountNo = account.accountNum == null ? null : String(account.accountNum)
  const branchCode = account.unitNum == null ? null : String(account.unitNum)
  const iban = normalizeNullableText(account.IBAN)

  return {
    externalAccountId: account.accountInstanceId || [branchCode, accountNo, iban].filter(Boolean).join(':') || null,
    iban,
    accountNo,
    accountName: normalizeNullableText(account.productName) || iban || accountNo || 'Garanti BBVA Hesabı',
    branchCode,
    branchName: branchCode ? `Şube ${branchCode}` : null,
    currency: normalizeCurrency(account.currencyCode),
    accountType: mapAccountType(account),
    lastBalance: balances.get('Balance') ?? null,
    availableBalance: balances.get('AvailableBalance') ?? null,
    status: account.status === 'A' ? 'active' : 'passive',
    raw: account as Record<string, unknown>,
  }
}

function mapAccountType(account: GarantiAccount) {
  if (account.accountType === 'A') return 'vadesiz'
  return account.accountType || account.accountMainType || account.accountSubType || 'vadesiz'
}

function normalizeCurrency(currency?: string) {
  const normalized = (currency || 'TRY').trim().toUpperCase()
  if (normalized === 'TL') return 'TRY'
  return normalized || 'TRY'
}

function parseAmount(value?: string) {
  if (value == null) return null
  const amount = Number(String(value).replace(',', '.'))
  return Number.isFinite(amount) ? amount : null
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '')
}

function cleanFilter(filter: Record<string, string | number | undefined>) {
  return Object.fromEntries(Object.entries(filter).filter(([, value]) => value !== undefined && value !== null && value !== ''))
}

function readGarantiAccountFilters(credentials: BankProviderCredentials) {
  const filters = credentials.extra?.accounts || credentials.extra?.accountFilters
  if (!Array.isArray(filters)) return []

  return filters
    .filter((filter): filter is Record<string, unknown> => !!filter && typeof filter === 'object')
    .map(filter => ({
      unitNum: readNumber(filter.unitNum),
      accountNum: readNumber(filter.accountNum),
      IBAN: readText(filter.IBAN || filter.iban),
    }))
}

function readNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function readText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeNullableText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

async function readJson(response: Response): Promise<any> {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

function extractProviderMessage(payload: any) {
  return payload?.result?.messageText || payload?.result?.info || payload?.error_description || payload?.error
}
