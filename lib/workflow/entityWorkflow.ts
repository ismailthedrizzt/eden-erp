import type { FormMode } from '@/components/ui/EntityForm'
import type { EntityAccessState, EntityWorkflowConfig } from '@/lib/access/entityAccess'

export type WorkflowAction = 'create' | 'update' | 'delete' | 'passivate'

export type WorkflowDecision = {
  action: WorkflowAction
  shouldRouteToWorkflow: boolean
  workflowKey?: string
  reason?: string
}

export function formModeToWorkflowAction(mode: FormMode): WorkflowAction | null {
  if (mode === 'create') return 'create'
  if (mode === 'edit') return 'update'
  if (mode === 'passive') return 'passivate'
  return null
}

export function decideWorkflowRoute(
  mode: FormMode,
  access: Pick<EntityAccessState, 'workflowEnabled' | 'canApprove'>,
  workflow?: EntityWorkflowConfig,
): WorkflowDecision | null {
  const action = formModeToWorkflowAction(mode)
  if (!action) return null

  const intercepts = workflow?.interceptActions || []
  const shouldRouteToWorkflow = !!workflow?.enabled &&
    access.workflowEnabled &&
    intercepts.includes(action) &&
    !access.canApprove

  return {
    action,
    shouldRouteToWorkflow,
    workflowKey: workflow?.workflowKey,
    reason: shouldRouteToWorkflow
      ? 'Bu kayit dogrudan uygulanmak yerine onay akisina gonderilecek.'
      : undefined,
  }
}
