import type { ZodTypeAny } from 'zod'

export type EdenHttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export interface EdenApiContract {
  id: string
  endpointPath: string
  backendMode?: 'fastapi' | 'local_only'
  frontendPath?: string
  bffPath?: string
  fastApiPath?: string
  method: EdenHttpMethod
  frontendRoute?: string
  requestSchema: ZodTypeAny
  frontendRequestSchema?: ZodTypeAny
  backendRequestSchema?: string
  backendResponseSchema?: string
  responseSchema: ZodTypeAny
  errorSchema: ZodTypeAny
  authorization: readonly string[]
  backendAuthorization?: readonly string[]
  tenantScope: 'required' | 'optional' | 'none'
  companyScope?: 'read' | 'write' | 'none'
  normalization: {
    uuidFields: readonly string[]
    dateFields: readonly string[]
    datetimeFields: readonly string[]
    enumFields: readonly string[]
    jsonFields?: readonly string[]
  }
  lifecycleOperation?: {
    required: boolean
    operationType?: string
    operationIdField?: string
    transactionTable?: string
  }
  serviceFunction: string
}
