import { portalPageContract } from '@/contracts/pages/generated/portal.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const portalContractReady = requirePageContract(portalPageContract)
void portalContractReady

import { redirect } from 'next/navigation'

export default function PortalIndexPage() {
  redirect('/portal/dashboard')
}

