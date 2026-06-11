import { appIkIzinBakiyeleriPageContract } from '@/contracts/pages/generated/app-ik-izin-bakiyeleri.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appIkIzinBakiyeleriContractReady = requirePageContract(appIkIzinBakiyeleriPageContract)
void appIkIzinBakiyeleriContractReady

import { HRLeaveBalancesWorkspace } from '@/components/hr/HRLeaveAttendanceWorkspaces'

export default function HRLeaveBalancesPage() {
  return <HRLeaveBalancesWorkspace />
}
