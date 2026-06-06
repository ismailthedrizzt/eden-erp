import { NextRequest } from 'next/server'
import { fastApiUnavailableResponse, proxyToFastApi } from '@/lib/backend/fastApiProxy'

type RouteParams = Record<string, string | string[] | undefined>
type RouteContext = {
  params: Promise<RouteParams>
}

type TargetPath = string | ((params: RouteParams) => string)

function encodeRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.map(item => encodeURIComponent(item)).join('/')
  return encodeURIComponent(value || '')
}

function interpolateTargetPath(targetPath: TargetPath, params: RouteParams) {
  if (typeof targetPath === 'function') return targetPath(params)
  return targetPath.replace(/\{([^}]+)\}/g, (_, key: string) => encodeRouteParam(params[key]))
}

export function createFastApiProxyHandler(targetPath: TargetPath) {
  return async function fastApiProxyHandler(request: NextRequest, context: RouteContext) {
    const params = await (context?.params || Promise.resolve({}))
    const response = await proxyToFastApi(request, interpolateTargetPath(targetPath, params), { internal: true })
    return response || fastApiUnavailableResponse()
  }
}
