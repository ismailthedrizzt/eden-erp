import type { ModuleReadinessStatus, SetupAction } from './setup.types'
import { moduleSetupLabel, setupStatusLabel } from './setupMessages'

export function getSetupActionsForModule(moduleKey: string, readinessStatus: ModuleReadinessStatus): SetupAction[] {
  const actions: SetupAction[] = []
  if (readinessStatus.status === 'disabled' || readinessStatus.status === 'unlicensed') {
    actions.push({
      key: `module_settings_${moduleKey}`,
      label: 'Modul ayarlarina git',
      description: `${moduleSetupLabel(moduleKey)} icin aktivasyon ve lisans durumunu kontrol edin.`,
      action_type: 'navigate',
      target_page: '/app/sistem/module-licenses',
    })
  }

  if (readinessStatus.status === 'dependency_missing') {
    for (const dependencyKey of readinessStatus.missingDependencies) {
      actions.push(getSetupActionForMissingDependency(moduleKey, dependencyKey))
    }
  }

  if (readinessStatus.status === 'setup_required' || readinessStatus.status === 'infrastructure_missing') {
    actions.push(getSetupActionForMissingInfrastructure(moduleKey, [
      ...readinessStatus.missingTables,
      ...readinessStatus.missingViews,
      ...readinessStatus.missingRpcs,
      ...readinessStatus.missingSettings,
    ]))
  }

  for (const step of readinessStatus.setupSteps) {
    if (step.targetPage) {
      actions.push({
        key: step.actionKey || step.key,
        label: step.label,
        description: step.description,
        action_type: 'navigate',
        target_page: step.targetPage,
        setup_key: step.key,
      })
    }
  }

  if (!actions.length && !readinessStatus.ready) {
    actions.push({
      key: `setup_help_${moduleKey}`,
      label: 'Kurulum durumunu incele',
      description: `${moduleSetupLabel(moduleKey)} durumu: ${setupStatusLabel(readinessStatus.status)}.`,
      action_type: 'navigate',
      target_page: `/app/sistem/kurulum?module=${encodeURIComponent(moduleKey)}`,
    })
  }

  return dedupeActions(actions)
}

export function getSetupActionForMissingDependency(moduleKey: string, dependencyKey: string): SetupAction {
  return {
    key: `enable_${dependencyKey}_for_${moduleKey}`,
    label: `${moduleSetupLabel(dependencyKey)} modulunu kontrol et`,
    description: `${moduleSetupLabel(moduleKey)} icin ${moduleSetupLabel(dependencyKey)} modulu aktif olmalidir.`,
    action_type: 'navigate',
    target_page: '/app/sistem/module-licenses',
  }
}

export function getSetupActionForMissingInfrastructure(moduleKey: string, _missingItems: string[]): SetupAction {
  return {
    key: `complete_setup_${moduleKey}`,
    label: 'Kurulumu tamamla',
    description: `${moduleSetupLabel(moduleKey)} modulunun calismasi icin eksik kurulum adimlarini tamamlayin.`,
    action_type: 'open_setup_wizard',
    target_page: `/app/sistem/kurulum?module=${encodeURIComponent(moduleKey)}`,
    setup_key: moduleKey,
  }
}

function dedupeActions(actions: SetupAction[]) {
  const seen = new Set<string>()
  return actions.filter(action => {
    if (seen.has(action.key)) return false
    seen.add(action.key)
    return true
  })
}
