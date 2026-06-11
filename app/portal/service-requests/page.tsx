import { portalServiceRequestsPageContract } from '@/contracts/pages/generated/portal-service-requests.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const portalServiceRequestsContractReady = requirePageContract(portalServiceRequestsPageContract)
void portalServiceRequestsContractReady

import { PortalServiceRequestsPage } from '@/components/portal/CustomerPortalWorkspace'

export default function CustomerPortalServiceRequestsRoute() {
  return <PortalServiceRequestsPage />
}

