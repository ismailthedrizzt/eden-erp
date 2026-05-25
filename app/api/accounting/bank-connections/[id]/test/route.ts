import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACCOUNTING_PERMISSIONS } from '@/lib/modules/accounting/shared/accounting.permissions'
import { SecureCredentialService } from '@/lib/modules/accounting/bank-integration/SecureCredentialService'
import { createBankProvider } from '@/lib/modules/accounting/bank-integration/providerFactory'
import type { BankConnection } from '@/lib/modules/accounting/bank-integration/bankIntegration.types'
import { requirePermission } from '@/lib/security/serverPermissions'
import { BANK_CONNECTION_SELECT } from '../../../bank-accounts-cards/_shared'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, ACCOUNTING_PERMISSIONS.bankConnectionsTest)
  if (permission instanceof NextResponse) return permission

  const { data: connection, error: fetchError } = await supabase
    .from('bank_connections')
    .select(BANK_CONNECTION_SELECT)
    .eq('id', id)
    .eq('is_deleted', false)
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!connection) return NextResponse.json({ error: 'Banka bağlantısı bulunamadı.', code: 'BANK_CONNECTION_NOT_FOUND' }, { status: 404 })
  const connectionRow = connection as Record<string, any>
  if (!connectionRow.credential_id) return NextResponse.json({ error: 'Banka bağlantısı için credential_id tanımlanmalıdır.', code: 'CREDENTIAL_REQUIRED' }, { status: 400 })

  try {
    const provider = createBankProvider(connectionRow.provider_code)
    const credentials = await new SecureCredentialService().getBankCredentials(connectionRow.credential_id)
    const normalizedConnection = {
      ...connectionRow,
      provider_display_name: connectionRow.bank_name || provider.displayName,
      connection_type: connectionRow.integration_type === 'card' ? 'card' : 'bank',
      status: connectionRow.status || 'active',
    } as BankConnection

    const result = provider.testConnection
      ? await provider.testConnection({
        connection: normalizedConnection,
        credentials: {
          ...credentials,
          apiBaseUrl: connectionRow.base_url || credentials.apiBaseUrl,
        },
        cursor: null,
      })
      : { ok: true, providerStatus: 'provider_test_not_implemented', message: 'Provider test metodu tanımlı değil.', accountCount: 0 }

    const { data, error } = await supabase
      .from('bank_connections')
      .update({
        connection_status: result.ok ? 'connected' : 'error',
        last_test_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: permission.userId,
        notes: appendNote(connectionRow.notes, result.message),
      })
      .eq('id', id)
      .select(BANK_CONNECTION_SELECT)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({
      data,
      message: result.message || 'Bağlantı testi tamamlandı. Credential detayları frontend tarafına gönderilmedi.',
      providerStatus: result.providerStatus,
      accountCount: result.accountCount || 0,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bağlantı testi tamamlanamadı.'
    const { data } = await supabase
      .from('bank_connections')
      .update({
        connection_status: 'error',
        last_test_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: permission.userId,
        notes: appendNote(connectionRow.notes, message),
      })
      .eq('id', id)
      .select(BANK_CONNECTION_SELECT)
      .single()

    return NextResponse.json({ data, error: message, code: 'BANK_CONNECTION_TEST_FAILED' }, { status: 500 })
  }
}

function appendNote(existing: string | null | undefined, note: string | null | undefined) {
  if (!note) return existing || null
  const line = `[${new Date().toISOString()}] ${note}`
  return [existing, line].filter(Boolean).join('\n')
}
