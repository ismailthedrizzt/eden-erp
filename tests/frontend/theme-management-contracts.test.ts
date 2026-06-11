import { readFileSync } from 'node:fs'
import { themeManagementApiServiceFunctions } from '../../contracts/api/system/theme-management.api.contract'
import {
  themeColorFields,
  themeDocumentSlots,
  themeImageSlots,
  themeManagementTabs,
} from '../../contracts/forms/system/themes-management.form.contract'
import { themeManagementListContract } from '../../contracts/lists/system/themes-management.list.contract'
import { themeManagementPageContract } from '../../contracts/pages/system/themes-management.page.contract'
import { themeActivationWizardContract } from '../../contracts/wizards/system/theme-activation.wizard.contract'
import { themeImportWizardContract } from '../../contracts/wizards/system/theme-import.wizard.contract'

const themePageSource = readFileSync('app/app/development/temalarimiz/page.tsx', 'utf8')

export function testThemeManagementPageImportsContracts() {
  for (const importPath of [
    '@/contracts/entities/workspace-theme.contract',
    '@/contracts/pages/system/themes-management.page.contract',
    '@/contracts/lists/system/themes-management.list.contract',
    '@/contracts/forms/system/themes-management.form.contract',
    '@/contracts/wizards/system/theme-import.wizard.contract',
    '@/contracts/wizards/system/theme-activation.wizard.contract',
    '@/contracts/lifecycle/system/theme-management.lifecycle.contract',
    '@/contracts/api/system/theme-management.api.contract',
  ]) {
    if (!themePageSource.includes(importPath)) throw new Error(`Missing theme contract import: ${importPath}`)
  }
  return themeManagementPageContract.route
}

export function testThemeManagementListColumnsMatchContract() {
  if (/<th[^>]*>\s*(Tema adi|Tema kodu|Durum|Versiyon|Aktif tema|Son guncelleme)/.test(themePageSource)) {
    throw new Error('Theme management list headers must render from list contract columns.')
  }
  return themeManagementListContract.columns.map(column => column.key)
}

export function testThemeManagementFormDefinitionsComeFromContracts() {
  for (const forbidden of ['const STATUS_LABELS', 'const STATUS_CLASS', 'const FILTERS', 'const TABS', 'const IMAGE_SLOTS', 'const DOCUMENT_SLOTS', 'const COLOR_FIELDS']) {
    if (themePageSource.includes(forbidden)) throw new Error(`Theme page still defines ${forbidden}`)
  }
  return {
    tabs: themeManagementTabs.length,
    imageSlots: themeImageSlots.length,
    documentSlots: themeDocumentSlots.length,
    colorFields: themeColorFields.length,
  }
}

export function testThemeManagementLifecycleActionsAreContractCovered() {
  return [themeImportWizardContract.lifecycleOperationType, themeActivationWizardContract.lifecycleOperationType]
}

export function testThemeManagementApiServiceCallsAreContractCovered() {
  for (const serviceFunction of ['createDraftThemeRecord', 'parseThemeImportTextV2', 'validateManagedTheme', 'withThemeLifecycle', 'exportSelected', 'upsertManagedThemeRecord']) {
    if (!themeManagementApiServiceFunctions.includes(serviceFunction)) {
      throw new Error(`Theme API service function missing from contract: ${serviceFunction}`)
    }
  }
  return themeManagementApiServiceFunctions
}
