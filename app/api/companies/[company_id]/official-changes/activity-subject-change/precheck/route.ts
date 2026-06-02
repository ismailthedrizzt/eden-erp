// BACKEND_MIGRATION_STATUS: proxy_to_fastapi
// CANONICAL_BACKEND: FastAPI
// TARGET_FASTAPI_ENDPOINT: /api/v1/companies/{company_id}/official-changes/activity-subject-change/precheck
// NOTES: Thin Next.js proxy only. DB and Supabase access belong to FastAPI.

import { createFastApiProxyHandler } from '@/app/api/_fastapiProxy'

export const runtime = 'nodejs'

const handler = createFastApiProxyHandler('/api/v1/companies/{company_id}/official-changes/activity-subject-change/precheck')

export { handler as GET }
