import type { EdenPageContract } from '../../core/page.contract'
import { workspaceThemeEntityContract } from '../../entities/workspace-theme.contract'
import { themeManagementFormContract } from '../../forms/system/themes-management.form.contract'
import { themeManagementLifecycleContract } from '../../lifecycle/system/theme-management.lifecycle.contract'
import { themeManagementListContract } from '../../lists/system/themes-management.list.contract'
import { themeActivationWizardContract } from '../../wizards/system/theme-activation.wizard.contract'
import { themeImportWizardContract } from '../../wizards/system/theme-import.wizard.contract'

export const themeManagementPageContract = {
  route: '/app/development/temalarimiz',
  pageKind: 'list',
  owningEntity: workspaceThemeEntityContract.entityName,
  allowedActions: ['create_draft', 'save_draft', 'import_theme', 'validate_theme', 'activate_theme', 'deactivate_theme', 'export_theme', 'asset_upload'],
  requiredComponents: ['PageBanner', 'EdenListPageShell', 'EdenSmartList', 'EdenFormShell', 'EdenFormHeader', 'EdenFormHero', 'EdenHeroImageUploader', 'EdenHeroDocumentUploader', 'EdenFormTabs', 'EdenStatusActionButton', 'EdenTokenTable'],
  requiredStates: { empty: true, loading: false, error: true },
  releaseStatus: 'hidden',
  visibleInProduction: false,
  visibleInStaging: false,
  visibleInDevelopment: true,
  debugStatusBadgeAllowed: true,
  list: themeManagementListContract,
  form: themeManagementFormContract,
  wizard: themeImportWizardContract,
  wizardContracts: [themeImportWizardContract, themeActivationWizardContract],
  lifecycle: themeManagementLifecycleContract,
  apiContractPath: 'contracts/api/system/theme-management.api.contract.ts',
  lifecycleContractPath: 'contracts/lifecycle/system/theme-management.lifecycle.contract.ts',
} as const satisfies EdenPageContract & {
  wizardContracts: readonly [typeof themeImportWizardContract, typeof themeActivationWizardContract]
  lifecycle: typeof themeManagementLifecycleContract
  apiContractPath: string
  lifecycleContractPath: string
}
