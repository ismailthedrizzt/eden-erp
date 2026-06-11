import { appUrunVeHizmetlerLisansAbonelikUrunleriPageContract } from '@/contracts/pages/generated/app-urun-ve-hizmetler-lisans-abonelik-urunleri.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appUrunVeHizmetlerLisansAbonelikUrunleriContractReady = requirePageContract(appUrunVeHizmetlerLisansAbonelikUrunleriPageContract)
void appUrunVeHizmetlerLisansAbonelikUrunleriContractReady

import { ProductCatalogRecordsPage } from '@/components/modules/product-services/ProductCatalogRecordsPage'

export default function LicenseSubscriptionProductsPage() {
  return <ProductCatalogRecordsPage areaKey="lisans-abonelik-urunleri" />
}
