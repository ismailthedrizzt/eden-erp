import 'server-only'

import { createServiceClient } from '@/lib/supabase/server'
import { syncMasterContact } from '@/lib/identity/masterContact'
import { EntityBankAccountsService } from '@/lib/modules/entity-bank-accounts/entityBankAccounts.service'
import {
  findGlobalOrganizationByIdentity,
  normalizeLegalCountry,
  normalizeLegalTaxNumber,
} from '@/lib/tenancy/companyScopes'
import type { TenantContext } from '@/lib/tenancy/server'
import { errorMessage, isMissingTableError } from './companyErrors'
import { insertCompanyCreatedAsDraftEvent } from './companyLifecycle.service'
import { syncCompanyPublicData, type CompanyPublicDataPayload } from './companyPublicData.service'
import { ensureCompanyRootUnit, insertCompanyPartners, insertCompanyRepresentatives } from './companyRelations.service'

export type CompanyCreatePartialWarning = {
  code: string
  message: string
}

export async function attachCompanyOrganization(
  supabase: ReturnType<typeof createServiceClient>,
  companyData: Record<string, any>
) {
  try {
    if (companyData.organization_id) return companyData

    const country = normalizeLegalCountry(companyData.country || 'TR')
    const taxNumber = normalizeLegalTaxNumber(companyData.tax_number, country)
    const existing = await findGlobalOrganizationByIdentity(supabase, {
      country,
      taxNumber,
      legalName: companyData.trade_name,
      select: 'id',
    })

    const organizationId = existing?.id || (await supabase.from('organizations').insert({
      legal_name: companyData.trade_name,
      short_name: companyData.short_name || null,
      country,
      tax_number: taxNumber,
      registration_number: companyData.trade_registry_number || companyData.mersis_number || null,
      tax_office: companyData.tax_office || null,
      organization_type: companyData.company_type || null,
      metadata_json: { source: 'companies_create' },
    }).select('id').single()).data?.id

    if (!organizationId) throw new Error('Ana kurum kaydı oluşturulamadı.')
    return { ...companyData, organization_id: organizationId }
  } catch (error) {
    throw error instanceof Error ? error : new Error('Şirket ana kurum kaydına bağlanamadı.')
  }
}

export async function runCompanyCreateSideEffects(input: {
  supabase: ReturnType<typeof createServiceClient>
  companyId: string
  companyRow: Record<string, any>
  organizationMasterData: Record<string, any>
  tenantContext: TenantContext
  entityBankAccounts?: Record<string, any>[]
  partners?: Record<string, any>[]
  representatives?: Record<string, any>[]
  publicData: CompanyPublicDataPayload
}) {
  const warnings: CompanyCreatePartialWarning[] = []

  await capturePartial(warnings, 'COMPANY_ORG_UNIT_SAVE_FAILED', 'Organizasyon birimi kaydedilemedi', () =>
    ensureCompanyRootUnit(input.supabase, input.companyId, input.companyRow, input.tenantContext)
  )

  await capturePartial(warnings, 'MASTER_CONTACT_SYNC_FAILED', 'Master kontak senkronize edilemedi', async () => {
    await syncMasterContact(
      input.supabase,
      'organization',
      input.companyRow.organization_id,
      { ...input.companyRow, ...input.organizationMasterData }
    )
    return null
  })

  if (input.entityBankAccounts?.length && input.companyRow.organization_id) {
    await capturePartial(warnings, 'ENTITY_BANK_ACCOUNTS_SAVE_FAILED', 'Banka hesapları kaydedilemedi', async () => {
      await new EntityBankAccountsService(input.supabase as any).syncMany('organization', input.companyRow.organization_id, input.entityBankAccounts || [], null)
      return null
    })
  }

  await capturePartial(warnings, 'PARTNER_SAVE_FAILED', 'Ortaklar kaydedilemedi', () =>
    insertCompanyPartners(input.supabase, input.companyId, input.partners, input.tenantContext)
  )

  await capturePartial(warnings, 'REPRESENTATIVE_SAVE_FAILED', 'Temsilciler kaydedilemedi', () =>
    insertCompanyRepresentatives(input.supabase, input.companyId, input.representatives, input.tenantContext)
  )

  await capturePartial(warnings, 'PUBLIC_SAVE_FAILED', 'Kamu ve tescil bilgileri kaydedilemedi', () =>
    syncCompanyPublicData(input.supabase, input.companyId, input.publicData, input.tenantContext)
  )

  await capturePartial(warnings, 'LIFECYCLE_EVENT_FAILED', 'Yaşam döngüsü olayı kaydedilemedi', () =>
    insertCompanyCreatedAsDraftEvent(input.supabase, input.companyId, input.companyRow, input.tenantContext),
    { ignoreMissingTable: true }
  )

  return { warnings }
}

async function capturePartial(
  warnings: CompanyCreatePartialWarning[],
  code: string,
  label: string,
  operation: () => Promise<any>,
  options: { ignoreMissingTable?: boolean } = {}
) {
  try {
    const error = await operation()
    if (!error) return
    if (options.ignoreMissingTable && isMissingTableError(error)) return
    warnings.push({ code, message: `${label}: ${error.message || code}` })
  } catch (error) {
    warnings.push({ code, message: `${label}: ${errorMessage(error, code)}` })
  }
}
