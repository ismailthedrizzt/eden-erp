import { appSistemOutboxPageContract } from '@/contracts/pages/generated/app-sistem-outbox.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSistemOutboxContractReady = requirePageContract(appSistemOutboxPageContract)
void appSistemOutboxContractReady

import { AdminConsolePage } from '@/components/admin/AdminConsolePage'

export default function SistemOutboxPage() {
  return <AdminConsolePage section="outbox" />
}

