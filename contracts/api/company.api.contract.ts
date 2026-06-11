import { z } from 'zod'
import type { EdenApiContract } from '../core/api.contract'
import { isoDateString, isoDateTimeString, safeApiErrorSchema, successResponseSchema, uuidString } from '../core/validation.contract'

export const companyCreateRequestSchema = z.object({
  tenant_id: uuidString.optional(),
  short_name: z.string().min(1),
  legal_name: z.string().min(1).optional(),
  trade_name: z.string().min(1).optional(),
  tax_number: z.string().min(1).optional(),
  tax_office: z.string().min(1).optional(),
  company_type: z.string().min(1),
  establishment_date: isoDateString.optional(),
  base_updated_at: isoDateTimeString.optional(),
})

export const companyApiContracts = [
  {
    id: 'company-create',
    endpointPath: '/api/v1/companies',
    frontendRoute: '/api/companies',
    method: 'POST',
    requestSchema: companyCreateRequestSchema,
    responseSchema: successResponseSchema,
    errorSchema: safeApiErrorSchema,
    authorization: ['companies.create'],
    tenantScope: 'required',
    normalization: {
      uuidFields: ['tenant_id'],
      dateFields: ['establishment_date'],
      datetimeFields: ['base_updated_at'],
      enumFields: ['company_type', 'record_status'],
    },
    serviceFunction: 'company.service.create_company_card',
  },
] as const satisfies readonly EdenApiContract[]
