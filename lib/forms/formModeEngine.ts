export type FormModeEngineMode = 'VIEW' | 'INSERT' | 'EDIT' | 'APPROVAL'

export interface FormModePermissions {
  canView: boolean
  canInsert: boolean
  canEdit: boolean
  canApprove?: boolean
}

export interface FormModeState {
  mode: FormModeEngineMode
  canView: boolean
  readonly: boolean
  canSave: boolean
  canApprove: boolean
  canReject: boolean
  showAdd: boolean
  showEdit: boolean
}

export function createFormModeState(mode: FormModeEngineMode, permissions: FormModePermissions): FormModeState {
  const canSave = (mode === 'INSERT' && permissions.canInsert) || (mode === 'EDIT' && permissions.canEdit)
  const canApprove = mode === 'APPROVAL' && !!permissions.canApprove

  return {
    mode,
    canView: permissions.canView,
    readonly: mode === 'VIEW' || mode === 'APPROVAL' || !canSave,
    canSave,
    canApprove,
    canReject: canApprove,
    showAdd: permissions.canView && permissions.canInsert,
    showEdit: permissions.canView && permissions.canEdit,
  }
}

export function mapPageStateToFormMode(pageState: 'list' | 'create' | 'view' | 'edit' | 'approval'): FormModeEngineMode {
  if (pageState === 'create') return 'INSERT'
  if (pageState === 'edit') return 'EDIT'
  if (pageState === 'approval') return 'APPROVAL'
  return 'VIEW'
}
