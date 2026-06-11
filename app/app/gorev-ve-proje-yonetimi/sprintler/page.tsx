import { appGorevVeProjeYonetimiSprintlerPageContract } from '@/contracts/pages/generated/app-gorev-ve-proje-yonetimi-sprintler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appGorevVeProjeYonetimiSprintlerContractReady = requirePageContract(appGorevVeProjeYonetimiSprintlerPageContract)
void appGorevVeProjeYonetimiSprintlerContractReady

import { ProjectManagementRecordsPage } from '@/components/modules/project-management/ProjectManagementRecordsPage'

export default function SprintlerPage() {
  return <ProjectManagementRecordsPage areaKey="sprintler" />
}
