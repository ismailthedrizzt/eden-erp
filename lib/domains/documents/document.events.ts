export const documentDomainEvents = [
  'document.uploaded',
  'document.deleted',
  'document.version_updated',
] as const

export type DocumentDomainEvent = (typeof documentDomainEvents)[number]

