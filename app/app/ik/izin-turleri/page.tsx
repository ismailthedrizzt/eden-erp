import { appIkIzinTurleriPageContract } from '@/contracts/pages/generated/app-ik-izin-turleri.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appIkIzinTurleriContractReady = requirePageContract(appIkIzinTurleriPageContract)
void appIkIzinTurleriContractReady

import { HRLeaveTypesWorkspace } from '@/components/hr/HRLeaveAttendanceWorkspaces'

export default function HRLeaveTypesPage() {
  return <HRLeaveTypesWorkspace />
}
