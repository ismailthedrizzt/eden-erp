import { appSatisSonrasiPageContract } from '@/contracts/pages/generated/app-satis-sonrasi.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSatisSonrasiContractReady = requirePageContract(appSatisSonrasiPageContract)
void appSatisSonrasiContractReady

import { AfterSalesHomeMvpPage } from '@/components/modules/product-after-sales/ProductAfterSalesMvpPages'

export default function AfterSalesPage() {
  return <AfterSalesHomeMvpPage />
}
