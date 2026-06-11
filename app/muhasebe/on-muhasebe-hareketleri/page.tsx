import { muhasebeOnMuhasebeHareketleriPageContract } from '@/contracts/pages/generated/muhasebe-on-muhasebe-hareketleri.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const muhasebeOnMuhasebeHareketleriContractReady = requirePageContract(muhasebeOnMuhasebeHareketleriPageContract)
void muhasebeOnMuhasebeHareketleriContractReady

import { redirect } from 'next/navigation'

export default function PreAccountingRedirect() {
  redirect('/app/muhasebe/on-muhasebe-hareketleri')
}
