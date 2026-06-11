import { appUrunVeHizmetlerHizmetKartlariPageContract } from '@/contracts/pages/generated/app-urun-ve-hizmetler-hizmet-kartlari.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appUrunVeHizmetlerHizmetKartlariContractReady = requirePageContract(appUrunVeHizmetlerHizmetKartlariPageContract)
void appUrunVeHizmetlerHizmetKartlariContractReady

import { ProductCatalogRecordsPage } from '@/components/modules/product-services/ProductCatalogRecordsPage'

export default function ServiceCardsPage() {
  return <ProductCatalogRecordsPage areaKey="hizmet-kartlari" />
}
