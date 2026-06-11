import { rootPageContract } from '@/contracts/pages/generated/root.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const rootContractReady = requirePageContract(rootPageContract)
void rootContractReady

import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/app')
}
