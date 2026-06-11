import { portalServiceRecordsPageContract } from '@/contracts/pages/generated/portal-service-records.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const portalServiceRecordsContractReady = requirePageContract(portalServiceRecordsPageContract)
void portalServiceRecordsContractReady

import { PortalServiceRecordsPage } from '@/components/portal/CustomerPortalWorkspace'

export default function CustomerPortalServiceRecordsRoute() {
  return <PortalServiceRecordsPage />
}

