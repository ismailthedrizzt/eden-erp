import { appSatisSonrasiChecklistlerPageContract } from '@/contracts/pages/generated/app-satis-sonrasi-checklistler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSatisSonrasiChecklistlerContractReady = requirePageContract(appSatisSonrasiChecklistlerPageContract)
void appSatisSonrasiChecklistlerContractReady

import { ChecklistTemplatesPage } from '@/components/modules/product-after-sales/AfterSalesFieldServicePages'

export default function AfterSalesChecklistsPage() {
  return <ChecklistTemplatesPage />
}
