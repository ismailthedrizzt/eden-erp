import { getModuleContract } from './moduleRegistry'

export function resolveModuleDependencies(moduleKey: string) {
  return getModuleContract(moduleKey)?.dependencies || []
}

export function getMissingRequiredDependencies(moduleKey: string, enabledModuleKeys: string[]) {
  const enabled = new Set(enabledModuleKeys)
  return resolveModuleDependencies(moduleKey).filter(dependency => dependency.required && !enabled.has(dependency.moduleKey))
}

export function getMissingOptionalDependencies(moduleKey: string, enabledModuleKeys: string[]) {
  const enabled = new Set(enabledModuleKeys)
  return resolveModuleDependencies(moduleKey).filter(dependency => !dependency.required && !enabled.has(dependency.moduleKey))
}

export function canEnableModule(moduleKey: string, enabledModuleKeys: string[] = []) {
  const contract = getModuleContract(moduleKey)
  if (!contract) {
    return {
      ok: false,
      blocking_reasons: [`${moduleKey} modul sozlesmesi bulunamadi.`],
      warnings: [] as string[],
    }
  }
  const missingRequired = getMissingRequiredDependencies(moduleKey, enabledModuleKeys)
  const warnings = getModuleDependencyWarnings(moduleKey, enabledModuleKeys)
  return {
    ok: missingRequired.length === 0,
    blocking_reasons: missingRequired.map(dependency => dependency.reason || `${contract.name} modulu ${dependency.moduleKey} modulune baglidir.`),
    warnings,
  }
}

export function getModuleDependencyWarnings(moduleKey: string, enabledModuleKeys: string[] = []) {
  const contract = getModuleContract(moduleKey)
  if (!contract) return []
  return getMissingOptionalDependencies(moduleKey, enabledModuleKeys).map(dependency =>
    dependency.reason || `${contract.name} modulu ${dependency.moduleKey} modulu kapaliyken sinirli calisabilir.`
  )
}
