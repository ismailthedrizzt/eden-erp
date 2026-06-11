import { appGorevVeProjeYonetimiTakvimPageContract } from '@/contracts/pages/generated/app-gorev-ve-proje-yonetimi-takvim.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appGorevVeProjeYonetimiTakvimContractReady = requirePageContract(appGorevVeProjeYonetimiTakvimPageContract)
void appGorevVeProjeYonetimiTakvimContractReady

import { ProjectManagementCalendarPage } from '@/components/modules/project-management/ProjectManagementCalendarPage'

export default function TakvimPage() {
  return <ProjectManagementCalendarPage />
}
