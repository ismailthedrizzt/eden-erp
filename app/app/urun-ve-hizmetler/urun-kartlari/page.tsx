import { appUrunVeHizmetlerUrunKartlariPageContract } from '@/contracts/pages/generated/app-urun-ve-hizmetler-urun-kartlari.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appUrunVeHizmetlerUrunKartlariContractReady = requirePageContract(appUrunVeHizmetlerUrunKartlariPageContract)
void appUrunVeHizmetlerUrunKartlariContractReady

import { ProductCatalogRecordsPage } from '@/components/modules/product-services/ProductCatalogRecordsPage'

export default function ProductCardsPage() {
  return <ProductCatalogRecordsPage areaKey="urun-kartlari" />
}
