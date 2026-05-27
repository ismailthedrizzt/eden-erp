// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: domains
// TARGET_ENDPOINT: backend/app/domains
// NOTES: TypeScript domain services are transition prototypes for the Python Domain Service Layer.

export * from './domainBoundaryGuard'
export * from './domainService.types'
export * from './domainServiceContext'
export * from './domainServiceResponse'
export * from './domainOwnershipRegistry'
export * from './accounting'
export * from './branches'
export * from './company'
export * from './documents'
export * from './facilities'
export * from './hr'
export * from './organization'
export * from './ownership'
export * from './projects'
export * from './representatives'
