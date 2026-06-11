import { appSistemSaglikPageContract } from '@/contracts/pages/generated/app-sistem-saglik.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSistemSaglikContractReady = requirePageContract(appSistemSaglikPageContract)
void appSistemSaglikContractReady

import { AdminConsolePage } from '@/components/admin/AdminConsolePage'

export default function SistemSaglikPage() {
  return <AdminConsolePage section="health" />
}

