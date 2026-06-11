import { appSistemModullerPageContract } from '@/contracts/pages/generated/app-sistem-moduller.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSistemModullerContractReady = requirePageContract(appSistemModullerPageContract)
void appSistemModullerContractReady

import { AdminConsolePage } from '@/components/admin/AdminConsolePage'

export default function SistemModullerPage() {
  return <AdminConsolePage section="modules" />
}

