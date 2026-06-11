import { portalProductsIdPageContract } from '@/contracts/pages/generated/portal-products-id.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const portalProductsIdContractReady = requirePageContract(portalProductsIdPageContract)
void portalProductsIdContractReady

import { PortalProductDetailPage } from '@/components/portal/CustomerPortalWorkspace'

type PageProps = { params: Promise<{ id: string }> }

export default async function CustomerPortalProductDetailRoute({ params }: PageProps) {
  const { id } = await params
  return <PortalProductDetailPage productId={id} />
}

