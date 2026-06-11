import { ikPersonelPageContract } from '@/contracts/pages/generated/ik-personel.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const ikPersonelContractReady = requirePageContract(ikPersonelPageContract)
void ikPersonelContractReady

import { redirect } from 'next/navigation'

export default function LegacyPersonelPage() {
  redirect('/app/ik/employees')
}
