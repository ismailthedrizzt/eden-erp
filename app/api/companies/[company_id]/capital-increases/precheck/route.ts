// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: capital
// TARGET_FASTAPI_ENDPOINT: /api/v1/companies/{company_id}/capital-increases/precheck
// NOTES: Contains capital increase precheck logic; Next.js route should become BFF/proxy after Python migration.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { buildCapitalIncreasePrecheck, capitalIncreaseError, ensureCapitalIncreaseAccess } from '../_shared'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id: companyId } = await params
  const supabase = createServiceClient()
  const access = await ensureCapitalIncreaseAccess(request, supabase, companyId, 'companies.view')
  if (access.response) return access.response

  try {
    const precheck = await buildCapitalIncreasePrecheck(supabase, companyId, access.tenantContext)
    if (!precheck.ok && precheck.dependency_code) {
      return capitalIncreaseError(
        precheck.message || 'Sermaye Artirimi icin Ortaklarimiz modulu ve guncel ortaklik dagilimi gereklidir.',
        precheck.dependency_code,
        409,
        precheck.dependency_details || {
          reasons: precheck.blocking_reasons,
          warnings: precheck.warnings,
        }
      )
    }
    return NextResponse.json({ data: precheck }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Sermaye artırımı ön kontrolü yapılamadı',
      code: 'CAPITAL_INCREASE_PRECHECK_FAILED',
    }, { status: 500 })
  }
}
