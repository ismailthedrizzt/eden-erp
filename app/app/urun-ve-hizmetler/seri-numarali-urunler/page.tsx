import { appUrunVeHizmetlerSeriNumaraliUrunlerPageContract } from '@/contracts/pages/generated/app-urun-ve-hizmetler-seri-numarali-urunler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appUrunVeHizmetlerSeriNumaraliUrunlerContractReady = requirePageContract(appUrunVeHizmetlerSeriNumaraliUrunlerPageContract)
void appUrunVeHizmetlerSeriNumaraliUrunlerContractReady

import { ProductCatalogRecordsPage } from '@/components/modules/product-services/ProductCatalogRecordsPage'

export default function SerialNumberedProductsPage() {
  return <ProductCatalogRecordsPage areaKey="seri-numarali-urunler" />
}
