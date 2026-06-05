// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/representatives/{id}/authority-transactions
// NOTES: Thin Next.js proxy only. Representative authority transactions live in FastAPI.

import { createFastApiProxyHandler } from '@/app/api/_fastapiProxy'

export const runtime = 'nodejs'

const handler = createFastApiProxyHandler('/api/v1/representatives/{id}/authority-transactions')

export { handler as POST }
