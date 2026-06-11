import { z } from 'zod'

const uuid = z.string().uuid()
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const isoDateTime = z.string().datetime({ offset: true }).or(z.string().datetime())

export const companyCreateWizardPayloadSchema = z.object({
  tenant_id: uuid.optional(),
  company_id: uuid.optional(),
  short_name: z.string().min(1),
  legal_name: z.string().min(1),
  company_type: z.string().min(1),
  establishment_date: isoDate.optional(),
  base_updated_at: isoDateTime.optional(),
})

export const representativeCreatePayloadSchema = z.object({
  tenant_id: uuid.optional(),
  company_id: uuid,
  representative_id: uuid.optional(),
  person_id: uuid.optional(),
  organization_id: uuid.optional(),
  person_kind: z.enum(['person', 'organization']),
  display_name: z.string().min(1),
  base_updated_at: isoDateTime.optional(),
})

export const representativeAuthorityWizardPayloadSchema = z.object({
  tenant_id: uuid.optional(),
  company_id: uuid,
  representative_id: uuid,
  transaction_type: z.enum(['grant_authority', 'update_authority', 'revoke_authority']),
  effective_date: isoDate,
  end_date: isoDate.optional(),
  base_updated_at: isoDateTime.optional(),
})

export const partnerCreatePayloadSchema = z.object({
  tenant_id: uuid.optional(),
  company_id: uuid,
  partner_id: uuid.optional(),
  partner_type: z.string().min(1),
  share_percentage: z.number().min(0).max(100),
  capital_amount: z.number().min(0).optional(),
  start_date: isoDate.optional(),
  base_updated_at: isoDateTime.optional(),
})

export const ownershipTransactionPayloadSchema = z.object({
  tenant_id: uuid.optional(),
  company_id: uuid,
  partner_id: uuid,
  transaction_type: z.string().min(1),
  decision_date: isoDate.optional(),
  effective_date: isoDate,
  share_percentage: z.number().min(0).max(100).optional(),
  capital_amount: z.number().min(0).optional(),
  base_updated_at: isoDateTime.optional(),
})

export const branchCreatePayloadSchema = z.object({
  tenant_id: uuid.optional(),
  company_id: uuid,
  branch_id: uuid.optional(),
  name: z.string().min(1),
  branch_type: z.string().min(1),
  opening_date: isoDate.optional(),
  closing_date: isoDate.optional(),
  base_updated_at: isoDateTime.optional(),
})

export const documentUploadPayloadSchema = z.object({
  tenant_id: uuid.optional(),
  document_id: uuid.optional(),
  entity_id: uuid,
  document_type: z.string().min(1),
  requirement_status: z.string().min(1).optional(),
  created_at: isoDateTime.optional(),
  updated_at: isoDateTime.optional(),
})

export const employeeCreatePayloadSchema = z.object({
  tenant_id: uuid.optional(),
  employee_id: uuid.optional(),
  person_id: uuid.optional(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  start_date: isoDate.optional(),
  end_date: isoDate.optional(),
  base_updated_at: isoDateTime.optional(),
})

export const employmentStartPayloadSchema = z.object({
  tenant_id: uuid.optional(),
  employee_id: uuid,
  company_id: uuid,
  branch_id: uuid.optional(),
  organization_unit_id: uuid.optional(),
  position_id: uuid.optional(),
  employment_type: z.string().min(1),
  start_date: isoDate,
  trial_period_end_date: isoDate.optional(),
  sgk_status: z.string().min(1),
  base_updated_at: isoDateTime.optional(),
})

export const employmentTerminationPayloadSchema = z.object({
  tenant_id: uuid.optional(),
  employee_id: uuid,
  end_date: isoDate,
  termination_reason: z.string().min(1),
  sgk_status: z.string().min(1),
  base_updated_at: isoDateTime.optional(),
})

export const employeeAssignmentChangePayloadSchema = z.object({
  tenant_id: uuid.optional(),
  employee_id: uuid,
  effective_date: isoDate,
  branch_id: uuid.optional(),
  organization_unit_id: uuid.optional(),
  position_id: uuid.optional(),
  job_title: z.string().optional(),
  reason: z.string().optional(),
  base_updated_at: isoDateTime.optional(),
})

export const employeeSgkCompletedPayloadSchema = z.object({
  tenant_id: uuid.optional(),
  employee_id: uuid,
  completed_date: isoDate,
  reference_no: z.string().optional(),
  base_updated_at: isoDateTime.optional(),
})

export const themesManagementPayloadSchema = z.object({
  tenant_id: uuid.optional(),
  theme_key: z.string().regex(/^[a-z0-9][a-z0-9_]{1,63}$/),
  display_name: z.string().min(1),
  status: z.enum(['draft', 'inactive', 'active']),
  theme_json: z.record(z.unknown()),
  updated_at: isoDateTime.optional(),
})

export const themeImportPayloadSchema = z.object({
  tenant_id: uuid.optional(),
  theme_key: z.string().regex(/^[a-z0-9][a-z0-9_]{1,63}$/),
  import_text: z.string().min(1),
  source_type: z.enum(['eden_theme_json', 'figma_tokens_json', 'css_variables']),
  updated_at: isoDateTime.optional(),
})

export const themeValidationPayloadSchema = z.object({
  tenant_id: uuid.optional(),
  theme_key: z.string().regex(/^[a-z0-9][a-z0-9_]{1,63}$/),
  theme_json: z.record(z.unknown()),
  updated_at: isoDateTime.optional(),
})

export const themeActivationPayloadSchema = z.object({
  tenant_id: uuid.optional(),
  theme_key: z.string().regex(/^[a-z0-9][a-z0-9_]{1,63}$/),
  validation_passed: z.boolean(),
  deactivate_existing_active_theme: z.boolean(),
  updated_at: isoDateTime.optional(),
})

export const themeExportPayloadSchema = z.object({
  tenant_id: uuid.optional(),
  theme_key: z.string().regex(/^[a-z0-9][a-z0-9_]{1,63}$/),
  format: z.enum(['eden', 'figma', 'css', 'tailwind']),
  updated_at: isoDateTime.optional(),
})

export const themeAssetUploadPayloadSchema = z.object({
  tenant_id: uuid.optional(),
  theme_key: z.string().regex(/^[a-z0-9][a-z0-9_]{1,63}$/),
  slot_id: z.string().min(1),
  asset_kind: z.enum(['image', 'document']),
  asset_ref: z.record(z.unknown()),
  updated_at: isoDateTime.optional(),
})

export const genericLifecycleOperationPayloadSchema = z.object({
  tenant_id: uuid.optional(),
  operation_type: z.string().min(1),
  entity_type: z.string().min(1),
  entity_id: uuid,
  lifecycle_state: z.string().min(1),
  payload_json: z.record(z.unknown()),
  base_updated_at: isoDateTime.optional(),
})
