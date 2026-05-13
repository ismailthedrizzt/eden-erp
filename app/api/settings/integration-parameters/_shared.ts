import { cleanPayload } from '../../accounting/_banking'

export function normalizeIntegrationParameter(body: Record<string, any>) {
  return cleanPayload({
    integration_name: body.integration_name,
    bank_name: body.bank_name || null,
    provider_code: body.provider_code || null,
    provider_name: body.provider_name || null,
    integration_type: body.integration_type || 'api',
    environment: body.environment || 'sandbox',
    base_url: body.base_url || null,
    token_url: body.token_url || null,
    connection_status: body.connection_status || 'not_connected',
    credential_status: body.credential_status || 'not_configured',
    api_status: body.api_status || null,
    requires_certificate: !!body.requires_certificate,
    ip_whitelist_note: body.ip_whitelist_note || null,
    error_message: body.error_message || null,
    status: body.status || 'active',
    updated_at: new Date().toISOString(),
  })
}
