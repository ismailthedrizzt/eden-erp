import { appSatisSonrasiKuruluUrunlerPageContract } from '@/contracts/pages/generated/app-satis-sonrasi-kurulu-urunler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSatisSonrasiKuruluUrunlerContractReady = requirePageContract(appSatisSonrasiKuruluUrunlerPageContract)
void appSatisSonrasiKuruluUrunlerContractReady

import { InstalledAssetsMvpPage } from '@/components/modules/product-after-sales/ProductAfterSalesMvpPages'

export default function InstalledAssetsPage() {
  return <InstalledAssetsMvpPage />
}
