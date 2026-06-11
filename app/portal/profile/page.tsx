import { portalProfilePageContract } from '@/contracts/pages/generated/portal-profile.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const portalProfileContractReady = requirePageContract(portalProfilePageContract)
void portalProfileContractReady

import { PortalProfilePage } from '@/components/portal/CustomerPortalWorkspace'

export default function CustomerPortalProfileRoute() {
  return <PortalProfilePage />
}

