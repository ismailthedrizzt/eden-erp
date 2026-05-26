import type { SupabaseClient } from '@supabase/supabase-js'
import type { RpcContract } from './transactionBoundary.types'

export const rpcContracts: RpcContract[] = [
  contract('company_branch_opening', 'perform_company_branch_opening', 'branch_opening', 'branches', 'Sube Acilisi atomic mutation sozlesmesi.'),
  contract('company_branch_closing', 'perform_company_branch_closing', 'branch_closing', 'branches', 'Sube Kapanisi atomic mutation sozlesmesi.'),
  contract('capital_increase', 'perform_capital_increase', 'capital_increase', 'companies', 'Sermaye Artirimi atomic mutation sozlesmesi.'),
  contract('representative_authority_transaction', 'perform_representative_authority_transaction', 'representative_authority', 'representatives', 'Temsilci yetki islemi atomic mutation sozlesmesi.'),
  contract('ownership_transaction', 'perform_ownership_transaction', 'ownership_transaction', 'partners', 'Ortaklik islemi atomic mutation sozlesmesi.'),
]

const byKey = new Map(rpcContracts.map(item => [item.key, item]))
const byOperation = new Map(rpcContracts.map(item => [item.operationKey, item]))

export function getRpcContract(key: string) {
  return byKey.get(key) || null
}

export function listRpcContracts() {
  return [...rpcContracts]
}

export function getRpcForOperation(operationKey: string) {
  return byOperation.get(operationKey) || null
}

export async function isRpcAvailable(_supabase: SupabaseClient, rpcName: string) {
  const contract = rpcContracts.find(item => item.rpcName === rpcName)
  return contract?.status === 'available'
}

export function shouldUseRpc(contract: RpcContract | null, options: { preferRpc?: boolean; requireRpc?: boolean } = {}) {
  if (!contract) return Boolean(options.requireRpc)
  if (options.requireRpc) return true
  return options.preferRpc ?? process.env.EDEN_USE_OPERATION_RPC === 'true'
}

function contract(
  key: string,
  rpcName: string,
  operationKey: string,
  moduleKey: string,
  description: string
): RpcContract {
  return {
    key,
    rpcName,
    operationKey,
    moduleKey,
    required: false,
    status: 'planned',
    payloadVersion: '1.0',
    fallbackAllowed: true,
    description,
  }
}
