import { appSistemEntegrasyonlarPageContract } from '@/contracts/pages/generated/app-sistem-entegrasyonlar.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSistemEntegrasyonlarContractReady = requirePageContract(appSistemEntegrasyonlarPageContract)
void appSistemEntegrasyonlarContractReady

import { IntegrationHubPage } from '@/components/modules/integrations/IntegrationHubPage'

export default function SistemEntegrasyonlarPage() {
  return <IntegrationHubPage />
}

