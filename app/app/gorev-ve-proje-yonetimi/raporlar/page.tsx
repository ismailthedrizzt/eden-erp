import { appGorevVeProjeYonetimiRaporlarPageContract } from '@/contracts/pages/generated/app-gorev-ve-proje-yonetimi-raporlar.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appGorevVeProjeYonetimiRaporlarContractReady = requirePageContract(appGorevVeProjeYonetimiRaporlarPageContract)
void appGorevVeProjeYonetimiRaporlarContractReady

import { ProjectManagementReportsPage } from '@/components/modules/project-management/ProjectManagementReportsPage'

export default function RaporlarPage() {
  return <ProjectManagementReportsPage />
}
