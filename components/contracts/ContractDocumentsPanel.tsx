'use client'

import { DocumentLoader } from '@/components/documents/DocumentLoader'
import type { DocumentSlotDefinition } from '@/components/documents/DocumentSlot'

const CONTRACT_SLOTS: DocumentSlotDefinition[] = [
  { documentType: 'contract.draft_contract', title: 'Taslak S?zle?me', category: 'contracts' },
  { documentType: 'contract.signed_contract', title: '?mzal? S?zle?me', category: 'contracts', required: true, relationType: 'contract_document' },
  { documentType: 'contract.amendment', title: 'Ek Protokol', category: 'contracts', relationType: 'contract_document' },
  { documentType: 'contract.termination_notice', title: 'Fesih Bildirimi', category: 'contracts', relationType: 'contract_document' },
  { documentType: 'contract.guarantee_letter', title: 'Teminat Mektubu', category: 'contracts', relationType: 'contract_document' },
]

export function ContractDocumentsPanel({ contractId }: { contractId: string }) {
  return <DocumentLoader entityType="contract" entityId={contractId} moduleKey="contracts" requiredTypes={CONTRACT_SLOTS} allowMultiple />
}
