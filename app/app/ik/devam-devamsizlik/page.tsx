import { appIkDevamDevamsizlikPageContract } from '@/contracts/pages/generated/app-ik-devam-devamsizlik.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appIkDevamDevamsizlikContractReady = requirePageContract(appIkDevamDevamsizlikPageContract)
void appIkDevamDevamsizlikContractReady

import { HRAttendanceWorkspace } from '@/components/hr/HRLeaveAttendanceWorkspaces'

export default function HRAttendancePage() {
  return <HRAttendanceWorkspace />
}
