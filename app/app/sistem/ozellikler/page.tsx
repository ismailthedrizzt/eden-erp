import { appSistemOzelliklerPageContract } from '@/contracts/pages/generated/app-sistem-ozellikler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSistemOzelliklerContractReady = requirePageContract(appSistemOzelliklerPageContract)
void appSistemOzelliklerContractReady

import { AdminConsolePage } from '@/components/admin/AdminConsolePage'

export default function SistemOzelliklerPage() {
  return <AdminConsolePage section="features" />
}

