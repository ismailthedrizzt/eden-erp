import { appGorevVeProjeYonetimiBacklogPageContract } from '@/contracts/pages/generated/app-gorev-ve-proje-yonetimi-backlog.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appGorevVeProjeYonetimiBacklogContractReady = requirePageContract(appGorevVeProjeYonetimiBacklogPageContract)
void appGorevVeProjeYonetimiBacklogContractReady

import { ProjectManagementBacklogPage } from '@/components/modules/project-management/ProjectManagementBacklogPage'

export default function BacklogPage() {
  return <ProjectManagementBacklogPage />
}
