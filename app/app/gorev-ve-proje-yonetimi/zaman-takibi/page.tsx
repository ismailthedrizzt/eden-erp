import { appGorevVeProjeYonetimiZamanTakibiPageContract } from '@/contracts/pages/generated/app-gorev-ve-proje-yonetimi-zaman-takibi.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appGorevVeProjeYonetimiZamanTakibiContractReady = requirePageContract(appGorevVeProjeYonetimiZamanTakibiPageContract)
void appGorevVeProjeYonetimiZamanTakibiContractReady

import { ProjectManagementRecordsPage } from '@/components/modules/project-management/ProjectManagementRecordsPage'

export default function ZamanTakibiPage() {
  return <ProjectManagementRecordsPage areaKey="zaman-takibi" />
}
