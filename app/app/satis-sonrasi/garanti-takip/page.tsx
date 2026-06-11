import { appSatisSonrasiGarantiTakipPageContract } from '@/contracts/pages/generated/app-satis-sonrasi-garanti-takip.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSatisSonrasiGarantiTakipContractReady = requirePageContract(appSatisSonrasiGarantiTakipPageContract)
void appSatisSonrasiGarantiTakipContractReady

import { AfterSalesRecordsPage } from '@/components/modules/after-sales/AfterSalesRecordsPage'

export default function GarantiTakipPage() {
  return <AfterSalesRecordsPage areaKey="garanti-takip" />
}
