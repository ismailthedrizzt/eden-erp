import { z } from 'zod'
import type { EdenApiContract } from '../core/api.contract'
import { safeApiErrorSchema, successResponseSchema, uuidString } from '../core/validation.contract'

export const crmStakeholderApiContracts = [
  {
    id: 'crm-stakeholder-company-service-list',
    endpointPath: '/api/companies/stakeholders',
    frontendPath: '/api/companies/stakeholders',
    bffPath: '/api/companies/stakeholders',
    fastApiPath: '/api/v1/crm/stakeholders',
    method: 'GET',
    requestSchema: z.object({}).passthrough(),
    responseSchema: successResponseSchema,
    errorSchema: safeApiErrorSchema,
    authorization: ['crm.view'],
    backendAuthorization: ['crm.view'],
    tenantScope: 'required',
    normalization: { uuidFields: ['tenant_id', 'stakeholder_id'], dateFields: [], datetimeFields: [], enumFields: ['record_status'] },
    serviceFunction: 'companyService.stakeholdersList',
  },
  {
    id: 'crm-stakeholder-company-service-detail',
    endpointPath: '/api/companies/stakeholders/{stakeholder_id}',
    frontendPath: '/api/companies/stakeholders/{stakeholder_id}',
    bffPath: '/api/companies/stakeholders/{stakeholder_id}',
    fastApiPath: '/api/v1/crm/stakeholders/{stakeholder_id}',
    method: 'GET',
    requestSchema: z.object({ stakeholder_id: uuidString }),
    responseSchema: successResponseSchema,
    errorSchema: safeApiErrorSchema,
    authorization: ['crm.view'],
    backendAuthorization: ['crm.view'],
    tenantScope: 'required',
    normalization: { uuidFields: ['tenant_id', 'stakeholder_id'], dateFields: [], datetimeFields: [], enumFields: ['record_status'] },
    serviceFunction: 'companyService.stakeholderDetail',
  },
] satisfies readonly EdenApiContract[]
