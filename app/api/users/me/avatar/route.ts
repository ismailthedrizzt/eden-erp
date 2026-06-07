import { createFastApiProxyHandler } from '@/app/api/_fastapiProxy'

export const runtime = 'nodejs'

const handler = createFastApiProxyHandler('/api/v1/users/me/avatar')

export { handler as DELETE, handler as GET, handler as POST }
