import { appIkIzinlerPageContract } from '@/contracts/pages/generated/app-ik-izinler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appIkIzinlerContractReady = requirePageContract(appIkIzinlerPageContract)
void appIkIzinlerContractReady

import { HRLeaveRequestsWorkspace } from '@/components/hr/HRLeaveAttendanceWorkspaces'

export default function HRLeaveRequestsPage() {
  return <HRLeaveRequestsWorkspace />
}
