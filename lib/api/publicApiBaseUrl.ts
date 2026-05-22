'use client'

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1'])

let warnedAboutLocalhostBaseUrl = false

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function isLocalHostname(hostname: string) {
  return LOCAL_HOSTNAMES.has(hostname.toLowerCase())
}

export function getPublicApiBaseUrl() {
  const configuredValue = trimTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || '')
  if (!configuredValue) return ''

  let configuredUrl: URL
  try {
    configuredUrl = new URL(configuredValue)
  } catch {
    return configuredValue
  }

  if (typeof window === 'undefined') return configuredUrl.toString().replace(/\/+$/, '')

  const currentHostname = window.location.hostname
  const configuredHostname = configuredUrl.hostname
  const configuredIsLocal = isLocalHostname(configuredHostname)
  const currentIsLocal = isLocalHostname(currentHostname)

  if (configuredIsLocal && !currentIsLocal) {
    if (!warnedAboutLocalhostBaseUrl) {
      warnedAboutLocalhostBaseUrl = true
      console.warn('NEXT_PUBLIC_API_BASE_URL points to localhost on a non-local host and was ignored.')
    }
    return ''
  }

  if (configuredUrl.origin === window.location.origin) return ''

  return configuredUrl.toString().replace(/\/+$/, '')
}

export function hasPublicApiBaseUrl() {
  return Boolean(getPublicApiBaseUrl())
}
