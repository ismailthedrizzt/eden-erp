import { appSistemYetkilerPageContract } from '@/contracts/pages/generated/app-sistem-yetkiler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSistemYetkilerContractReady = requirePageContract(appSistemYetkilerPageContract)
void appSistemYetkilerContractReady

import { SecurityRbacAdminPage } from '@/components/modules/security/SecurityRbacAdminPage'

export default function SecurityPermissionsPage() {
  return <SecurityRbacAdminPage initialTab="matrix" />
}
