import type { EdenThemePackage } from '@/lib/theme/themeSchema'
import {
  edenThemeRuntimePackageV2ToFigmaTokens,
  runtimeThemePackageV2ToCssVariables,
  toRuntimeThemePackageV2,
  type EdenThemeRuntimePackageV2,
} from '@/lib/theme/themePackageV2'

export function mapHikmetInternalThemeToRuntimePackage(theme: EdenThemePackage): EdenThemeRuntimePackageV2 {
  return toRuntimeThemePackageV2(theme)
}

export function mapHikmetRuntimePackageToFigmaTokens(theme: EdenThemeRuntimePackageV2) {
  return edenThemeRuntimePackageV2ToFigmaTokens(theme)
}

export function mapHikmetRuntimePackageToCssVariables(theme: EdenThemeRuntimePackageV2) {
  return runtimeThemePackageV2ToCssVariables(theme)
}
