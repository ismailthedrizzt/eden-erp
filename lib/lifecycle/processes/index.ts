import { COMPANY_LIFECYCLE_PROCESSES } from './companyLifecycleProcesses'

export const LIFECYCLE_PROCESS_REGISTRY = {
  companies: COMPANY_LIFECYCLE_PROCESSES,
} as const

export type LifecycleProcessDomain = keyof typeof LIFECYCLE_PROCESS_REGISTRY

export function getLifecycleProcessTemplate<
  TDomain extends LifecycleProcessDomain,
  TProcess extends keyof typeof LIFECYCLE_PROCESS_REGISTRY[TDomain],
>(domain: TDomain, process: TProcess) {
  return LIFECYCLE_PROCESS_REGISTRY[domain][process]
}

export * from './companyLifecycleProcesses'
