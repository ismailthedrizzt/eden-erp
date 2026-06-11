import { appUrunVeHizmetlerGarantiSablonlariPageContract } from '@/contracts/pages/generated/app-urun-ve-hizmetler-garanti-sablonlari.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appUrunVeHizmetlerGarantiSablonlariContractReady = requirePageContract(appUrunVeHizmetlerGarantiSablonlariPageContract)
void appUrunVeHizmetlerGarantiSablonlariContractReady

import { ProductCatalogRecordsPage } from '@/components/modules/product-services/ProductCatalogRecordsPage'

export default function WarrantyTemplatesPage() {
  return <ProductCatalogRecordsPage areaKey="garanti-sablonlari" />
}
