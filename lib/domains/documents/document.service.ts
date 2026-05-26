import type { DocumentDomainContext } from './document.types'

export class DocumentDomainService {
  readonly domainKey = 'documents'

  // TODO(domain-service-migration): Existing logic currently lives in app/api/...; move here in the next Domain Service Layer phase.
  describeBoundary(context: DocumentDomainContext) {
    return {
      domainKey: this.domainKey,
      tenantId: context.tenantId,
      owns: ['documents', 'entity_documents', 'media_assets', 'uploads'],
      rule: 'Business domains may reference documents; document storage and lifecycle belong here.',
    }
  }
}

