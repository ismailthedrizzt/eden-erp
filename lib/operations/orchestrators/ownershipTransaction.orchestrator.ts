import 'server-only'

import { orchestratorError } from './orchestratorResponse'

export async function runOwnershipTransactionOrchestrator() {
  return orchestratorError('Ortaklik islemi orchestrator tasima asamasi icin hazirlandi.', 'ORCHESTRATOR_NOT_MIGRATED', 501)
}
