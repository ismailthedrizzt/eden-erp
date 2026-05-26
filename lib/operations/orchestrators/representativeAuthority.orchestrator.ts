import 'server-only'

import { orchestratorError } from './orchestratorResponse'

export async function runRepresentativeAuthorityOrchestrator() {
  return orchestratorError('Temsil yetkisi orchestrator tasima asamasi icin hazirlandi.', 'ORCHESTRATOR_NOT_MIGRATED', 501)
}
