export type ContractExceptionRule =
  | 'ts-ignore'
  | 'as-any'
  | 'eslint-disable'
  | 'direct-lifecycle-mutation'
  | 'hardcoded-release-visibility'
  | 'hardcoded-table-columns'
  | 'hardcoded-form-fields'
  | 'unvalidated-api-response'
  | 'production-placeholder'
  | 'debug-label-production'

export type ContractException = {
  rule: ContractExceptionRule
  route: string
  file: string
  reason: string
  owner: string
  expiresAt: string
  removalPlan: string
}

export const contractExceptions: readonly ContractException[] = []
