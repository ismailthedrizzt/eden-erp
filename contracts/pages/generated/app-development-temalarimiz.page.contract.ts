import type { EdenPageContract } from '../../core/page.contract'
import { appDevelopmentTemalarimizListContract } from './app-development-temalarimiz.list.contract'
import { appDevelopmentTemalarimizFormContract } from './app-development-temalarimiz.form.contract'
import { appDevelopmentTemalarimizWizardContract } from './app-development-temalarimiz.wizard.contract'

export const appDevelopmentTemalarimizPageContract = {
  route: '/app/development/temalarimiz',
  pageKind: 'shell',
  owningEntity: 'adminConsole',
  allowedActions: [],
  requiredComponents: ['EdenPageShell'],
  requiredStates: {
    empty: true,
    loading: true,
    error: true,
  },
  releaseStatus: 'hidden',
  visibleInProduction: false,
  visibleInStaging: false,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: true,
  list: appDevelopmentTemalarimizListContract,
  form: appDevelopmentTemalarimizFormContract,
  wizard: appDevelopmentTemalarimizWizardContract,
} as const satisfies EdenPageContract
