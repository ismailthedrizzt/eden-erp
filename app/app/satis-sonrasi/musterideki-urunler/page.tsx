import { appSatisSonrasiMusteridekiUrunlerPageContract } from '@/contracts/pages/generated/app-satis-sonrasi-musterideki-urunler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSatisSonrasiMusteridekiUrunlerContractReady = requirePageContract(appSatisSonrasiMusteridekiUrunlerPageContract)
void appSatisSonrasiMusteridekiUrunlerContractReady

import { CustomerAssetsPage } from '@/components/modules/after-sales/CustomerAssetsPage'

export default function AfterSalesCustomerAssetsRoute() {
  return <CustomerAssetsPage />
}
