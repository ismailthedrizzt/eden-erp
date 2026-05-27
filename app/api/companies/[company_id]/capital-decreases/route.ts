// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: capital
// TARGET_FASTAPI_ENDPOINT: /api/v1/companies/{company_id}/capital-decreases
// NOTES: Contains capital decrease operation logic; move to Python company capital and ownership services.

import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { capitalDecreaseError, ensureCapitalDecreaseAccess } from './_shared'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ company_id: string }> }
) {
  const { company_id: companyId } = await params
  const supabase = createServiceClient()
  const access = await ensureCapitalDecreaseAccess(request, supabase, companyId, 'companies.edit')
  if (access.response) return access.response

  return capitalDecreaseError(
    'Sermaye azaltımı operasyonu hazırlık aşamasında. Bu işlem şu anda kayıt veya ortaklık dağılımı değiştirmez.',
    'CAPITAL_DECREASE_NOT_ENABLED',
    409,
    {
      operation_enabled: false,
      company_id: companyId,
      next_step: 'Belge ve onay akışı tamamlandığında ownership transaction üzerinden açılacaktır.',
    }
  )
}
