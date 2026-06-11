import { appGorevVeProjeYonetimiGorevlerPageContract } from '@/contracts/pages/generated/app-gorev-ve-proje-yonetimi-gorevler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appGorevVeProjeYonetimiGorevlerContractReady = requirePageContract(appGorevVeProjeYonetimiGorevlerPageContract)
void appGorevVeProjeYonetimiGorevlerContractReady

import { ProjectTasksMvpPage } from '@/components/modules/project-management/ProjectTaskMvpPages'

export default function GorevlerPage() {
  return <ProjectTasksMvpPage />
}
