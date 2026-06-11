import { appUrunVeHizmetlerPageContract } from '@/contracts/pages/generated/app-urun-ve-hizmetler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appUrunVeHizmetlerContractReady = requirePageContract(appUrunVeHizmetlerPageContract)
void appUrunVeHizmetlerContractReady

import { ProductServicesHomeMvpPage } from '@/components/modules/product-after-sales/ProductAfterSalesMvpPages'

export default function ProductServicesPage() {
  return <ProductServicesHomeMvpPage />
}
