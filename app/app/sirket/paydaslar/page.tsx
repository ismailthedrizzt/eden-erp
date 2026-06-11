import { appSirketPaydaslarPageContract } from '@/contracts/pages/generated/app-sirket-paydaslar.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSirketPaydaslarContractReady = requirePageContract(appSirketPaydaslarPageContract)
void appSirketPaydaslarContractReady

import { CrmStakeholdersMvpPage } from '@/components/modules/crm/CrmStakeholdersMvpPage'

export default function CompanyStakeholdersPage() {
  return <CrmStakeholdersMvpPage />
}
