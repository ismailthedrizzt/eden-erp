import { appSatisSonrasiLisansTakipPageContract } from '@/contracts/pages/generated/app-satis-sonrasi-lisans-takip.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSatisSonrasiLisansTakipContractReady = requirePageContract(appSatisSonrasiLisansTakipPageContract)
void appSatisSonrasiLisansTakipContractReady

import { AfterSalesRecordsPage } from '@/components/modules/after-sales/AfterSalesRecordsPage'

export default function LisansTakipPage() {
  return <AfterSalesRecordsPage areaKey="lisans-takip" />
}
