import type { EdenListContract } from './list.contract'
import type { EdenFormContract } from './form.contract'
import type { EdenWizardContract } from './wizard.contract'

export type EdenPageKind = 'list' | 'form' | 'detail' | 'wizard' | 'dashboard' | 'shell' | 'placeholder' | 'redirect'
export type EdenReleaseStatus = 'live' | 'preview' | 'demo' | 'hidden' | 'deprecated'

export interface EdenPageContract {
  route: string
  pageKind: EdenPageKind
  owningEntity: string
  allowedActions: readonly string[]
  requiredComponents: readonly string[]
  requiredStates: {
    empty: boolean
    loading: boolean
    error: boolean
  }
  releaseStatus: EdenReleaseStatus
  visibleInProduction: boolean
  visibleInStaging: boolean
  visibleInDevelopment: boolean
  debugStatusBadgeAllowed: boolean
  list?: EdenListContract
  form?: EdenFormContract
  wizard?: EdenWizardContract
}
