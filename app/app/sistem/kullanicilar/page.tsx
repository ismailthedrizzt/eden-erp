import { appSistemKullanicilarPageContract } from '@/contracts/pages/generated/app-sistem-kullanicilar.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSistemKullanicilarContractReady = requirePageContract(appSistemKullanicilarPageContract)
void appSistemKullanicilarContractReady

import { SecurityRbacAdminPage } from '@/components/modules/security/SecurityRbacAdminPage'

export default function SecurityUsersPage() {
  return <SecurityRbacAdminPage initialTab="users" />
}
