'use client'

import { ContractLifecycleActions } from '../ContractLifecycleActions'
import type { ContractRecord } from '@/lib/services/contracts'

export function ContractActivationWizard({ contract }: { contract: ContractRecord }) {
  return <ContractLifecycleActions contract={contract} />
}
