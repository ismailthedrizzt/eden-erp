import { appDashboardPageContract } from '@/contracts/pages/generated/app-dashboard.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appDashboardContractReady = requirePageContract(appDashboardPageContract)
void appDashboardContractReady

import { redirect } from 'next/navigation'

export default function DashboardPage() {
  redirect('/app')
}
