import { muhasebeHesapVeKartHareketleriPageContract } from '@/contracts/pages/generated/muhasebe-hesap-ve-kart-hareketleri.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const muhasebeHesapVeKartHareketleriContractReady = requirePageContract(muhasebeHesapVeKartHareketleriPageContract)
void muhasebeHesapVeKartHareketleriContractReady

import { redirect } from 'next/navigation'

export default function FinancialInstitutionMovementsRedirectPage() {
  redirect('/app/muhasebe/hesap-ve-kart-hareketleri')
}
