import { appSatisSozlesmelerPageContract } from '@/contracts/pages/generated/app-satis-sozlesmeler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSatisSozlesmelerContractReady = requirePageContract(appSatisSozlesmelerPageContract)
void appSatisSozlesmelerContractReady

import { redirect } from 'next/navigation'

export default function SalesContractsPage() {
  redirect('/app/sozlesmeler')
}
