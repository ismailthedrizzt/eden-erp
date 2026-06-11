type HappyPathContract = {
  route: string
  actions: string[]
  expectedPayloadKeys: string[]
}

function contract(route: string, actions: string[], expectedPayloadKeys: string[]): HappyPathContract {
  return { route, actions, expectedPayloadKeys }
}

export const testCompanyCreateWizardHappyPath = contract('/app/sirket/companies', [
  'open-create-form',
  'fill-company-identity',
  'submit',
  'expect-created-record',
], ['short_name', 'legal_name', 'company_type'])

export const testRepresentativeCreateHappyPath = contract('/app/sirket/companies/representatives', [
  'open-create-form',
  'select-company',
  'fill-representative-identity',
  'submit',
  'expect-draft-record',
], ['company_id', 'person_kind', 'display_name'])

export const testRepresentativeAuthorityHappyPath = contract('/app/sirket/companies/representatives', [
  'select-representative',
  'open-authority-wizard',
  'fill-authority-scope',
  'preview',
  'submit',
  'expect-operation-request',
], ['company_id', 'representative_id', 'transaction_type', 'effective_date'])

export const testPartnerCreateHappyPath = contract('/app/sirket/companies/partners', [
  'open-create-form',
  'select-company',
  'fill-partner-fields',
  'submit',
  'expect-partner-record',
], ['company_id', 'partner_type', 'share_percentage'])

export const testOwnershipLifecycleHappyPath = contract('/app/sirket/companies/partners', [
  'select-partner',
  'open-ownership-operation',
  'fill-transfer-fields',
  'preview',
  'submit',
  'expect-operation-request',
], ['company_id', 'partner_id', 'transaction_type', 'effective_date'])

export const testBranchCreateHappyPath = contract('/app/sirket/companies/branches', [
  'open-create-form',
  'select-company',
  'fill-branch-fields',
  'submit',
  'expect-branch-record',
], ['company_id', 'name', 'branch_type'])

export const testDocumentUploadHappyPath = contract('/app/belgeler', [
  'open-document-slot',
  'choose-file',
  'submit-multipart-upload',
  'expect-document-file-record',
], ['entity_id', 'document_type'])

export const testEmployeeCreateHappyPath = contract('/app/ik/calisanlar', [
  'open-create-form',
  'fill-person-fields',
  'submit',
  'expect-employee-record',
], ['first_name', 'last_name'])

export const testEmploymentStartHappyPath = contract('/app/ik/calisanlar', [
  'select-employee-draft',
  'open-employment-start-wizard',
  'fill-employment-fields',
  'preview',
  'submit',
  'expect-operation-record',
], ['employee_id', 'company_id', 'employment_type', 'start_date', 'sgk_status'])

export const testEmploymentTerminationHappyPath = contract('/app/ik/calisanlar', [
  'select-active-employee',
  'open-employment-termination-wizard',
  'fill-termination-fields',
  'preview',
  'submit',
  'expect-operation-record',
], ['employee_id', 'end_date', 'termination_reason', 'sgk_status'])

export const testEmployeeAssignmentChangeHappyPath = contract('/app/ik/calisanlar', [
  'select-active-employee',
  'open-assignment-change-wizard',
  'fill-assignment-fields',
  'preview',
  'submit',
  'expect-operation-record',
], ['employee_id', 'effective_date'])

export const testEmployeeSgkEntryCompletedHappyPath = contract('/app/ik/calisanlar', [
  'select-active-employee',
  'open-sgk-entry-completed',
  'fill-completion-fields',
  'submit',
  'expect-operation-record',
], ['employee_id', 'completed_date'])

export const testEmployeeSgkExitCompletedHappyPath = contract('/app/ik/calisanlar', [
  'select-terminated-employee',
  'open-sgk-exit-completed',
  'fill-completion-fields',
  'submit',
  'expect-operation-record',
], ['employee_id', 'completed_date'])

export const testEmployeeDocumentUploadHappyPath = contract('/app/ik/calisanlar', [
  'select-employee',
  'open-document-modal',
  'select-document-type',
  'submit',
  'expect-document-record',
], ['employee_id', 'document_type'])

export const testThemesManagementHappyPath = contract('/app/development/temalarimiz', [
  'create-draft-theme',
  'edit-theme-token',
  'save',
  'activate',
  'expect-single-active-system-theme',
], ['theme_key', 'display_name', 'theme_json'])

export const testThemeDraftCreateHappyPath = contract('/app/development/temalarimiz', [
  'click-add',
  'create-draft-theme',
  'expect-draft-record',
], ['theme_key', 'display_name', 'theme_json'])

export const testThemeImportHappyPath = contract('/app/development/temalarimiz', [
  'open-import-export-tab',
  'paste-eden-theme-json',
  'validate',
  'save-draft',
], ['theme_key', 'import_text', 'source_type'])

export const testThemeValidationHappyPath = contract('/app/development/temalarimiz', [
  'select-theme',
  'run-validation',
  'expect-validation-result',
], ['theme_key', 'theme_json'])

export const testThemeActivationHappyPath = contract('/app/development/temalarimiz', [
  'select-draft-theme',
  'validate-theme',
  'activate',
  'expect-single-active-system-theme',
], ['theme_key', 'validation_passed', 'deactivate_existing_active_theme'])

export const testThemeExportHappyPath = contract('/app/development/temalarimiz', [
  'select-theme',
  'open-export-import-tab',
  'choose-export-format',
  'generate-export',
], ['theme_key', 'format'])

export const testThemeAssetUploadHappyPath = contract('/app/development/temalarimiz', [
  'select-theme',
  'select-asset-slot',
  'upload-asset-reference',
  'save',
], ['theme_key', 'slot_id', 'asset_kind', 'asset_ref'])

export const testGenericLifecycleOperationHappyPath = contract('/app/surecler', [
  'open-lifecycle-wizard',
  'fill-operation-payload',
  'preview',
  'submit',
  'expect-operation-request',
], ['operation_type', 'entity_type', 'entity_id', 'payload_json'])
