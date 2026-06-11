import { appUrunVeHizmetlerKatalogPageContract } from '@/contracts/pages/generated/app-urun-ve-hizmetler-katalog.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appUrunVeHizmetlerKatalogContractReady = requirePageContract(appUrunVeHizmetlerKatalogPageContract)
void appUrunVeHizmetlerKatalogContractReady

import { ProductCatalogMvpPage } from '@/components/modules/product-after-sales/ProductAfterSalesMvpPages'

export default function ProductCatalogPage() {
  return <ProductCatalogMvpPage />
}
