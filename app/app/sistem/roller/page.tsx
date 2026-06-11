import { appSistemRollerPageContract } from '@/contracts/pages/generated/app-sistem-roller.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSistemRollerContractReady = requirePageContract(appSistemRollerPageContract)
void appSistemRollerContractReady

import { SecurityRbacAdminPage } from '@/components/modules/security/SecurityRbacAdminPage'

export default function SecurityRolesPage() {
  return <SecurityRbacAdminPage initialTab="roles" />
}
