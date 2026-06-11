import { appRaporlamaZamanlanmisRaporlarPageContract } from '@/contracts/pages/generated/app-raporlama-zamanlanmis-raporlar.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appRaporlamaZamanlanmisRaporlarContractReady = requirePageContract(appRaporlamaZamanlanmisRaporlarPageContract)
void appRaporlamaZamanlanmisRaporlarContractReady

import { AdvancedScheduledReportsPage } from '@/components/modules/reporting/AdvancedReportingPages'

export default function ScheduledReportsRoute() {
  return <AdvancedScheduledReportsPage />
}

