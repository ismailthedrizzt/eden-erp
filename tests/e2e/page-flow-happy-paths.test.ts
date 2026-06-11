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

export const testThemesManagementHappyPath = contract('/app/development/temalarimiz', [
  'create-draft-theme',
  'edit-theme-token',
  'save',
  'activate',
  'expect-single-active-system-theme',
], ['theme_key', 'display_name', 'theme_json'])

export const testGenericLifecycleOperationHappyPath = contract('/app/surecler', [
  'open-lifecycle-wizard',
  'fill-operation-payload',
  'preview',
  'submit',
  'expect-operation-request',
], ['operation_type', 'entity_type', 'entity_id', 'payload_json'])
