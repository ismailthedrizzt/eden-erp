import { appSozlesmelerWizardContract } from '@/contracts/pages/generated/app-sozlesmeler.wizard.contract'
import { appSozlesmelerLifecycleContract } from '@/contracts/pages/generated/app-sozlesmeler.lifecycle.contract'

void appSozlesmelerWizardContract
void appSozlesmelerLifecycleContract

import { appSozlesmelerPageContract } from '@/contracts/pages/generated/app-sozlesmeler.page.contract'
import { requirePageContract } from '@/contracts/tests/contract-test-utils'

const appSozlesmelerContractReady = requirePageContract(appSozlesmelerPageContract)
void appSozlesmelerContractReady

import { FileText } from 'lucide-react'
import { ContractsList } from '@/components/contracts/ContractsList'
import { PageBanner } from '@/components/ui/PageBanner'

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <PageBanner
        mode="list"
        title="S?zle?meler"
        subtitle="S?zle?me kartlar?, taraflar, belgeler, y?k?ml?l?kler ve lifecycle i?lemleri."
        icon={<FileText size={24} />}
      />
      <ContractsList />
    </div>
  )
}
