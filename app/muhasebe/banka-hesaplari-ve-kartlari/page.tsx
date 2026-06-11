import { muhasebeBankaHesaplariVeKartlariPageContract } from '@/contracts/pages/generated/muhasebe-banka-hesaplari-ve-kartlari.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const muhasebeBankaHesaplariVeKartlariContractReady = requirePageContract(muhasebeBankaHesaplariVeKartlariPageContract)
void muhasebeBankaHesaplariVeKartlariContractReady

import { redirect } from 'next/navigation'

export default function BankAccountsCardsRedirectPage() {
  redirect('/app/muhasebe/banka-hesaplari-ve-kartlari')
}
