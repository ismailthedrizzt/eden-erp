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
