import { appIkPersonelIdPageContract } from '@/contracts/pages/generated/app-ik-personel-id.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appIkPersonelIdContractReady = requirePageContract(appIkPersonelIdPageContract)
void appIkPersonelIdContractReady

import { redirect } from 'next/navigation'

export default function LegacyPersonelDetayPage() {
  redirect('/app/ik/employees')
}
