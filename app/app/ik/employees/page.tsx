import { appIkEmployeesPageContract } from '@/contracts/pages/generated/app-ik-employees.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appIkEmployeesContractReady = requirePageContract(appIkEmployeesPageContract)
void appIkEmployeesContractReady

import { redirect } from 'next/navigation'

export default function EmployeesRedirectPage() {
  redirect('/app/ik/calisanlar')
}
