import { appIkPersonelEklePageContract } from '@/contracts/pages/generated/app-ik-personel-ekle.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appIkPersonelEkleContractReady = requirePageContract(appIkPersonelEklePageContract)
void appIkPersonelEkleContractReady

import { redirect } from 'next/navigation'

export default function LegacyPersonelEklePage() {
  redirect('/app/ik/employees')
}
