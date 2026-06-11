import { appGorevVeProjeYonetimiIsAkislariPageContract } from '@/contracts/pages/generated/app-gorev-ve-proje-yonetimi-is-akislari.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appGorevVeProjeYonetimiIsAkislariContractReady = requirePageContract(appGorevVeProjeYonetimiIsAkislariPageContract)
void appGorevVeProjeYonetimiIsAkislariContractReady

import { ProjectManagementRecordsPage } from '@/components/modules/project-management/ProjectManagementRecordsPage'

export default function IsAkislariPage() {
  return <ProjectManagementRecordsPage areaKey="is-akislari" />
}
