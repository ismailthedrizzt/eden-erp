import { muhasebeBankaKartHareketleriPageContract } from '@/contracts/pages/generated/muhasebe-banka-kart-hareketleri.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const muhasebeBankaKartHareketleriContractReady = requirePageContract(muhasebeBankaKartHareketleriPageContract)
void muhasebeBankaKartHareketleriContractReady

import { redirect } from 'next/navigation'

export default function BankCardMovementsRedirect() {
  redirect('/app/muhasebe/banka-kart-hareketleri')
}
