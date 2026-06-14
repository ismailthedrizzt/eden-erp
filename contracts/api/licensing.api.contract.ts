import { z } from 'zod'
import type { EdenApiContract } from '../core/api.contract'
import { safeApiErrorSchema, successResponseSchema } from '../core/validation.contract'

export const tenantEntitlementsResponseSchema = z.object({
  product_key: z.string().optional(),
  plan_key: z.string().optional(),
  license_status: z.string().optional(),
  enabled_modules: z.array(z.string()).optional(),
  enabled_features: z.array(z.string()).optional(),
  limits: z.record(z.union([z.number(), z.null()])).optional(),
  warnings: z.array(z.string()).optional(),
}).passthrough()

export const licensingApiContracts = [
  {
    id: 'licensing-current-entitlements',
    endpointPath: '/api/licensing/current',
    frontendPath: '/api/licensing/current',
    bffPath: '/api/licensing/current',
    fastApiPath: '/api/v1/licensing/current',
    frontendRoute: '/app/aboneligim',
    method: 'GET',
    requestSchema: z.object({}),
    responseSchema: successResponseSchema,
    errorSchema: safeApiErrorSchema,
    authorization: [],
    backendAuthorization: [],
    tenantScope: 'required',
    normalization: {
      uuidFields: ['tenant_id'],
      dateFields: [],
      datetimeFields: [],
      enumFields: ['product_key', 'plan_key', 'license_status'],
    },
    serviceFunction: 'licensingService.getCurrentEntitlements',
  },
] as const satisfies readonly EdenApiContract[]
