import { appSistemPageContract } from '@/contracts/pages/generated/app-sistem.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSistemContractReady = requirePageContract(appSistemPageContract)
void appSistemContractReady

import { AdminConsolePage } from '@/components/admin/AdminConsolePage'

export default function SistemPage() {
  return <AdminConsolePage section="dashboard" />
}

