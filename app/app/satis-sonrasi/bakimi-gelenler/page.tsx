import { appSatisSonrasiBakimiGelenlerPageContract } from '@/contracts/pages/generated/app-satis-sonrasi-bakimi-gelenler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSatisSonrasiBakimiGelenlerContractReady = requirePageContract(appSatisSonrasiBakimiGelenlerPageContract)
void appSatisSonrasiBakimiGelenlerContractReady

import { MaintenanceDueDeepPage } from '@/components/modules/product-after-sales/AfterSalesFieldServicePages'

export default function MaintenanceDuePage() {
  return <MaintenanceDueDeepPage />
}
