import type { EdenPageContract } from '../../core/page.contract'
import { employeeEntityContract } from '../../entities/employee.contract'
import { employeeFormContract } from '../../forms/hr/employee.form.contract'
import { employeeListContract } from '../../lists/hr/employee.list.contract'
import { employeeLifecycleContract } from '../../lifecycle/hr/employee.lifecycle.contract'
import { assignmentChangeWizardContract } from '../../wizards/hr/assignment-change.wizard.contract'
import { employmentStartWizardContract } from '../../wizards/hr/employment-start.wizard.contract'
import { employmentTerminationWizardContract } from '../../wizards/hr/employment-termination.wizard.contract'
import { sgkEntryWizardContract } from '../../wizards/hr/sgk-entry.wizard.contract'
import { sgkExitWizardContract } from '../../wizards/hr/sgk-exit.wizard.contract'

export const employeePageContract = {
  route: '/app/ik/calisanlar',
  pageKind: 'list',
  owningEntity: employeeEntityContract.entityName,
  allowedActions: [
    'create_draft',
    'view_detail',
    'start_employment',
    'terminate_employment',
    'assignment_change',
    'sgk_entry_completed',
    'sgk_exit_completed',
    'document_upload',
  ],
  requiredComponents: ['PageBanner', 'EdenListPageShell', 'EdenSmartList', 'SmartDataTable', 'EdenFormShell', 'EdenFormHeader', 'EdenFormHero', 'EdenFormTabs', 'EdenWizardShell'],
  requiredStates: { empty: true, loading: true, error: true },
  releaseStatus: 'live',
  visibleInProduction: true,
  visibleInStaging: true,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: false,
  list: employeeListContract,
  form: employeeFormContract,
  wizard: employmentStartWizardContract,
  wizardContracts: [
    employmentStartWizardContract,
    employmentTerminationWizardContract,
    assignmentChangeWizardContract,
    sgkEntryWizardContract,
    sgkExitWizardContract,
  ],
  lifecycle: employeeLifecycleContract,
  apiContractPath: 'contracts/api/hr/employee.api.contract.ts',
  lifecycleContractPath: 'contracts/lifecycle/hr/employee.lifecycle.contract.ts',
} as const satisfies EdenPageContract & {
  wizardContracts: readonly [
    typeof employmentStartWizardContract,
    typeof employmentTerminationWizardContract,
    typeof assignmentChangeWizardContract,
    typeof sgkEntryWizardContract,
    typeof sgkExitWizardContract,
  ]
  lifecycle: typeof employeeLifecycleContract
  apiContractPath: string
  lifecycleContractPath: string
}
