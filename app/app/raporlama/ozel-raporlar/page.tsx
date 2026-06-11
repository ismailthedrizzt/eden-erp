import { appRaporlamaOzelRaporlarPageContract } from '@/contracts/pages/generated/app-raporlama-ozel-raporlar.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appRaporlamaOzelRaporlarContractReady = requirePageContract(appRaporlamaOzelRaporlarPageContract)
void appRaporlamaOzelRaporlarContractReady

import { AdvancedCustomReportsPage } from '@/components/modules/reporting/AdvancedReportingPages'

export default function CustomReportsRoute() {
  return <AdvancedCustomReportsPage />
}

