import { NextRequest, NextResponse } from 'next/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { SecureCredentialService } from '@/lib/modules/accounting/bank-integration/SecureCredentialService'
import { createBankProvider } from '@/lib/modules/accounting/bank-integration/providerFactory'
import type { BankConnection, BankProviderCredentials } from '@/lib/modules/accounting/bank-integration/bankIntegration.types'
import { requirePermission } from '@/lib/security/serverPermissions'
import { createServiceClient } from '@/lib/supabase/server'

const AUTOMATION_PROVIDERS = new Set(['garanti'])

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankConnectionsSync)
  if (permission instanceof NextResponse) return permission

  const body = await request.json()
  const providerCode = String(body.provider_code || '').toLowerCase()

  if (!AUTOMATION_PROVIDERS.has(providerCode)) {
    return NextResponse.json({ error: 'Bu banka için otomasyon henüz tanımlı değcity.', code: 'AUTOMATION_NOT_AVAILABLE' }, { status: 400 })
  }

  try {
    const provider = createBankProvider(providerCode)
    const credentials = await resolveCredentials(body)
    const connection = {
      id: body.id || 'automation-preview',
      company_id: body.company_id || null,
      bank_name: body.bank_name || provider.displayName,
      provider_code: providerCode,
      provider_display_name: provider.displayName,
      connection_type: 'bank',
      status: 'active',
      base_url: body.base_url || credentials.apiBaseUrl || null,
      environment: body.environment || 'sandbox',
    } as BankConnection

    const result = await provider.sync({ connection, credentials, cursor: null })
    return NextResponse.json({
      data: {
        providerCode,
        bankName: connection.bank_name,
        connectionStatus: 'connected',
        accounts: result.bankAccounts || [],
        providerStatus: result.providerStatus || 'success',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Banka otomasyonu çalıştırılamadı.'
    return NextResponse.json({ error: message, code: 'BANK_AUTOMATION_FAILED' }, { status: 500 })
  }
}

async function resolveCredentials(body: Record<string, any>): Promise<BankProviderCredentials> {
  const inline = body.credentials || {}
  let stored: BankProviderCredentials = {}

  if (body.credential_id) {
    stored = await new SecureCredentialService().getBankCredentials(String(body.credential_id))
  }

  return {
    ...stored,
    ...removeEmpty({
      clientId: inline.clientId,
      clientSecret: inline.clientSecret,
      tokenEndpoint: inline.tokenEndpoint,
      apiBaseUrl: body.base_url || inline.apiBaseUrl,
      redirectUri: inline.redirectUri || inline.callbackUrl,
      consentId: inline.consentId,
      extra: {
        ...(stored.extra || {}),
        ...(inline.extra || {}),
        redirectUri: inline.redirectUri || inline.callbackUrl || stored.extra?.redirectUri,
        tokenAuthMethod: inline.tokenAuthMethod || stored.extra?.tokenAuthMethod,
        accounts: buildAccountFilters(inline),
      },
    }),
  }
}

function buildAccountFilters(inline: Record<string, any>) {
  if (!inline.unitNum && !inline.accountNum && !inline.IBAN) return undefined
  return [{
    unitNum: inline.unitNum,
    accountNum: inline.accountNum,
    IBAN: inline.IBAN,
  }]
}

function removeEmpty<T extends Record<string, any>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== '')) as T
}
