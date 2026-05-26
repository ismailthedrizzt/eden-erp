import { resolveMenuItemVisibility } from './runtimeVisibilityResolver'
import type { RuntimeVisibilityContext, VisibilityDecision } from './visibility.types'

export interface NavigationVisibilityResult<TItem> {
  item: TItem
  decision: VisibilityDecision
}

export function resolveNavigationItems<TItem extends {
  key?: string
  label?: string
  path?: string
  moduleKey?: string
  permission?: string
  fallbackPermission?: string
  featureFlag?: string
}>(items: TItem[], context: RuntimeVisibilityContext): NavigationVisibilityResult<TItem>[] {
  return items.map(item => ({
    item,
    decision: resolveMenuItemVisibility(item, context),
  }))
}
