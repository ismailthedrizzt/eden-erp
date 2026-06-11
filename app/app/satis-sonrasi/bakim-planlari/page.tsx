import { appSatisSonrasiBakimPlanlariPageContract } from '@/contracts/pages/generated/app-satis-sonrasi-bakim-planlari.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSatisSonrasiBakimPlanlariContractReady = requirePageContract(appSatisSonrasiBakimPlanlariPageContract)
void appSatisSonrasiBakimPlanlariContractReady

import { MaintenancePlansDeepPage } from '@/components/modules/product-after-sales/AfterSalesFieldServicePages'

export default function MaintenancePlansPage() {
  return <MaintenancePlansDeepPage />
}
