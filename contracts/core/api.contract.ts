import type { ZodTypeAny } from 'zod'

export type EdenHttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export interface EdenApiContract {
  id: string
  endpointPath: string
  method: EdenHttpMethod
  frontendRoute?: string
  requestSchema: ZodTypeAny
  responseSchema: ZodTypeAny
  errorSchema: ZodTypeAny
  authorization: readonly string[]
  tenantScope: 'required' | 'optional' | 'not_applicable'
  normalization: {
    uuidFields: readonly string[]
    dateFields: readonly string[]
    datetimeFields: readonly string[]
    enumFields: readonly string[]
  }
  serviceFunction: string
}
