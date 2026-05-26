export type DocumentDomainEntity = 'document' | 'entity_document' | 'media_asset' | 'upload'

export interface DocumentDomainContext {
  tenantId: string
  companyId?: string | null
  documentId?: string | null
  userId?: string | null
}

