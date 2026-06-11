import { z } from 'zod'
import type { EdenApiContract } from '../core/api.contract'
import { isoDateString, isoDateTimeString, safeApiErrorSchema, successResponseSchema, uuidString } from '../core/validation.contract'

export const branchCreateRequestSchema = z.object({
  tenant_id: uuidString.optional(),
  company_id: uuidString,
  branch_id: uuidString.optional(),
  name: z.string().min(1),
  branch_type: z.string().min(1),
  opening_date: isoDateString.optional(),
  closing_date: isoDateString.optional(),
  base_updated_at: isoDateTimeString.optional(),
})

export const branchApiContracts = [
  {
    id: 'branch-opening',
    endpointPath: '/api/v1/branches/opening',
    frontendRoute: '/api/companies/branches/opening',
    method: 'POST',
    requestSchema: branchCreateRequestSchema,
    responseSchema: successResponseSchema,
    errorSchema: safeApiErrorSchema,
    authorization: ['branches.create'],
    tenantScope: 'required',
    normalization: {
      uuidFields: ['tenant_id', 'company_id', 'branch_id'],
      dateFields: ['opening_date', 'closing_date'],
      datetimeFields: ['base_updated_at'],
      enumFields: ['branch_type', 'record_status'],
    },
    serviceFunction: 'branches.service.open_branch',
  },
] as const satisfies readonly EdenApiContract[]
