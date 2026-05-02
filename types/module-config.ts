import type { ReactNode } from 'react'
import type { ColumnDef, WidgetDef } from '@/components/ui/SmartDataTable'
import type { FormField, FormMode } from '@/components/ui/EntityForm'

export type EntityRelationType = 'oneToOne' | 'oneToMany' | 'manyToMany'

export interface EntityRelationConfig {
  key: string
  table: string
  foreignKey: string
  type: EntityRelationType
  label?: string
}

export interface EntityConfig {
  primaryTable: string
  primaryKey: string
  displayField?: string
  apiBasePath?: string
  relations?: EntityRelationConfig[]
}

export interface ListSortConfig {
  field: string
  direction: 'asc' | 'desc'
}

export interface ListSearchConfig {
  enabled: boolean
  fields: string[]
}

export interface ListActionConfig {
  key: string
  label: string
  permission?: string
  visibleWhen?: ConditionConfig
  disabledWhen?: ConditionConfig
}

export interface ListConfig<TRow = any> {
  title?: string
  columns: ColumnDef[]
  widgets?: WidgetDef<TRow>[]
  storageKey?: string
  defaultView?: 'list' | 'card'
  defaultPageSize?: number
  pageSizeOptions?: number[]
  defaultSort?: ListSortConfig
  search?: ListSearchConfig
  rowActions?: ListActionConfig[]
  bulkActions?: ListActionConfig[]
  createEnabled?: boolean
  exportEnabled?: boolean
  realtime?: boolean
  pollingInterval?: number
  emptyText?: string
}

export type FieldType =
  | FormField['type']
  | 'datetime'
  | 'multiSelect'
  | 'checkbox'
  | 'section'
  | 'list'
  | 'iban'
  | 'document'
  | 'workLifecycle'
  | 'switch'
  | 'currency'
  | 'relation'

export interface ValidationRuleConfig {
  type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'custom'
  value?: unknown
  message?: string
  handler?: string
}

export interface FieldConfig extends Omit<FormField, 'name' | 'type'> {
  key: string
  type: FieldType
  dataPath?: string
  readonly?: boolean
  hidden?: boolean
  defaultValue?: unknown
  optionsSource?: string
  validation?: ValidationRuleConfig[]
}

export interface UploaderSlotConfig {
  key: string
  label: string
  type: 'image' | 'document'
  multiple?: boolean
  required?: boolean
  accept?: string[]
  maxSizeMb?: number
  storagePath?: string
  relationTable?: string
  category?: string
}

export interface HeroConfig {
  mediaSlots?: UploaderSlotConfig[]
  fields: FieldConfig[]
  layout?: {
    columns?: number
  }
}

export interface RelationListTabSource {
  type: 'relationList'
  relationKey: string
  columns: ColumnDef[]
  form?: FieldConfig[]
}

export interface FieldsTabSource {
  type: 'fields'
  fields: FieldConfig[]
}

export interface CustomTabSource {
  type: 'custom'
  componentKey: string
}

export interface FormTabConfig {
  key: string
  label: string
  icon?: ReactNode
  source: FieldsTabSource | RelationListTabSource | CustomTabSource
  visibleWhen?: ConditionConfig
  disabledWhen?: ConditionConfig
}

export type SaveMode = 'direct' | 'approvalAware' | 'draftAware'

export interface LifecycleHandlerConfig {
  handler: string
}

export interface FormLifecycleConfig {
  saveMode?: SaveMode
  load?: LifecycleHandlerConfig
  beforeValidate?: LifecycleHandlerConfig
  validate?: LifecycleHandlerConfig
  beforeSave?: LifecycleHandlerConfig
  save?: LifecycleHandlerConfig
  afterSave?: LifecycleHandlerConfig
  beforeDelete?: LifecycleHandlerConfig
  delete?: LifecycleHandlerConfig
  messages?: {
    createSuccess?: string
    updateSuccess?: string
    deleteSuccess?: string
  }
  approval?: {
    enabled: boolean
    workflowKey?: string
    interceptActions?: Array<'create' | 'update' | 'delete'>
  }
}

export interface FormActionConfig {
  key: 'cancel' | 'save' | 'saveDraft' | 'submitApproval' | 'delete' | string
  label: string
  variant?: 'primary' | 'secondary' | 'danger'
  visibleWhen?: ConditionConfig
  disabledWhen?: ConditionConfig
  handler?: string
}

export interface FormConfig {
  mode: 'standard'
  entityName: string
  entityNameSingular: string
  hero: HeroConfig
  tabs?: FormTabConfig[]
  actions?: FormActionConfig[]
  lifecycle?: FormLifecycleConfig
}

export interface PermissionConfig {
  view?: string
  create?: string
  update?: string
  delete?: string
}

export interface WorkflowConfig {
  enabled?: boolean
  workflowKey?: string
}

export interface ConditionConfig {
  field?: string
  operator?: 'equals' | 'notEquals' | 'exists' | 'notExists' | 'includes'
  value?: unknown
  handler?: string
}

export interface ModuleConfig<TRow = any> {
  moduleKey: string
  title: string
  entity: EntityConfig
  list: ListConfig<TRow>
  form: FormConfig
  permissions?: PermissionConfig
  workflows?: WorkflowConfig
}

export function toEntityFormField(field: FieldConfig): FormField {
  return {
    ...field,
    name: field.key,
    type: normalizeEntityFormFieldType(field.type)
  }
}

export function toEntityFormFields(fields: FieldConfig[]): FormField[] {
  return fields
    .filter(field => !field.hidden)
    .map(toEntityFormField)
}

export function toEntityFormTabs(tabs: FormTabConfig[] = []) {
  return tabs
    .filter(tab => tab.source.type === 'fields')
    .map(tab => ({
      id: tab.key,
      label: tab.label,
      icon: tab.icon,
      fields: toEntityFormFields(tab.source.type === 'fields' ? tab.source.fields : [])
    }))
}

function normalizeEntityFormFieldType(type: FieldType): FormField['type'] {
  if (type === 'datetime') return 'date'
  if (type === 'multiSelect' || type === 'relation') return 'select'
  if (type === 'switch') return 'checkbox'
  if (type === 'currency') return 'number'
  return type
}
