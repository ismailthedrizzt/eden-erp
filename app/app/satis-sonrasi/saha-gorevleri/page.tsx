import { appSatisSonrasiSahaGorevleriPageContract } from '@/contracts/pages/generated/app-satis-sonrasi-saha-gorevleri.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSatisSonrasiSahaGorevleriContractReady = requirePageContract(appSatisSonrasiSahaGorevleriPageContract)
void appSatisSonrasiSahaGorevleriContractReady

import { FieldAssignmentsPage } from '@/components/modules/product-after-sales/AfterSalesFieldServicePages'

export default function AfterSalesFieldAssignmentsPage() {
  return <FieldAssignmentsPage />
}
