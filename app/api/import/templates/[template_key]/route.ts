import { NextRequest } from 'next/server'
import { proxyToFastApiImportExport } from '../../_proxy'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ template_key: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const { template_key } = await context.params
  return proxyToFastApiImportExport(request, `/api/v1/import/templates/${template_key}`)
}
