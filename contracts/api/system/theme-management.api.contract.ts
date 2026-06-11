import { z } from 'zod'
import type { EdenApiContract } from '../../core/api.contract'
import { safeApiErrorSchema, successResponseSchema, uuidString } from '../../core/validation.contract'
import { themeActivationPayloadSchema } from '../../wizards/system/theme-activation.wizard.contract'
import { themeImportPayloadSchema, themeValidationPayloadSchema } from '../../wizards/system/theme-import.wizard.contract'

export const themeExportPayloadSchema = z.object({
  theme_key: z.string().regex(/^[a-z0-9][a-z0-9_]{1,63}$/),
  format: z.enum(['eden', 'figma', 'css', 'tailwind']),
})

export const themeAssetUploadPayloadSchema = z.object({
  theme_key: z.string().regex(/^[a-z0-9][a-z0-9_]{1,63}$/),
  slot_id: z.string().min(1),
  asset_kind: z.enum(['image', 'document']),
  asset_ref: z.record(z.unknown()),
})

export const themeManagementApiContracts = [
  {
    id: 'theme-draft-create',
    endpointPath: '/api/v1/admin/settings/{settings_key}',
    frontendRoute: '/app/development/temalarimiz',
    method: 'PATCH',
    requestSchema: z.object({ tenant_id: uuidString.optional(), theme_key: z.string(), display_name: z.string(), theme_json: z.record(z.unknown()) }),
    responseSchema: successResponseSchema,
    errorSchema: safeApiErrorSchema,
    authorization: ['development.theme.manage'],
    tenantScope: 'optional',
    normalization: { uuidFields: ['tenant_id'], dateFields: [], datetimeFields: ['updated_at'], enumFields: ['status'] },
    serviceFunction: 'createDraftThemeRecord',
  },
  {
    id: 'theme-import',
    endpointPath: '/api/v1/admin/settings/{settings_key}',
    frontendRoute: '/api/theme/import',
    method: 'PATCH',
    requestSchema: themeImportPayloadSchema,
    responseSchema: successResponseSchema,
    errorSchema: safeApiErrorSchema,
    authorization: ['development.theme.manage'],
    tenantScope: 'optional',
    normalization: { uuidFields: ['tenant_id'], dateFields: [], datetimeFields: ['updated_at'], enumFields: ['source_type'] },
    serviceFunction: 'parseThemeImportTextV2',
  },
  {
    id: 'theme-validation',
    endpointPath: '/api/v1/admin/settings/{settings_key}',
    frontendRoute: '/app/development/temalarimiz',
    method: 'PATCH',
    requestSchema: themeValidationPayloadSchema,
    responseSchema: successResponseSchema,
    errorSchema: safeApiErrorSchema,
    authorization: ['development.theme.manage'],
    tenantScope: 'optional',
    normalization: { uuidFields: ['tenant_id'], dateFields: [], datetimeFields: ['updated_at'], enumFields: [] },
    serviceFunction: 'validateManagedTheme',
  },
  {
    id: 'theme-activation',
    endpointPath: '/api/v1/admin/settings/{settings_key}',
    frontendRoute: '/app/development/temalarimiz',
    method: 'PATCH',
    requestSchema: themeActivationPayloadSchema,
    responseSchema: successResponseSchema,
    errorSchema: safeApiErrorSchema,
    authorization: ['development.theme.activate'],
    tenantScope: 'optional',
    normalization: { uuidFields: ['tenant_id'], dateFields: [], datetimeFields: ['updated_at'], enumFields: ['status'] },
    serviceFunction: 'withThemeLifecycle',
  },
  {
    id: 'theme-export',
    endpointPath: '/api/v1/admin/settings/{settings_key}',
    frontendRoute: '/api/theme/export',
    method: 'PATCH',
    requestSchema: themeExportPayloadSchema,
    responseSchema: successResponseSchema,
    errorSchema: safeApiErrorSchema,
    authorization: ['development.theme.manage'],
    tenantScope: 'optional',
    normalization: { uuidFields: ['tenant_id'], dateFields: [], datetimeFields: ['updated_at'], enumFields: ['format'] },
    serviceFunction: 'exportSelected',
  },
  {
    id: 'theme-asset-upload',
    endpointPath: '/api/v1/admin/settings/{settings_key}',
    frontendRoute: '/app/development/temalarimiz',
    method: 'PATCH',
    requestSchema: themeAssetUploadPayloadSchema,
    responseSchema: successResponseSchema,
    errorSchema: safeApiErrorSchema,
    authorization: ['development.theme.manage'],
    tenantScope: 'optional',
    normalization: { uuidFields: ['tenant_id'], dateFields: [], datetimeFields: ['updated_at'], enumFields: ['asset_kind'] },
    serviceFunction: 'upsertManagedThemeRecord',
  },
] as const satisfies readonly EdenApiContract[]

export const themeManagementApiServiceFunctions = themeManagementApiContracts.map(contract => contract.serviceFunction)
