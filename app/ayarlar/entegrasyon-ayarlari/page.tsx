import { ayarlarEntegrasyonAyarlariPageContract } from '@/contracts/pages/generated/ayarlar-entegrasyon-ayarlari.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const ayarlarEntegrasyonAyarlariContractReady = requirePageContract(ayarlarEntegrasyonAyarlariPageContract)
void ayarlarEntegrasyonAyarlariContractReady

import { redirect } from 'next/navigation'

export default function IntegrationSettingsRedirect() {
  redirect('/app/sistem/entegrasyon-ayarlari')
}
