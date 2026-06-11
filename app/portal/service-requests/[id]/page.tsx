import { portalServiceRequestsIdPageContract } from '@/contracts/pages/generated/portal-service-requests-id.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const portalServiceRequestsIdContractReady = requirePageContract(portalServiceRequestsIdPageContract)
void portalServiceRequestsIdContractReady

import { PortalServiceRequestDetailPage } from '@/components/portal/CustomerPortalWorkspace'

type PageProps = { params: Promise<{ id: string }> }

export default async function CustomerPortalServiceRequestDetailRoute({ params }: PageProps) {
  const { id } = await params
  return <PortalServiceRequestDetailPage requestId={id} />
}

