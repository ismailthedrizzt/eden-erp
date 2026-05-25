import 'server-only'

export interface EntityMediaConfig {
  entityType: string
  tableName: string
  idField?: string
  companyField?: string
  imageFields?: string[]
  documentFields?: string[]
}

const mediaRegistry = new Map<string, EntityMediaConfig>()

export function registerEntityMedia(config: EntityMediaConfig) {
  mediaRegistry.set(config.entityType, config)
  return config
}

export function getEntityMediaConfig(entityType: string) {
  return mediaRegistry.get(entityType)
}

registerEntityMedia({
  entityType: 'company',
  tableName: 'companies',
  imageFields: ['hero_images'],
  documentFields: ['hero_documents'],
})

registerEntityMedia({
  entityType: 'company_partner',
  tableName: 'company_partners',
  companyField: 'company_id',
  imageFields: ['photo_logo'],
  documentFields: ['partner_documents'],
})

registerEntityMedia({
  entityType: 'employee',
  tableName: 'employees',
  imageFields: ['photo_url'],
  documentFields: ['cv_document', 'diploma_document', 'entry_documents', 'exit_documents'],
})

