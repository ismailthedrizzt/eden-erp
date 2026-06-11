import { appGorevVeProjeYonetimiProjelerPageContract } from '@/contracts/pages/generated/app-gorev-ve-proje-yonetimi-projeler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appGorevVeProjeYonetimiProjelerContractReady = requirePageContract(appGorevVeProjeYonetimiProjelerPageContract)
void appGorevVeProjeYonetimiProjelerContractReady

import { ProjectsMvpPage } from '@/components/modules/project-management/ProjectTaskMvpPages'

export default function ProjelerPage() {
  return <ProjectsMvpPage />
}
