export interface DomainOwnershipDefinition {
  domainKey: string
  label: string
  ownsEntities: string[]
  ownsTables: string[]
  ownsOperations: string[]
  publishesEvents: string[]
  consumesEvents: string[]
}

export interface DomainOwnershipAssertion {
  ok: boolean
  domainKey: string
  entityType: string
  ownerDomainKey?: string
  message?: string
}

export const allDomainOwnershipDefinitions: DomainOwnershipDefinition[] = [
  {
    domainKey: 'company',
    label: 'Company Domain',
    ownsEntities: [
      'company',
      'company_lifecycle_event',
      'company_opening_detail',
      'company_liquidation_detail',
      'company_deregistration_detail',
      'company_official_change_transaction',
    ],
    ownsTables: [
      'companies',
      'company_lifecycle_events',
      'company_opening_details',
      'company_liquidation_details',
      'company_deregistration_details',
      'company_official_change_transactions',
    ],
    ownsOperations: [
      'company_opening',
      'company_liquidation',
      'company_deregistration',
      'title_change',
      'address_change',
      'public_registration_update',
      'nace_change',
      'activity_subject_change',
      'capital_increase',
      'branch_opening_start',
    ],
    publishesEvents: [
      'company.created',
      'company.updated',
      'company.opened',
      'company.liquidation_started',
      'company.deregistered',
      'company.title_changed',
      'company.address_changed',
      'company.public_registration_updated',
      'company.capital_increased',
      'company.nace_changed',
      'company.activity_subject_changed',
    ],
    consumesEvents: [
      'ownership.transaction_completed',
      'representative.authority_updated',
      'company.branch_opened',
      'company.branch_closed',
    ],
  },
  {
    domainKey: 'ownership',
    label: 'Ownership Domain',
    ownsEntities: [
      'company_partner',
      'ownership_transaction',
      'current_ownership',
      'partner_ownership_lifecycle_event',
    ],
    ownsTables: [
      'company_partners',
      'ownership_transactions',
      'v_current_ownership',
      'partner_ownership_lifecycle_events',
    ],
    ownsOperations: [
      'create_partner_draft',
      'initial_partnership_entry',
      'share_transfer',
      'ownership_exit',
      'ownership_correction',
      'capital_increase_ownership_impact',
    ],
    publishesEvents: [
      'partner.created',
      'partner.updated',
      'ownership.transaction_created',
      'ownership.transaction_approved',
      'ownership.transaction_completed',
      'ownership.transaction_cancelled',
      'ownership.transaction_reversed',
    ],
    consumesEvents: ['company.opened', 'company.capital_increased', 'company.deregistered'],
  },
  {
    domainKey: 'representatives',
    label: 'Representative Authority Domain',
    ownsEntities: [
      'company_representative',
      'representative_authority',
      'representative_authority_transaction',
      'current_representative_authority',
    ],
    ownsTables: [
      'company_representatives',
      'company_representative_authority_transactions',
      'representative_authority_transactions',
      'v_current_representative_authorities',
    ],
    ownsOperations: [
      'create_representative_draft',
      'representative_start',
      'representative_authority_scope_change',
      'representative_authority_update',
      'representative_limit_change',
      'representative_suspend',
      'representative_terminate',
      'representative_correction',
    ],
    publishesEvents: [
      'representative.created',
      'representative.updated',
      'representative.authority_started',
      'representative.authority_updated',
      'representative.authority_suspended',
      'representative.authority_terminated',
    ],
    consumesEvents: ['company.opened', 'company.branch_closed', 'organization.unit_closed', 'facility.deactivated'],
  },
  {
    domainKey: 'branches',
    label: 'Branch Domain',
    ownsEntities: ['company_branch', 'branch_official_change'],
    ownsTables: ['company_branches'],
    ownsOperations: ['branch_opening', 'branch_closing', 'branch_document_update'],
    publishesEvents: [
      'company.branch_opened',
      'company.branch_closed',
      'company.branch_documents_updated',
      'company.branch_updated',
    ],
    consumesEvents: ['company.opened', 'company.deregistered', 'representative.authority_updated'],
  },
  {
    domainKey: 'organization',
    label: 'Organization Domain',
    ownsEntities: ['organization_unit', 'organization_unit_type', 'position', 'org_hierarchy'],
    ownsTables: ['organization_units', 'organization_unit_types', 'positions'],
    ownsOperations: [
      'create_organization_unit',
      'update_organization_structure',
      'manage_positions',
      'assign_staff_to_unit',
    ],
    publishesEvents: ['organization.unit_created', 'organization.unit_updated', 'organization.unit_closed'],
    consumesEvents: ['company.branch_opened', 'company.branch_closed'],
  },
  {
    domainKey: 'facilities',
    label: 'Facility / Location Domain',
    ownsEntities: ['facility', 'location', 'facility_lifecycle_event'],
    ownsTables: ['facilities', 'company_facilities', 'locations', 'facility_lifecycle_events'],
    ownsOperations: ['create_facility', 'link_facility_to_branch', 'deactivate_facility', 'reuse_facility'],
    publishesEvents: ['facility.created', 'facility.linked_to_branch', 'facility.deactivated'],
    consumesEvents: ['company.branch_opened', 'company.branch_closed'],
  },
  {
    domainKey: 'accounting',
    label: 'Accounting Domain',
    ownsEntities: ['account_card', 'account_movement', 'bank_account', 'invoice', 'payment', 'collection'],
    ownsTables: [
      'accounting_accounts',
      'account_movements',
      'bank_accounts',
      'bank_cards',
      'financial_institution_movements',
      'invoices',
      'payments',
      'collections',
    ],
    ownsOperations: ['create_account_card', 'post_payment', 'post_collection', 'reconcile_capital_payment'],
    publishesEvents: ['accounting.payment_posted', 'accounting.collection_posted', 'accounting.reconciliation_completed'],
    consumesEvents: ['company.capital_increased', 'ownership.transaction_completed'],
  },
  {
    domainKey: 'hr',
    label: 'HR Domain',
    ownsEntities: ['employee', 'employment_lifecycle_event', 'employee_assignment'],
    ownsTables: ['employees', 'employee_work_lifecycle_events', 'employee_assignments'],
    ownsOperations: ['create_employee', 'start_employment', 'end_employment', 'assign_employee'],
    publishesEvents: ['hr.employee_created', 'hr.employment_started', 'hr.employment_ended'],
    consumesEvents: ['organization.unit_closed', 'facility.deactivated'],
  },
  {
    domainKey: 'projects',
    label: 'Project / Task Domain',
    ownsEntities: ['project_project', 'project_task', 'project_task_comment', 'project_task_attachment', 'issue'],
    ownsTables: ['project_projects', 'project_tasks', 'project_task_comments', 'project_task_attachments', 'project_task_history'],
    ownsOperations: ['create_project', 'update_project', 'complete_project', 'cancel_project', 'create_project_task', 'assign_project_task', 'transition_project_task', 'comment_project_task', 'attach_project_task'],
    publishesEvents: ['project.created', 'task.created', 'task.updated', 'task.transitioned', 'task.assigned', 'task.commented', 'task.attachment_added'],
    consumesEvents: ['organization.unit_updated', 'hr.employee.created', 'company.branch_closed'],
  },
  {
    domainKey: 'product_services',
    label: 'Product / Service Catalog Domain',
    ownsEntities: ['product_catalog', 'product', 'service_product'],
    ownsTables: ['product_catalog'],
    ownsOperations: ['create_product', 'update_product'],
    publishesEvents: ['product.created', 'product.updated'],
    consumesEvents: ['accounting.price_updated'],
  },
  {
    domainKey: 'after_sales',
    label: 'After-Sales Service Domain',
    ownsEntities: ['after_sales_installed_asset', 'after_sales_service_request', 'after_sales_service_record', 'installed_asset'],
    ownsTables: ['after_sales_installed_assets', 'after_sales_service_requests', 'after_sales_service_records'],
    ownsOperations: ['create_installed_asset', 'create_service_request', 'assign_service_request', 'create_service_record', 'complete_service_record', 'create_followup_task'],
    publishesEvents: ['after_sales.asset_created', 'after_sales.request_created', 'after_sales.service_completed'],
    consumesEvents: ['product.updated', 'task.transitioned', 'accounting.invoice_posted'],
  },
  {
    domainKey: 'crm',
    label: 'CRM / Stakeholder Master Data Domain',
    ownsEntities: ['master_person', 'master_organization', 'crm_stakeholder', 'crm_interaction', 'stakeholder', 'lead'],
    ownsTables: ['master_persons', 'master_organizations', 'crm_stakeholders', 'crm_interactions'],
    ownsOperations: ['create_stakeholder', 'update_stakeholder', 'create_customer', 'create_supplier', 'create_lead', 'create_interaction', 'create_cari_from_stakeholder', 'create_followup_task', 'link_existing_master_record'],
    publishesEvents: ['crm.stakeholder_created', 'crm.interaction_created', 'crm.followup_task_created'],
    consumesEvents: ['accounting.cari_account_created', 'task.created', 'after_sales.asset_created', 'hr.employee_created'],
  },
  {
    domainKey: 'reporting',
    label: 'Reporting / Dashboard Domain',
    ownsEntities: ['report_definition', 'dashboard_kpi', 'report_result', 'report_export_request'],
    ownsTables: [],
    ownsOperations: ['open_management_dashboard', 'query_report', 'export_report'],
    publishesEvents: ['report.query_executed', 'report.export_requested'],
    consumesEvents: ['projection.refresh_requested', 'action_center.item_resolved', 'audit.recorded', 'task.updated'],
  },
  {
    domainKey: 'documents',
    label: 'Document Domain',
    ownsEntities: ['document', 'entity_document', 'media_asset', 'upload'],
    ownsTables: ['documents', 'entity_documents', 'media_assets', 'uploads'],
    ownsOperations: ['document_upload', 'document_delete', 'document_version_update'],
    publishesEvents: ['document.uploaded', 'document.deleted', 'document.version_updated'],
    consumesEvents: ['company.branch_documents_updated', 'representative.authority_updated'],
  },
  {
    domainKey: 'notifications',
    label: 'Notification / Action Center Domain',
    ownsEntities: ['notification', 'action_center_item'],
    ownsTables: ['notifications', 'pending_actions'],
    ownsOperations: ['notify_user', 'dismiss_action_item', 'resolve_action_item'],
    publishesEvents: ['notification.created', 'action_center.item_resolved'],
    consumesEvents: ['process.task_created', 'process.approval_requested', 'audit.recorded'],
  },
  {
    domainKey: 'process',
    label: 'Process Domain',
    ownsEntities: ['process_instance', 'process_task', 'process_approval', 'process_event'],
    ownsTables: ['process_instances', 'process_tasks', 'process_approvals', 'process_events'],
    ownsOperations: ['start_process', 'complete_process_step', 'approve_process', 'reject_process', 'cancel_process'],
    publishesEvents: [
      'process.started',
      'process.step_completed',
      'process.task_created',
      'process.approval_requested',
      'process.approved',
      'process.rejected',
      'process.completed',
      'process.cancelled',
      'process.failed',
    ],
    consumesEvents: ['company.branch_opened', 'company.branch_closed'],
  },
  {
    domainKey: 'audit',
    label: 'Audit / Compliance Domain',
    ownsEntities: ['audit_log'],
    ownsTables: ['audit_logs'],
    ownsOperations: ['record_audit', 'list_audit_logs'],
    publishesEvents: ['audit.recorded'],
    consumesEvents: ['*'],
  },
  {
    domainKey: 'outbox',
    label: 'Event / Outbox Domain',
    ownsEntities: ['outbox_event', 'outbox_handler_run'],
    ownsTables: ['outbox_events', 'outbox_event_handler_runs'],
    ownsOperations: ['enqueue_event', 'dispatch_outbox_event', 'retry_outbox_event'],
    publishesEvents: ['projection.refresh_requested', 'notification.created', 'ai_context.refresh_requested'],
    consumesEvents: ['*'],
  },
  {
    domainKey: 'setup',
    label: 'Setup / Module Runtime Domain',
    ownsEntities: ['module_license', 'module_readiness', 'workspace_setting'],
    ownsTables: ['module_licenses', 'tenant_settings', 'system_parameters'],
    ownsOperations: ['check_module_readiness', 'run_setup_action', 'update_module_license'],
    publishesEvents: ['setup.module_ready', 'setup.module_blocked'],
    consumesEvents: ['audit.recorded'],
  },
  {
    domainKey: 'ai_action_guide',
    label: 'AI Action Guide Domain',
    ownsEntities: ['action_guide_definition', 'action_intent_match'],
    ownsTables: [],
    ownsOperations: ['resolve_action_guide', 'match_action_intent'],
    publishesEvents: ['ai_context.refresh_requested'],
    consumesEvents: ['company.updated', 'process.task_created', 'action_center.item_resolved'],
  },
]

function normalizeKey(value: string) {
  return value.trim().toLowerCase()
}

function includesKey(values: string[], value: string) {
  const normalizedValue = normalizeKey(value)
  return values.some(item => normalizeKey(item) === normalizedValue)
}

export function listDomainOwnership() {
  return allDomainOwnershipDefinitions
}

export function getDomainForEntity(entityType: string) {
  return allDomainOwnershipDefinitions.find(definition => includesKey(definition.ownsEntities, entityType)) ?? null
}

export function getDomainForTable(tableName: string) {
  return allDomainOwnershipDefinitions.find(definition => includesKey(definition.ownsTables, tableName)) ?? null
}

export function getDomainForOperation(operationKey: string) {
  return allDomainOwnershipDefinitions.find(definition => includesKey(definition.ownsOperations, operationKey)) ?? null
}

export function assertDomainOwnsEntity(domainKey: string, entityType: string): DomainOwnershipAssertion {
  const owner = getDomainForEntity(entityType)

  if (!owner) {
    return {
      ok: false,
      domainKey,
      entityType,
      message: `Entity ownership is not registered for ${entityType}.`,
    }
  }

  if (normalizeKey(owner.domainKey) !== normalizeKey(domainKey)) {
    return {
      ok: false,
      domainKey,
      entityType,
      ownerDomainKey: owner.domainKey,
      message: `${entityType} is owned by ${owner.domainKey}, not ${domainKey}.`,
    }
  }

  return {
    ok: true,
    domainKey,
    entityType,
    ownerDomainKey: owner.domainKey,
  }
}
