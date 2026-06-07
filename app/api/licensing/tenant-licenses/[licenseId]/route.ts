import { createFastApiProxyHandler } from '@/app/api/_fastapiProxy'

export const runtime = 'nodejs'

const handler = createFastApiProxyHandler('/api/v1/licensing/tenant-licenses/{licenseId}')

export { handler as GET, handler as PATCH }

