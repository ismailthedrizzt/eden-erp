import { appGorevVeProjeYonetimiPageContract } from '@/contracts/pages/generated/app-gorev-ve-proje-yonetimi.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appGorevVeProjeYonetimiContractReady = requirePageContract(appGorevVeProjeYonetimiPageContract)
void appGorevVeProjeYonetimiContractReady

import { ProjectTaskHomeMvpPage } from '@/components/modules/project-management/ProjectTaskMvpPages'

export default function GorevVeProjeYonetimiPage() {
  return <ProjectTaskHomeMvpPage />
}
