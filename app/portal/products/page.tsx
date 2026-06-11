import { portalProductsPageContract } from '@/contracts/pages/generated/portal-products.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const portalProductsContractReady = requirePageContract(portalProductsPageContract)
void portalProductsContractReady

import { PortalProductsPage } from '@/components/portal/CustomerPortalWorkspace'

export default function CustomerPortalProductsRoute() {
  return <PortalProductsPage />
}

