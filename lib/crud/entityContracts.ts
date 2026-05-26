type EntityFieldTargetKind = 'main' | 'master' | 'relation' | 'virtual'
type EntityMasterKind = 'person' | 'organization'
type EntityRelationMode = 'syncOne' | 'syncMany' | 'replaceMany' | 'appendMany' | 'readOnly'
type EntityCrudOperation = 'create' | 'read' | 'update' | 'delete'

export type EntityContractKey = 'company' | 'employee' | 'companyPartner' | 'ownershipTransaction'

export interface EntityFieldCondition {
  field: string
  equals?: unknown
  notEquals?: unknown
  in?: unknown[]
}

export interface EntityFieldTarget {
  kind: EntityFieldTargetKind
  tableName?: string
  column?: string
  masterKind?: EntityMasterKind
  relationMode?: EntityRelationMode
  relationKey?: string
  foreignKey?: string
  condition?: EntityFieldCondition
  note?: string
}

export interface EntityFieldContract {
  name: string
  targets: EntityFieldTarget[]
  requiredOn?: Array<'create' | 'update'>
  operations?: EntityCrudOperation[]
  aliases?: string[]
  note?: string
}

export interface EntityContract {
  key: EntityContractKey
  label: string
  tableName: string
  primaryKey: string
  endpoint: {
    collectionPath: string
    recordPath?: string
  }
  lifecycle?: {
    statusFields: string[]
    draftValues: string[]
    passiveValues: string[]
  }
  permissions?: Partial<Record<EntityCrudOperation, string | string[]>>
  fields: Record<string, EntityFieldContract>
}

export interface EntityPayloadBuckets {
  main: Record<string, unknown>
  masters: Record<string, Record<string, unknown>>
  relations: Record<string, unknown>
  virtual: Record<string, unknown>
  unknown: Record<string, unknown>
}

const companyMainFields = [
  'organization_id',
  'trade_name',
  'short_name',
  'tax_number',
  'tax_office',
  'mersis_number',
  'trade_registry_number',
  'foundation_date',
  'company_type',
  'country',
  'city',
  'district',
  'address',
  'phone',
  'email',
  'website',
  'legal_entity',
  'electronic_notification_address',
  'trade_registry_office',
  'parent_company_id',
  'company_code',
  'e_invoice_taxpayer',
  'e_archive_taxpayer',
  'e_waybill_taxpayer',
  'sgk_workplace_registry_no',
  'sgk_province',
  'sgk_branch',
  'nace_codes',
  'risk_class',
  'activity_subject',
  'default_currency',
  'default_language',
  'time_zone',
  'fiscal_year_start',
  'is_deleted',
  'record_status',
  'company_status',
  'hero_images',
  'hero_documents',
  'field_history',
]

const organizationMasterFields = [
  'contact_points',
  'beneficiary_full_name',
  'beneficiary_address',
  'beneficiary_iban',
  'beneficiary_account_no',
  'beneficiary_iban_or_account_no',
  'beneficiary_bank_code',
  'beneficiary_swift_bic',
  'beneficiary_bank_name',
  'beneficiary_bank_address',
  'beneficiary_currency',
]

const employeeMainFields = [
  'person_id',
  'employee_no',
  'first_name',
  'last_name',
  'nationality',
  'national_id',
  'passport_no',
  'gender',
  'birth_place',
  'birth_date',
  'phones',
  'emails',
  'mobile_phone',
  'work_phone',
  'email',
  'address',
  'city',
  'district',
  'emergency_contact_first_name',
  'emergency_contact_last_name',
  'emergency_contact_relationship',
  'emergency_contact_phone',
  'sgk_entry_date',
  'exit_date',
  'sgk_entry_method',
  'sgk_entry_reference_no',
  'sgk_entry_reported_by',
  'sgk_entry_insurance_branch',
  'sgk_entry_duty_code',
  'sgk_entry_occupation_code',
  'sgk_entry_csgb_business_line',
  'sgk_entry_has_disability',
  'sgk_entry_has_prior_conviction',
  'sgk_entry_education_code',
  'sgk_entry_graduation_year',
  'sgk_entry_graduation_department',
  'sgk_entry_partial_day_count',
  'sgk_exit_method',
  'sgk_exit_reference_no',
  'sgk_exit_reported_by',
  'sgk_exit_reason',
  'sgk_exit_occupation_code',
  'sgk_exit_csgb_business_line',
  'sgk_exit_percentage_wage_method',
  'sgk_exit_previous_document_type',
  'sgk_exit_previous_earned_wage',
  'sgk_exit_current_document_type',
  'sgk_exit_current_earned_wage',
  'work_status',
  'work_type',
  'employment_contract_type',
  'marital_status',
  'company_id',
  'unit_id',
  'position_id',
  'job_title',
  'is_illiterate',
  'education_schools',
  'foreign_languages',
  'certificates',
  'relatives',
  'entry_documents',
  'exit_documents',
  'top_size',
  'bottom_size',
  'shoe_size',
  'kep',
  'iban',
  'notes',
  'photo_url',
  'cv_document',
  'diploma_document',
  'record_status',
  'employment_status',
  'field_history',
  'version',
]

const personMasterFields = [
  'first_name',
  'last_name',
  'full_name',
  'nationality',
  'national_id',
  'passport_no',
  'gender',
  'birth_place',
  'birth_date',
  'occupation',
  'phone',
  'mobile_phone',
  'work_phone',
  'email',
  'phones',
  'emails',
  'address',
  'city',
  'district',
  'photo_logo',
  'education_schools',
  'foreign_languages',
  'certificates',
  'marital_status',
  'relatives',
  'iban',
]

const partnerMainFields = [
  'company_id',
  'person_id',
  'organization_id',
  'partner_type',
  'owner_kind',
  'source_type',
  'source_id',
  'display_name',
  'partner_name',
  'identity_number',
  'identity_tax_number',
  'share_ratio',
  'voting_ratio',
  'profit_ratio',
  'start_date',
  'end_date',
  'status',
  'record_status',
  'has_representation_right',
  'signature_authority',
  'has_control_right',
  'control_type',
  'has_board_nomination_right',
  'has_veto_right',
  'has_privileged_share',
  'beneficial_owner',
  'is_beneficial_owner',
  'beneficial_ratio',
  'is_ultimate_controller',
  'share_units',
  'nominal_value',
  'capital_amount',
  'share_class',
  'notes',
  'history',
  'photo_logo',
  'partner_documents',
  'partner_profile',
]

const partnerPersonMasterFields = [
  'first_name',
  'last_name',
  'nationality_country',
  'nationality',
  'national_id',
  'passport_no',
  'birth_date',
  'birth_place',
  'gender',
  'occupation',
  'is_illiterate',
  'education_schools',
  'foreign_languages',
  'certificates',
  'relatives',
  'marital_status',
  'phone',
  'email',
  'phones',
  'emails',
  'address',
  'city',
  'district',
  'country',
  'emergency_contact_first_name',
  'emergency_contact_last_name',
  'emergency_contact_relationship',
  'emergency_contact_phone',
]

const partnerOrganizationMasterFields = [
  'trade_name',
  'short_name',
  'foundation_date',
  'company_type',
  'mersis_number',
  'trade_registry_no',
  'tax_number',
  'tax_office',
  'e_invoice_status',
  'phone',
  'email',
  'phones',
  'emails',
  'address',
  'city',
  'district',
  'country',
  ...organizationMasterFields,
]

const ownershipTransactionMainFields = [
  'company_id',
  'transaction_no',
  'transaction_type',
  'transaction_date',
  'effective_date',
  'from_partner_id',
  'to_partner_id',
  'affected_partner_id',
  'share_ratio',
  'voting_ratio',
  'profit_ratio',
  'share_units',
  'nominal_value',
  'capital_amount',
  'transfer_price',
  'currency',
  'has_control_right',
  'control_type',
  'has_veto_right',
  'has_board_nomination_right',
  'has_privileged_share',
  'privilege_type',
  'privilege_description',
  'privilege_start_date',
  'privilege_end_date',
  'removed_privilege_type',
  'removal_date',
  'old_voting_ratio',
  'new_voting_ratio',
  'old_profit_ratio',
  'new_profit_ratio',
  'is_beneficial_owner',
  'beneficial_ratio',
  'committed_capital_amount',
  'new_capital_amount',
  'commitment_date',
  'capital_distribution',
  'correction_transaction_id',
  'correction_reason',
  'new_values',
  'reversal_transaction_id',
  'reversal_reason',
  'document_status',
  'document_reference_id',
  'decision_reference_id',
  'document_files',
  'status',
  'approval_status',
  'workflow_status',
  'description',
  'transaction_reason',
  'exit_reason',
  'justification',
  'notes',
  'warnings',
  'history',
  'approval_notes',
  'rejection_reason',
  'approved_by',
  'approved_at',
  'is_deleted',
  'deleted_at',
  'deleted_by',
  'version',
]

export const entityContracts = {
  company: {
    key: 'company',
    label: 'Company',
    tableName: 'companies',
    primaryKey: 'id',
    endpoint: { collectionPath: '/api/companies' },
    lifecycle: {
      statusFields: ['record_status', 'company_status'],
      draftValues: ['draft'],
      passiveValues: ['passive'],
    },
    permissions: {
      create: 'companies.edit',
      read: 'companies.view',
      update: 'companies.edit',
      delete: 'companies.edit',
    },
    fields: {
      ...fields(companyMainFields, mainTarget('companies')),
      ...fields(organizationMasterFields, masterTarget('organization', 'organizations')),
      partners: relationField('partners', 'company_partners', 'replaceMany', 'company_id'),
      representatives: relationField('representatives', 'company_representatives', 'replaceMany', 'company_id'),
      stakeholders: relationField('stakeholders', 'stakeholders', 'replaceMany', 'company_id'),
      public_tax: relationField('public_tax', 'company_public_tax', 'syncOne', 'company_id'),
      public_sgk: relationField('public_sgk', 'company_public_sgk', 'syncOne', 'company_id'),
      public_incentives: relationField('public_incentives', 'company_public_incentives', 'syncOne', 'company_id'),
      public_registry: relationField('public_registry', 'company_public_registry', 'syncOne', 'company_id'),
      public_licenses: relationField('public_licenses', 'company_public_licenses', 'replaceMany', 'company_id'),
      public_channels: relationField('public_channels', 'company_public_channels', 'syncOne', 'company_id'),
      company_nace_codes: relationField('company_nace_codes', 'company_nace_codes', 'replaceMany', 'company_id'),
      entity_bank_accounts: relationField('entity_bank_accounts', 'entity_bank_accounts', 'syncMany', 'organization_id'),
      logos: relationField('logos', 'company_logos', 'readOnly', 'company_id'),
      documents: virtualField('documents', 'Composed from document/media slots.'),
    },
  },
  employee: {
    key: 'employee',
    label: 'Employee',
    tableName: 'employees',
    primaryKey: 'id',
    endpoint: { collectionPath: '/api/employees' },
    lifecycle: {
      statusFields: ['record_status', 'employment_status', 'work_status'],
      draftValues: ['draft', 'pending_entry'],
      passiveValues: ['passive', 'terminated'],
    },
    permissions: {
      create: 'employees.edit',
      read: 'employees.view',
      update: 'employees.edit',
      delete: 'employees.edit',
    },
    fields: {
      ...fields(employeeMainFields, mainTarget('employees')),
      ...fields(personMasterFields, masterTarget('person', 'persons')),
      occupation: field('occupation', [masterTarget('person', 'persons')], {
        note: 'Master-only in current employee mutation flow.',
      }),
      entity_bank_accounts: relationField('entity_bank_accounts', 'entity_bank_accounts', 'syncMany', 'person_id'),
      unit: relationField('unit', 'organization_units', 'readOnly', 'unit_id'),
      position: relationField('position', 'positions', 'readOnly', 'position_id'),
    },
  },
  companyPartner: {
    key: 'companyPartner',
    label: 'Company partner',
    tableName: 'company_partners',
    primaryKey: 'id',
    endpoint: { collectionPath: '/api/companies/partners' },
    lifecycle: {
      statusFields: ['record_status', 'status'],
      draftValues: ['draft', 'taslak'],
      passiveValues: ['passive', 'pasif'],
    },
    permissions: {
      create: ['partners.edit', 'companies.edit'],
      read: ['partners.view', 'companies.view'],
      update: ['partners.edit', 'companies.edit'],
      delete: ['partners.delete', 'partners.edit', 'companies.edit'],
    },
    fields: {
      ...fields(partnerMainFields, mainTarget('company_partners')),
      ...fields(partnerPersonMasterFields, masterTarget('person', 'persons', { field: 'partner_type', equals: 'person' })),
      ...fields(partnerPersonMasterFields, masterTarget('person', 'persons', { field: 'owner_kind', equals: 'person' })),
      ...fields(partnerOrganizationMasterFields, masterTarget('organization', 'organizations', { field: 'partner_type', equals: 'organization' })),
      ...fields(partnerOrganizationMasterFields, masterTarget('organization', 'organizations', { field: 'owner_kind', equals: 'organization' })),
      identity_number: field('identity_number', [
        mainTarget('company_partners'),
        masterTarget('person', 'persons', { field: 'partner_type', equals: 'person' }, 'national_id'),
        masterTarget('organization', 'organizations', { field: 'partner_type', equals: 'organization' }, 'tax_number'),
      ]),
      entity_bank_accounts: relationField('entity_bank_accounts', 'entity_bank_accounts', 'syncMany', 'person_id/organization_id'),
      ownership_transaction_history: relationField('ownership_transaction_history', 'ownership_transactions', 'readOnly', 'partner_id'),
      partner_ownership_lifecycle_events: relationField('partner_ownership_lifecycle_events', 'partner_ownership_lifecycle_events', 'appendMany', 'partner_id'),
      representative_authorities: virtualField('representative_authorities', 'Computed/display field for partner screens.'),
      ownership_action: virtualField('ownership_action', 'Command flag used to create lifecycle events.'),
    },
  },
  ownershipTransaction: {
    key: 'ownershipTransaction',
    label: 'Ownership transaction',
    tableName: 'ownership_transactions',
    primaryKey: 'id',
    endpoint: { collectionPath: '/api/ownership-transactions' },
    lifecycle: {
      statusFields: ['approval_status', 'workflow_status', 'status'],
      draftValues: ['draft'],
      passiveValues: ['passive', 'cancelled', 'rejected'],
    },
    permissions: {
      create: ['ownership_transactions.edit', 'companies.edit'],
      read: ['ownership_transactions.view', 'companies.view'],
      update: ['ownership_transactions.edit', 'companies.edit'],
      delete: ['ownership_transactions.edit', 'companies.edit'],
    },
    fields: {
      ...fields(ownershipTransactionMainFields, mainTarget('ownership_transactions')),
      company: relationField('company', 'companies', 'readOnly', 'company_id'),
      from_partner: relationField('from_partner', 'company_partners', 'readOnly', 'from_partner_id'),
      to_partner: relationField('to_partner', 'company_partners', 'readOnly', 'to_partner_id'),
      affected_partner: relationField('affected_partner', 'company_partners', 'readOnly', 'affected_partner_id'),
      current_ownership: relationField('current_ownership', 'v_current_ownership', 'readOnly', 'company_id'),
      account_movements: relationField('account_movements', 'account_movements', 'readOnly', 'linked_ownership_transaction_id'),
      photo_logo: virtualField('photo_logo', 'Displayed from selected partner, not persisted on transaction.'),
    },
  },
} satisfies Record<EntityContractKey, EntityContract>

export function getEntityContract(key: EntityContractKey) {
  return entityContracts[key]
}

export function getEntityFieldContract(contract: EntityContract, fieldName: string) {
  return contract.fields[fieldName] || findAlias(contract, fieldName)
}

export function splitEntityPayload(contract: EntityContract, payload: Record<string, unknown>): EntityPayloadBuckets {
  const buckets: EntityPayloadBuckets = {
    main: {},
    masters: {},
    relations: {},
    virtual: {},
    unknown: {},
  }

  Object.entries(payload).forEach(([fieldName, value]) => {
    const fieldContract = getEntityFieldContract(contract, fieldName)
    if (!fieldContract) {
      buckets.unknown[fieldName] = value
      return
    }

    const targets = fieldContract.targets.filter(target => targetApplies(target, payload))
    if (targets.length === 0) {
      buckets.virtual[fieldName] = value
      return
    }

    targets.forEach(target => {
      const column = target.column || fieldContract.name
      if (target.kind === 'main') {
        buckets.main[column] = value
        return
      }

      if (target.kind === 'master') {
        const key = target.masterKind || target.tableName || 'master'
        buckets.masters[key] = buckets.masters[key] || {}
        buckets.masters[key][column] = value
        return
      }

      if (target.kind === 'relation') {
        buckets.relations[target.relationKey || target.tableName || fieldContract.name] = value
        return
      }

      buckets.virtual[fieldContract.name] = value
    })
  })

  return buckets
}

export function getUnknownEntityPayloadFields(contract: EntityContract, payload: Record<string, unknown>) {
  return Object.keys(splitEntityPayload(contract, payload).unknown)
}

export function assertKnownEntityPayload(contract: EntityContract, payload: Record<string, unknown>) {
  const unknownFields = getUnknownEntityPayloadFields(contract, payload)
  if (unknownFields.length > 0) {
    throw new Error(`${contract.key} payload contains unknown fields: ${unknownFields.join(', ')}`)
  }
}

function fields(names: string[], target: EntityFieldTarget): Record<string, EntityFieldContract> {
  return Object.fromEntries(names.map(name => [name, field(name, [target])]))
}

function field(name: string, targets: EntityFieldTarget[], extra: Partial<EntityFieldContract> = {}): EntityFieldContract {
  return { name, targets, ...extra }
}

function mainTarget(tableName: string, column?: string): EntityFieldTarget {
  return { kind: 'main', tableName, column }
}

function masterTarget(
  masterKind: EntityMasterKind,
  tableName: string,
  condition?: EntityFieldCondition,
  column?: string
): EntityFieldTarget {
  return { kind: 'master', masterKind, tableName, condition, column }
}

function relationField(
  name: string,
  tableName: string,
  relationMode: EntityRelationMode,
  foreignKey?: string
): EntityFieldContract {
  return field(name, [{ kind: 'relation', tableName, relationMode, relationKey: name, foreignKey }])
}

function virtualField(name: string, note?: string): EntityFieldContract {
  return field(name, [{ kind: 'virtual', note }], { note })
}

function findAlias(contract: EntityContract, fieldName: string) {
  return Object.values(contract.fields).find(field => field.aliases?.includes(fieldName))
}

function targetApplies(target: EntityFieldTarget, payload: Record<string, unknown>) {
  if (!target.condition) return true
  const value = payload[target.condition.field]

  if ('equals' in target.condition && value !== target.condition.equals) return false
  if ('notEquals' in target.condition && value === target.condition.notEquals) return false
  if (target.condition.in && !target.condition.in.includes(value)) return false

  return true
}
