import { portalDashboardPageContract } from '@/contracts/pages/generated/portal-dashboard.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const portalDashboardContractReady = requirePageContract(portalDashboardPageContract)
void portalDashboardContractReady

import { PortalDashboardPage } from '@/components/portal/CustomerPortalWorkspace'

export default function CustomerPortalDashboardRoute() {
  return <PortalDashboardPage />
}

