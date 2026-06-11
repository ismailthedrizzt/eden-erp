import {
  branchCreatePayloadSchema,
  companyCreateWizardPayloadSchema,
  documentUploadPayloadSchema,
  employeeAssignmentChangePayloadSchema,
  employeeCreatePayloadSchema,
  employeeSgkCompletedPayloadSchema,
  employmentStartPayloadSchema,
  employmentTerminationPayloadSchema,
  genericLifecycleOperationPayloadSchema,
  ownershipTransactionPayloadSchema,
  partnerCreatePayloadSchema,
  representativeAuthorityWizardPayloadSchema,
  representativeCreatePayloadSchema,
  themeActivationPayloadSchema,
  themeAssetUploadPayloadSchema,
  themeExportPayloadSchema,
  themeImportPayloadSchema,
  themeValidationPayloadSchema,
  themesManagementPayloadSchema,
} from '../../lib/contracts/pageFlowSchemas'

const tenantId = '11111111-1111-4111-8111-111111111111'
const companyId = '22222222-2222-4222-8222-222222222222'
const entityId = '33333333-3333-4333-8333-333333333333'

export function testCompanyCreateWizardPayloadShape() {
  return companyCreateWizardPayloadSchema.parse({
    tenant_id: tenantId,
    short_name: 'Eden',
    legal_name: 'Eden Teknoloji A.S.',
    company_type: 'limited',
  })
}

export function testRepresentativeCreatePayloadShape() {
  return representativeCreatePayloadSchema.parse({
    tenant_id: tenantId,
    company_id: companyId,
    person_kind: 'person',
    display_name: 'Ismail ILGAR',
  })
}

export function testRepresentativeAuthorityWizardPayloadShape() {
  return representativeAuthorityWizardPayloadSchema.parse({
    tenant_id: tenantId,
    company_id: companyId,
    representative_id: entityId,
    transaction_type: 'grant_authority',
    effective_date: '2026-06-11',
  })
}

export function testPartnerCreatePayloadShape() {
  return partnerCreatePayloadSchema.parse({
    tenant_id: tenantId,
    company_id: companyId,
    partner_type: 'person',
    share_percentage: 25,
  })
}

export function testOwnershipTransactionPayloadShape() {
  return ownershipTransactionPayloadSchema.parse({
    tenant_id: tenantId,
    company_id: companyId,
    partner_id: entityId,
    transaction_type: 'share_transfer',
    effective_date: '2026-06-11',
  })
}

export function testBranchCreatePayloadShape() {
  return branchCreatePayloadSchema.parse({
    tenant_id: tenantId,
    company_id: companyId,
    name: 'Ankara',
    branch_type: 'registered',
  })
}

export function testDocumentUploadPayloadShape() {
  return documentUploadPayloadSchema.parse({
    tenant_id: tenantId,
    entity_id: companyId,
    document_type: 'signature_circular',
  })
}

export function testEmployeeCreatePayloadShape() {
  return employeeCreatePayloadSchema.parse({
    tenant_id: tenantId,
    person_id: entityId,
    first_name: 'Ismail',
    last_name: 'ILGAR',
  })
}

export function testEmploymentStartPayloadShape() {
  return employmentStartPayloadSchema.parse({
    tenant_id: tenantId,
    employee_id: entityId,
    company_id: companyId,
    employment_type: 'full_time',
    start_date: '2026-06-11',
    sgk_status: 'pending',
  })
}

export function testEmploymentTerminationPayloadShape() {
  return employmentTerminationPayloadSchema.parse({
    tenant_id: tenantId,
    employee_id: entityId,
    end_date: '2026-06-11',
    termination_reason: 'Contract ended',
    sgk_status: 'pending',
  })
}

export function testEmployeeAssignmentChangePayloadShape() {
  return employeeAssignmentChangePayloadSchema.parse({
    tenant_id: tenantId,
    employee_id: entityId,
    effective_date: '2026-06-11',
    job_title: 'Operations Lead',
  })
}

export function testEmployeeSgkEntryCompletedPayloadShape() {
  return employeeSgkCompletedPayloadSchema.parse({
    tenant_id: tenantId,
    employee_id: entityId,
    completed_date: '2026-06-11',
    reference_no: 'SGK-ENTRY-1',
  })
}

export function testEmployeeSgkExitCompletedPayloadShape() {
  return employeeSgkCompletedPayloadSchema.parse({
    tenant_id: tenantId,
    employee_id: entityId,
    completed_date: '2026-06-11',
    reference_no: 'SGK-EXIT-1',
  })
}

export function testThemesManagementPayloadShape() {
  return themesManagementPayloadSchema.parse({
    tenant_id: tenantId,
    theme_key: 'hikmet',
    display_name: 'Hikmet',
    status: 'draft',
    theme_json: { meta: { scope: 'system' } },
  })
}

export function testThemeImportPayloadShape() {
  return themeImportPayloadSchema.parse({
    tenant_id: tenantId,
    theme_key: 'hikmet',
    import_text: '{"schemaVersion":"1.0.0"}',
    source_type: 'eden_theme_json',
  })
}

export function testThemeValidationPayloadShape() {
  return themeValidationPayloadSchema.parse({
    tenant_id: tenantId,
    theme_key: 'hikmet',
    theme_json: { meta: { scope: 'system' } },
  })
}

export function testThemeActivationPayloadShape() {
  return themeActivationPayloadSchema.parse({
    tenant_id: tenantId,
    theme_key: 'hikmet',
    validation_passed: true,
    deactivate_existing_active_theme: true,
  })
}

export function testThemeExportPayloadShape() {
  return themeExportPayloadSchema.parse({
    tenant_id: tenantId,
    theme_key: 'hikmet',
    format: 'eden',
  })
}

export function testThemeAssetUploadPayloadShape() {
  return themeAssetUploadPayloadSchema.parse({
    tenant_id: tenantId,
    theme_key: 'hikmet',
    slot_id: 'light_page_banner',
    asset_kind: 'image',
    asset_ref: { path: 'themes/hikmet/light-banner.svg' },
  })
}

export function testGenericLifecycleOperationPayloadShape() {
  return genericLifecycleOperationPayloadSchema.parse({
    tenant_id: tenantId,
    operation_type: 'representative_authority',
    entity_type: 'representative',
    entity_id: entityId,
    lifecycle_state: 'submitted',
    payload_json: { company_id: companyId },
  })
}
