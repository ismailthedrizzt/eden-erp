import { appSatisSonrasiServisKayitlariPageContract } from '@/contracts/pages/generated/app-satis-sonrasi-servis-kayitlari.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSatisSonrasiServisKayitlariContractReady = requirePageContract(appSatisSonrasiServisKayitlariPageContract)
void appSatisSonrasiServisKayitlariContractReady

import { ServiceRecordsMvpPage } from '@/components/modules/product-after-sales/ProductAfterSalesMvpPages'

export default function ServiceRecordsPage() {
  return <ServiceRecordsMvpPage />
}
