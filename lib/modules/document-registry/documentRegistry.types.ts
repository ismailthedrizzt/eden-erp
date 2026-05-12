export const DOCUMENT_TYPES = [
  'Vergi Levhası',
  'İmza Sirküleri',
  'Ticaret Sicil Gazetesi',
  'Faaliyet Belgesi',
  'Vekaletname',
  'Yönetim Kurulu Kararı',
  'Ortaklar Kurulu Kararı',
  'Sözleşme',
  'Ruhsat',
  'Kimlik',
  'Pasaport',
  'Diploma',
  'Diğer',
] as const

export const SENSITIVE_DOCUMENT_TYPES = [
  'İmza Sirküleri',
  'Kimlik',
  'Pasaport',
  'Vekaletname',
] as const

export type DocumentType = typeof DOCUMENT_TYPES[number]
export type DocumentStatus = 'draft' | 'active' | 'expired' | 'revoked' | 'archived'
export type ConfidentialityLevel = 'public' | 'internal' | 'confidential' | 'sensitive'

export interface RegistryDocument {
  id: string
  company_id: string | null
  document_type: DocumentType
  document_title: string
  document_no: string | null
  issue_date: string | null
  expiry_date: string | null
  issuing_authority: string | null
  status: DocumentStatus
  confidentiality_level: ConfidentialityLevel
  created_at: string
  created_by: string | null
  updated_at: string
  updated_by: string | null
  is_deleted: boolean
  deleted_at: string | null
  deleted_by: string | null
  version: number
  document_files?: RegistryDocumentFile[]
  document_links?: RegistryDocumentLink[]
}

export interface RegistryDocumentFile {
  id: string
  document_id: string
  storage_path: string
  file_name: string
  mime_type: string
  file_size: number
  file_hash: string | null
  thumbnail_url?: string | null
  uploaded_at: string
  uploaded_by: string | null
  version_no: number
  is_current_version: boolean
}

export interface RegistryDocumentLink {
  id: string
  document_id: string
  linked_module: string
  linked_record_id: string
  link_type: string
  notes: string | null
  created_at: string
  created_by: string | null
  is_deleted: boolean
  deleted_at: string | null
  deleted_by: string | null
}

export interface DocumentSearchFilters {
  company_id?: string
  document_type?: DocumentType | string
  linked_module?: string
  linked_record_id?: string
  link_type?: string
  q?: string
}

export interface CreateDocumentInput {
  company_id?: string | null
  document_type: DocumentType | string
  document_title: string
  document_no?: string | null
  issue_date?: string | null
  expiry_date?: string | null
  issuing_authority?: string | null
  status?: DocumentStatus
  confidentiality_level?: ConfidentialityLevel
  file: {
    storage_path: string
    file_name: string
    mime_type: string
    file_size: number
    file_hash?: string | null
    thumbnail_url?: string | null
  }
}

export interface CreateDocumentLinkInput {
  document_id: string
  linked_module: string
  linked_record_id: string
  link_type: string
  notes?: string | null
}

export type MediaEntityKind = 'person' | 'organization' | 'company' | 'vehicle'
export type MediaType = 'profile_photo' | 'logo' | 'vehicle_photo' | 'gallery'

export interface MediaAsset {
  id: string
  entity_kind: MediaEntityKind
  person_id: string | null
  organization_id: string | null
  company_id: string | null
  linked_module: string | null
  linked_record_id: string | null
  media_type: MediaType
  storage_path: string
  file_name: string
  mime_type: string
  is_primary: boolean
  created_at: string
  created_by: string | null
  is_deleted: boolean
  version: number
}

export interface MediaSearchFilters {
  entity_kind?: MediaEntityKind
  person_id?: string
  organization_id?: string
  company_id?: string
  linked_module?: string
  linked_record_id?: string
  media_type?: MediaType
}

export interface CreateMediaAssetInput {
  entity_kind: MediaEntityKind
  person_id?: string | null
  organization_id?: string | null
  company_id?: string | null
  linked_module?: string | null
  linked_record_id?: string | null
  media_type: MediaType
  storage_path: string
  file_name: string
  mime_type: string
  is_primary?: boolean
}
