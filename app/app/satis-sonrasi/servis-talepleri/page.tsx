import { appSatisSonrasiServisTalepleriPageContract } from '@/contracts/pages/generated/app-satis-sonrasi-servis-talepleri.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSatisSonrasiServisTalepleriContractReady = requirePageContract(appSatisSonrasiServisTalepleriPageContract)
void appSatisSonrasiServisTalepleriContractReady

import { ServiceRequestsMvpPage } from '@/components/modules/product-after-sales/ProductAfterSalesMvpPages'

export default function ServiceRequestsPage() {
  return <ServiceRequestsMvpPage />
}
