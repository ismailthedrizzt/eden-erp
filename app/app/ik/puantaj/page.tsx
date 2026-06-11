import { appIkPuantajPageContract } from '@/contracts/pages/generated/app-ik-puantaj.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appIkPuantajContractReady = requirePageContract(appIkPuantajPageContract)
void appIkPuantajContractReady

import { HRTimesheetsWorkspace } from '@/components/hr/HRLeaveAttendanceWorkspaces'

export default function HRTimesheetsPage() {
  return <HRTimesheetsWorkspace />
}
