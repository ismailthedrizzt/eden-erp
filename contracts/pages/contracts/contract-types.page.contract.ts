import type { EdenPageContract } from '../../core/page.contract'
import { contractTypesListContract } from '../../lists/contracts/contract-types.list.contract'

export const contractTypesPageContract = {
  route: '/app/sozlesmeler/turler',
  pageKind: 'list',
  owningEntity: 'contract_type',
  allowedActions: ['view_contract_type_registry'],
  requiredComponents: ['PageBanner', 'ContractTypeRegistryGrid'],
  requiredStates: { empty: true, loading: false, error: false },
  releaseStatus: 'preview',
  visibleInProduction: false,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  list: contractTypesListContract,
  dashboard: {
    banner: {
      title: 'Sozlesme Turleri',
      subtitle: 'Backend ve frontend arasinda ortak sozlesme turu registry gorunumu.',
      icon: 'Tags',
    },
  },
} as const satisfies EdenPageContract & {
  dashboard: { banner: { title: string; subtitle: string; icon: string } }
}
