import { muhasebeCariHareketlerPageContract } from '@/contracts/pages/generated/muhasebe-cari-hareketler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const muhasebeCariHareketlerContractReady = requirePageContract(muhasebeCariHareketlerPageContract)
void muhasebeCariHareketlerContractReady

import { redirect } from 'next/navigation'

export default function CariTransactionsRedirect() {
  redirect('/app/muhasebe/cari-hareketler')
}
