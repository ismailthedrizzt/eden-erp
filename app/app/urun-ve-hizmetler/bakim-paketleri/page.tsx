import { appUrunVeHizmetlerBakimPaketleriPageContract } from '@/contracts/pages/generated/app-urun-ve-hizmetler-bakim-paketleri.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appUrunVeHizmetlerBakimPaketleriContractReady = requirePageContract(appUrunVeHizmetlerBakimPaketleriPageContract)
void appUrunVeHizmetlerBakimPaketleriContractReady

import { ProductCatalogRecordsPage } from '@/components/modules/product-services/ProductCatalogRecordsPage'

export default function MaintenancePackagesPage() {
  return <ProductCatalogRecordsPage areaKey="bakim-paketleri" />
}
