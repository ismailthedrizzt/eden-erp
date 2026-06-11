import { appCrmPaydaslarPageContract } from '@/contracts/pages/generated/app-crm-paydaslar.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appCrmPaydaslarContractReady = requirePageContract(appCrmPaydaslarPageContract)
void appCrmPaydaslarContractReady

import { CrmStakeholdersMvpPage } from '@/components/modules/crm/CrmStakeholdersMvpPage'

export default function CrmStakeholdersPage() {
  return <CrmStakeholdersMvpPage />
}
