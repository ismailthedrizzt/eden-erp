import { appIkCalismaPlanlariPageContract } from '@/contracts/pages/generated/app-ik-calisma-planlari.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appIkCalismaPlanlariContractReady = requirePageContract(appIkCalismaPlanlariPageContract)
void appIkCalismaPlanlariContractReady

import { HRWorkSchedulesWorkspace } from '@/components/hr/HRLeaveAttendanceWorkspaces'

export default function HRWorkSchedulesPage() {
  return <HRWorkSchedulesWorkspace />
}
