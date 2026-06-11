import { appSistemGenelPageContract } from '@/contracts/pages/generated/app-sistem-genel.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSistemGenelContractReady = requirePageContract(appSistemGenelPageContract)
void appSistemGenelContractReady

import { AdminConsolePage } from '@/components/admin/AdminConsolePage'

export default function SistemGenelPage() {
  return <AdminConsolePage section="workspace" />
}

