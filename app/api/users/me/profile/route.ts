import { createFastApiProxyHandler } from '@/app/api/_fastapiProxy'

export const runtime = 'nodejs'

const handler = createFastApiProxyHandler('/api/v1/users/me/profile')

export { handler as GET, handler as PATCH }
