// BACKEND_MIGRATION_STATUS: contract_shared
// TARGET_BACKEND_MODULE: generated-client
// TARGET_FASTAPI_ENDPOINT: /openapi.json
// NOTES: Shared adapter for gradual OpenAPI-generated client adoption.

export {
  BackendApiError,
  backendClient,
  createBackendClient,
  type BackendPaths,
} from '@/lib/generated/backend-client'
