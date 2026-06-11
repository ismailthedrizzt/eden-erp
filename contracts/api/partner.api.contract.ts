import { z } from 'zod'
import type { EdenApiContract } from '../core/api.contract'
import { isoDateString, isoDateTimeString, safeApiErrorSchema, successResponseSchema, uuidString } from '../core/validation.contract'

export const partnerCreateRequestSchema = z.object({
  tenant_id: uuidString.optional(),
  company_id: uuidString,
  partner_id: uuidString.optional(),
  partner_type: z.string().min(1),
  display_name: z.string().min(1).optional(),
  share_percentage: z.number().min(0).max(100).optional(),
  capital_amount: z.number().min(0).optional(),
  start_date: isoDateString.optional(),
  base_updated_at: isoDateTimeString.optional(),
})

export const partnerApiContracts = [
  {
    id: 'partner-create',
    endpointPath: '/api/v1/partners',
    frontendRoute: '/api/companies/partners',
    method: 'POST',
    requestSchema: partnerCreateRequestSchema,
    responseSchema: successResponseSchema,
    errorSchema: safeApiErrorSchema,
    authorization: ['partners.create'],
    tenantScope: 'required',
    normalization: {
      uuidFields: ['tenant_id', 'company_id', 'partner_id'],
      dateFields: ['start_date'],
      datetimeFields: ['base_updated_at'],
      enumFields: ['partner_type', 'record_status'],
    },
    serviceFunction: 'partners.service.create_partner_card',
  },
] as const satisfies readonly EdenApiContract[]
