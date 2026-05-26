import 'server-only'

import { orchestratorError } from './orchestratorResponse'

export async function runCapitalIncreaseOrchestrator() {
  return orchestratorError('Sermaye artirimi orchestrator tasima asamasi icin hazirlandi.', 'ORCHESTRATOR_NOT_MIGRATED', 501)
}
