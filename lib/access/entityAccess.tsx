'use client'

import { ReactNode, useMemo } from 'react'
import { AlertTriangle, LockKeyhole } from 'lucide-react'
import { useModules } from '@/lib/security/moduleStore'
import { usePermissions } from '@/lib/security/permissionStore'
import { cn } from '@/lib/utils'

export type EntityPermissionSet = {
  view?: string
  insert?: string
  edit?: string
  approve?: string
  passivate?: string
  export?: string
}

export type ModuleDependency = {
  module: string
  label: string
  reason: string
  severity?: 'info' | 'warning' | 'required'
}

export type EntityWorkflowConfig = {
  enabled?: boolean
  workflowKey?: string
  approvalPermission?: string
  interceptActions?: Array<'create' | 'update' | 'delete' | 'passivate'>
}

export type EntityAccessConfig = {
  module: string
  moduleLabel: string
  resource: string
  permissions: EntityPermissionSet
  dependencies?: ModuleDependency[]
  workflow?: EntityWorkflowConfig
}

export type EntityAccessState = {
  moduleEnabled: boolean
  moduleWritable: boolean
  canView: boolean
  canInsert: boolean
  canEdit: boolean
  canApprove: boolean
  canPassivate: boolean
  canExport: boolean
  showAdd: boolean
  showEdit: boolean
  readonly: boolean
  workflowEnabled: boolean
  missingDependencies: ModuleDependency[]
}

export function useEntityAccess(config: EntityAccessConfig): EntityAccessState {
  const modules = useModules()
  const permissions = usePermissions()

  return useMemo(() => {
    const moduleEnabled = modules.isEnabled(config.module)
    const moduleWritable = modules.isWritable(config.module)
    const canView = moduleEnabled && permissions.can(config.permissions.view)
    const canInsert = canView && moduleWritable && permissions.can(config.permissions.insert)
    const canEdit = canView && moduleWritable && permissions.can(config.permissions.edit)
    const canApprove = canView && moduleWritable && permissions.can(config.permissions.approve || config.workflow?.approvalPermission)
    const canPassivate = canView && moduleWritable && permissions.can(config.permissions.passivate)
    const canExport = canView && permissions.can(config.permissions.export)
    const missingDependencies = (config.dependencies || []).filter(dependency => !modules.isEnabled(dependency.module))

    return {
      moduleEnabled,
      moduleWritable,
      canView,
      canInsert,
      canEdit,
      canApprove,
      canPassivate,
      canExport,
      showAdd: canInsert,
      showEdit: canEdit,
      readonly: !canEdit,
      workflowEnabled: !!config.workflow?.enabled && modules.isEnabled('workflow'),
      missingDependencies,
    }
  }, [config, modules, permissions])
}

export function ModuleDependencyNotice({ dependency, className }: { dependency: ModuleDependency; className?: string }) {
  const required = dependency.severity === 'required'

  return (
    <div className={cn(
      "rounded-lg border px-3 py-2 text-sm",
      required
        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
        : "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200",
      className,
    )}>
      <div className="flex gap-2">
        {required ? <LockKeyhole size={16} className="mt-0.5 flex-shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />}
        <div>
          <div className="font-medium">{dependency.label} modulu etkin degil</div>
          <div className="mt-0.5 text-xs opacity-90">
            Bu alandan yararlanabilmek icin {dependency.label} modulunu etkinlestirmeniz gerekir. {dependency.reason}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ModuleDependencyGate({
  dependency,
  children,
  fallback,
}: {
  dependency: ModuleDependency
  children: ReactNode
  fallback?: ReactNode
}) {
  const modules = useModules()
  if (!modules.isEnabled(dependency.module)) return fallback ? <>{fallback}</> : <ModuleDependencyNotice dependency={dependency} />
  return <>{children}</>
}
