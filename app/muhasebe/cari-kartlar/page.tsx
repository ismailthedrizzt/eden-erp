import { muhasebeCariKartlarPageContract } from '@/contracts/pages/generated/muhasebe-cari-kartlar.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const muhasebeCariKartlarContractReady = requirePageContract(muhasebeCariKartlarPageContract)
void muhasebeCariKartlarContractReady

import { redirect } from 'next/navigation'

export default function AccountCardsRedirect() {
  redirect('/app/muhasebe/cari-kartlar')
}
