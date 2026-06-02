// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/companies/{company_id}/liquidation-wizard/context
// NOTES: Thin Next.js proxy only. DB and backend business logic belong to FastAPI.

import { createFastApiProxyHandler } from '@/app/api/_fastapiProxy'

export const runtime = 'nodejs'

const handler = createFastApiProxyHandler('/api/v1/companies/{company_id}/liquidation-wizard/context')

export { handler as GET }
