import { appSatisSonrasiBakimSozlesmeTakipPageContract } from '@/contracts/pages/generated/app-satis-sonrasi-bakim-sozlesme-takip.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSatisSonrasiBakimSozlesmeTakipContractReady = requirePageContract(appSatisSonrasiBakimSozlesmeTakipPageContract)
void appSatisSonrasiBakimSozlesmeTakipContractReady

import { AfterSalesRecordsPage } from '@/components/modules/after-sales/AfterSalesRecordsPage'

export default function BakimSozlesmeTakipPage() {
  return <AfterSalesRecordsPage areaKey="bakim-sozlesme-takip" />
}
