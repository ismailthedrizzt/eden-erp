export const LIFECYCLE_INFORMATION_STEP_ID = 'info' as const
export const LIFECYCLE_DOCUMENTS_STEP_ID = 'documents' as const
export const LIFECYCLE_HISTORY_TAB_ID = 'history' as const
export const LIFECYCLE_FIELD_HISTORY_KEY = 'field_history' as const
export const LIFECYCLE_EVENTS_KEY = 'lifecycle_events' as const

export type LifecycleWizardWriteMode = 'replace' | 'append' | 'merge'

export type LifecycleWizardStepIds = {
  information: typeof LIFECYCLE_INFORMATION_STEP_ID
  documents: typeof LIFECYCLE_DOCUMENTS_STEP_ID
}

export type LifecycleWizardFieldWrite = {
  sourceField: string
  targetField: string
  label?: string
  required?: boolean
  mode: LifecycleWizardWriteMode
}

export type LifecycleWizardDocumentWrite = {
  sourceField: string
  targetField: string
  slotId: string
  slotTitle: string
  label?: string
  required?: boolean
  mode: LifecycleWizardWriteMode
}

export type LifecycleWizardHistoryTarget = {
  tabId: typeof LIFECYCLE_HISTORY_TAB_ID
  fieldHistoryKey: typeof LIFECYCLE_FIELD_HISTORY_KEY
  eventsKey: typeof LIFECYCLE_EVENTS_KEY
}

export type LifecycleWizardTemplate<TId extends string = string> = {
  id: TId
  title: string
  endpoint: string
  submitLabel: string
  stepIds: LifecycleWizardStepIds
  completion: {
    formWrites: readonly LifecycleWizardFieldWrite[]
    documentWrites: readonly LifecycleWizardDocumentWrite[]
    history: LifecycleWizardHistoryTarget
  }
}

type LifecycleWizardTemplateInput<TId extends string> = {
  id: TId
  title: string
  endpoint: string
  submitLabel: string
  stepIds?: Partial<LifecycleWizardStepIds>
  completion?: {
    formWrites?: readonly LifecycleWizardFieldWrite[]
    documentWrites?: readonly LifecycleWizardDocumentWrite[]
    history?: Partial<LifecycleWizardHistoryTarget>
  }
}

const DEFAULT_STEP_IDS: LifecycleWizardStepIds = {
  information: LIFECYCLE_INFORMATION_STEP_ID,
  documents: LIFECYCLE_DOCUMENTS_STEP_ID,
}

const DEFAULT_HISTORY_TARGET: LifecycleWizardHistoryTarget = {
  tabId: LIFECYCLE_HISTORY_TAB_ID,
  fieldHistoryKey: LIFECYCLE_FIELD_HISTORY_KEY,
  eventsKey: LIFECYCLE_EVENTS_KEY,
}

export function createLifecycleWizardTemplate<TId extends string>(
  input: LifecycleWizardTemplateInput<TId>
): LifecycleWizardTemplate<TId> {
  return {
    id: input.id,
    title: input.title,
    endpoint: input.endpoint,
    submitLabel: input.submitLabel,
    stepIds: {
      ...DEFAULT_STEP_IDS,
      ...input.stepIds,
    },
    completion: {
      formWrites: input.completion?.formWrites || [],
      documentWrites: input.completion?.documentWrites || [],
      history: {
        ...DEFAULT_HISTORY_TARGET,
        ...input.completion?.history,
      },
    },
  }
}

export function lifecycleFieldWrite(
  sourceField: string,
  targetField: string,
  options: {
    label?: string
    required?: boolean
    mode?: LifecycleWizardWriteMode
  } = {}
): LifecycleWizardFieldWrite {
  return {
    sourceField,
    targetField,
    label: options.label,
    required: options.required,
    mode: options.mode || 'replace',
  }
}

export function lifecycleDocumentWrite(
  sourceField: string,
  targetField: string,
  slotId: string,
  slotTitle: string,
  options: {
    label?: string
    required?: boolean
    mode?: LifecycleWizardWriteMode
  } = {}
): LifecycleWizardDocumentWrite {
  return {
    sourceField,
    targetField,
    slotId,
    slotTitle,
    label: options.label,
    required: options.required,
    mode: options.mode || 'append',
  }
}

export function getLifecycleRequiredPayloadFields(template: LifecycleWizardTemplate) {
  const requiredFields = [
    ...template.completion.formWrites.filter(write => write.required).map(write => write.sourceField),
    ...template.completion.documentWrites.filter(write => write.required).map(write => write.sourceField),
  ]

  return Array.from(new Set(requiredFields))
}
