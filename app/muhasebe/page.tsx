import { muhasebePageContract } from '@/contracts/pages/generated/muhasebe.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const muhasebeContractReady = requirePageContract(muhasebePageContract)
void muhasebeContractReady

import { redirect } from 'next/navigation'

export default function MuhasebeRedirect() {
  redirect('/app/muhasebe')
}
