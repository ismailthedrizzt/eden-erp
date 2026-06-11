import { z } from 'zod'
import type { EdenApiContract } from '../core/api.contract'
import { isoDateString, isoDateTimeString, safeApiErrorSchema, successResponseSchema, uuidString } from '../core/validation.contract'
import { representativeAuthorityTransactionValues } from '../entities/representative.contract'

export const representativeCreateRequestSchema = z.object({
  tenant_id: uuidString.optional(),
  company_id: uuidString,
  representative_id: uuidString.optional(),
  person_id: uuidString.optional(),
  organization_id: uuidString.optional(),
  person_kind: z.enum(['person', 'organization']),
  display_name: z.string().min(1),
  base_updated_at: isoDateTimeString.optional(),
})

export const representativeAuthorityRequestSchema = z.object({
  tenant_id: uuidString.optional(),
  company_id: uuidString,
  representative_id: uuidString,
  transaction_type: z.enum(representativeAuthorityTransactionValues),
  effective_date: isoDateString,
  end_date: isoDateString.optional(),
  authority_types: z.array(z.string()).optional(),
  base_updated_at: isoDateTimeString.optional(),
})

export const representativeApiContracts = [
  {
    id: 'representative-create',
    endpointPath: '/api/v1/representatives',
    frontendRoute: '/api/companies/representatives',
    method: 'POST',
    requestSchema: representativeCreateRequestSchema,
    responseSchema: successResponseSchema,
    errorSchema: safeApiErrorSchema,
    authorization: ['representatives.create'],
    tenantScope: 'required',
    normalization: {
      uuidFields: ['tenant_id', 'company_id', 'representative_id', 'person_id', 'organization_id'],
      dateFields: [],
      datetimeFields: ['base_updated_at'],
      enumFields: ['person_kind', 'record_status'],
    },
    serviceFunction: 'representatives.service.create_representative_record',
  },
  {
    id: 'representative-authority-submit',
    endpointPath: '/api/v1/representatives/{representative_id}/authority',
    frontendRoute: '/api/companies/representatives/{representative_id}/authority',
    method: 'POST',
    requestSchema: representativeAuthorityRequestSchema,
    responseSchema: successResponseSchema,
    errorSchema: safeApiErrorSchema,
    authorization: ['representatives.authority.manage'],
    tenantScope: 'required',
    normalization: {
      uuidFields: ['tenant_id', 'company_id', 'representative_id'],
      dateFields: ['effective_date', 'end_date'],
      datetimeFields: ['base_updated_at'],
      enumFields: ['transaction_type'],
    },
    serviceFunction: 'representatives.authority.submit_operation',
  },
] as const satisfies readonly EdenApiContract[]
