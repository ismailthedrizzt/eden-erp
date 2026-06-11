import { appSatisSonrasiServisDestekKayitlariPageContract } from '@/contracts/pages/generated/app-satis-sonrasi-servis-destek-kayitlari.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSatisSonrasiServisDestekKayitlariContractReady = requirePageContract(appSatisSonrasiServisDestekKayitlariPageContract)
void appSatisSonrasiServisDestekKayitlariContractReady

import { AfterSalesRecordsPage } from '@/components/modules/after-sales/AfterSalesRecordsPage'

export default function ServisDestekKayitlariPage() {
  return <AfterSalesRecordsPage areaKey="servis-destek-kayitlari" />
}
