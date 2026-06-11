import { appSistemTeknikPageContract } from '@/contracts/pages/generated/app-sistem-teknik.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSistemTeknikContractReady = requirePageContract(appSistemTeknikPageContract)
void appSistemTeknikContractReady

import { AdminConsolePage } from '@/components/admin/AdminConsolePage'

export default function SistemTeknikPage() {
  return <AdminConsolePage section="technical" />
}

