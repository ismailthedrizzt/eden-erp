import { getEventContract } from './eventRegistry'

export const DEFAULT_EVENT_VERSION = '1.0'

export function normalizeEventVersion(version?: string | null) {
  if (!version) return DEFAULT_EVENT_VERSION
  return version.includes('.') ? version : `${version}.0`
}

export function getEventVersion(eventType: string) {
  return getEventContract(eventType)?.version || DEFAULT_EVENT_VERSION
}

export function isEventDeprecated(eventType: string) {
  return !!getEventContract(eventType)?.deprecated
}
