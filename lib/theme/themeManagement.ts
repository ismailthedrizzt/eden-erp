import { themeConcepts, type ThemeConceptId } from '@/components/design-lab/themeConcepts'
import { themeConceptToEdenTheme, themeTokensToCssVars } from './themeTransforms'
import { validateEdenThemePackage } from './themeValidation'
import type {
  EdenThemePackage,
  ThemeAppearance,
  ThemeLifecycleStatus,
  ThemeValidationResult,
} from './themeSchema'

export const THEME_MANAGEMENT_STORAGE_KEY = 'eden.themeManagement.records.v2'
export const THEME_MANAGEMENT_CHANGE_EVENT = 'eden:theme-management-change'

export type ManagedThemeStatus = ThemeLifecycleStatus
export type ManagedThemeSource = 'system' | 'imported' | 'user_created' | 'generated'
export type ManagedThemeDensity = 'minimal' | 'balanced' | 'rich'
export type ManagedMotifType = EdenThemePackage['modes']['light']['motif']['type']

export interface ManagedThemeAssetImage {
  slotId: string
  file?: File
  previewUrl?: string
  thumbnailUrl?: string
  url?: string
  name?: string
  size?: number
  uploadedAt?: Date | string
}

export interface ManagedThemeAssetDocument {
  slotId: string
  documentId?: string
  storagePath?: string
  file?: File
  name: string
  size: number
  type: string
  uploadedAt?: Date | string
  status?: 'active' | 'archived' | 'deleted' | string
  url?: string
  previewUrl?: string
}

export type ManagedThemeComponentTokens = EdenThemePackage['modes']['light']['components']
export type ManagedThemeMotifConfig = EdenThemePackage['modes']['light']['motif']

export interface ManagedThemeAuditEvent {
  eventType: string
  timestamp: string
  summary: string
}

export interface ManagedThemeRecord {
  id: string
  themeKey: string
  displayName: string
  description: string
  status: ManagedThemeStatus
  source: ManagedThemeSource
  artDirection: string
  inspiration: string
  category: string
  supportsLight: boolean
  supportsDark: boolean
  canBeDefault: boolean
  notes: string
  author: string
  version: string
  package: EdenThemePackage
  componentTokens: ManagedThemeComponentTokens
  motif: ManagedThemeMotifConfig
  validation: ThemeValidationResult | null
  createdAt: string
  updatedAt: string
  createdBy: string
  images: ManagedThemeAssetImage[]
  documents: ManagedThemeAssetDocument[]
  audit: ManagedThemeAuditEvent[]
}

export const SAFE_THEME_KEY_PATTERN = /^[a-z0-9][a-z0-9_]{1,63}$/

export function normalizeManagedThemeKey(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!SAFE_THEME_KEY_PATTERN.test(trimmed)) return null
  return trimmed
}

export function getSystemThemeRecords(): ManagedThemeRecord[] {
  return themeConcepts.map(theme => {
    const themePackage = themeConceptToEdenTheme(theme)
    const validation = validateEdenThemePackage(themePackage).validation
    const now = themePackage.meta.updatedAt || '2026-06-10T00:00:00.000Z'
    return {
      id: `system_${theme.id}`,
      themeKey: themePackage.meta.themeKey,
      displayName: themePackage.meta.displayName,
      description: themePackage.meta.description,
      status: themePackage.meta.status,
      source: 'system',
      artDirection: themePackage.metadata.artDirection,
      inspiration: themePackage.metadata.inspiration,
      category: themePackage.metadata.category,
      supportsLight: true,
      supportsDark: true,
      canBeDefault: true,
      notes: themePackage.metadata.notes,
      author: themePackage.meta.author,
      version: themePackage.meta.version,
      package: themePackage,
      componentTokens: componentTokensFromPackage(themePackage, 'light'),
      motif: themePackage.modes.light.motif,
      validation,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      images: [],
      documents: [],
      audit: [{ eventType: 'theme_seeded', timestamp: now, summary: 'System V2 theme seed.' }],
    }
  })
}

export function readManagedThemeRecords(): ManagedThemeRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(THEME_MANAGEMENT_STORAGE_KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.map(sanitizeManagedThemeRecord).filter(Boolean) as ManagedThemeRecord[]
  } catch {
    return []
  }
}

export function writeManagedThemeRecords(records: ManagedThemeRecord[]) {
  if (typeof window === 'undefined') return
  const clean = records.map(sanitizeManagedThemeRecord).filter(Boolean) as ManagedThemeRecord[]
  window.localStorage.setItem(THEME_MANAGEMENT_STORAGE_KEY, JSON.stringify(clean))
  window.dispatchEvent(new CustomEvent(THEME_MANAGEMENT_CHANGE_EVENT))
}

export function upsertManagedThemeRecord(record: ManagedThemeRecord) {
  const clean = sanitizeManagedThemeRecord(record)
  if (!clean) return
  const records = readManagedThemeRecords()
  const next = records
    .filter(item => item.id !== clean.id && item.themeKey !== clean.themeKey)
    .map(item => clean.status === 'active' && item.status === 'active'
      ? withThemeLifecycle(item, 'inactive', 'Yeni sistem temasi aktiflestigi icin onceki tema pasif duruma alindi.')
      : item
    )
  writeManagedThemeRecords([clean, ...next])
}

export function deleteManagedThemeRecord(recordId: string) {
  writeManagedThemeRecords(readManagedThemeRecords().filter(item => item.id !== recordId && item.status !== 'active'))
}

export function listActiveManagedThemeRecords() {
  return readManagedThemeRecords().filter(record => record.status === 'active')
}

export function findManagedThemeRecord(themeKey: string | null | undefined) {
  if (!themeKey) return null
  return readManagedThemeRecords().find(record => record.themeKey === themeKey && record.status === 'active') || null
}

export function getManagedThemeCssVars(themeKey: string, appearance: ThemeAppearance) {
  const record = findManagedThemeRecord(themeKey)
  if (!record) return null
  return record.package.cssVariables[appearance] || themeTokensToCssVars(record.package.modes[appearance])
}

export function createDraftThemeRecord(options: {
  displayName: string
  themeKey: string
  description?: string
  artDirection?: string
  inspiration?: string
  category?: string
  baseThemeId?: ThemeConceptId
  createdBy?: string
}) {
  const baseTheme = themeConcepts.find(theme => theme.id === options.baseThemeId) || themeConcepts[0]
  const now = new Date().toISOString()
  const basePackage = themeConceptToEdenTheme(baseTheme)
  const themePackage = refreshThemePackage({
    ...basePackage,
    meta: {
      ...basePackage.meta,
      id: options.themeKey,
      themeKey: options.themeKey,
      displayName: options.displayName,
      slug: options.themeKey,
      description: options.description || '',
      author: options.createdBy || 'development_admin',
      version: '0.1.0',
      status: 'draft',
      isActive: false,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    },
    lifecycle: {
      status: 'draft',
      reason: 'Theme draft created from V2 template.',
    },
    metadata: {
      ...basePackage.metadata,
      artDirection: options.artDirection || basePackage.metadata.artDirection,
      inspiration: options.inspiration || basePackage.metadata.inspiration,
      category: options.category || 'system',
      source: 'user_created',
      notes: '',
    },
  })

  const validation = validateEdenThemePackage(themePackage).validation
  return {
    id: `theme_${options.themeKey}_${Date.now()}`,
    themeKey: options.themeKey,
    displayName: options.displayName,
    description: options.description || '',
    status: 'draft',
    source: 'user_created',
    artDirection: options.artDirection || '',
    inspiration: options.inspiration || '',
    category: options.category || 'system',
    supportsLight: true,
    supportsDark: true,
    canBeDefault: false,
    notes: '',
    author: options.createdBy || 'development_admin',
    version: '0.1.0',
    package: themePackage,
    componentTokens: componentTokensFromPackage(themePackage, 'light'),
    motif: themePackage.modes.light.motif,
    validation,
    createdAt: now,
    updatedAt: now,
    createdBy: options.createdBy || 'development_admin',
    images: [],
    documents: [],
    audit: [{ eventType: 'theme_created', timestamp: now, summary: 'V2 draft theme created.' }],
  } satisfies ManagedThemeRecord
}

export function createImportedThemeRecord(themePackage: EdenThemePackage, validation: ThemeValidationResult, createdBy = 'development_admin') {
  const now = new Date().toISOString()
  const nextPackage = refreshThemePackage({
    ...themePackage,
    meta: {
      ...themePackage.meta,
      status: validation.valid ? 'draft' : 'rejected',
      isActive: false,
      updatedAt: now,
    },
    lifecycle: {
      ...themePackage.lifecycle,
      status: validation.valid ? 'draft' : 'rejected',
      submittedAt: themePackage.lifecycle.submittedAt,
    },
    metadata: {
      ...themePackage.metadata,
      source: 'imported',
    },
  })

  return {
    id: `imported_${themePackage.meta.themeKey}_${Date.now()}`,
    themeKey: nextPackage.meta.themeKey,
    displayName: nextPackage.meta.displayName,
    description: nextPackage.meta.description || '',
    status: nextPackage.meta.status,
    source: 'imported',
    artDirection: nextPackage.metadata.artDirection,
    inspiration: nextPackage.metadata.inspiration,
    category: nextPackage.metadata.category || 'system',
    supportsLight: true,
    supportsDark: true,
    canBeDefault: false,
    notes: 'Imported V2 JSON theme. Lifecycle activation is required.',
    author: nextPackage.meta.author || createdBy,
    version: nextPackage.meta.version,
    package: nextPackage,
    componentTokens: componentTokensFromPackage(nextPackage, 'light'),
    motif: nextPackage.modes.light.motif,
    validation,
    createdAt: now,
    updatedAt: now,
    createdBy,
    images: [],
    documents: [],
    audit: [{ eventType: 'theme_imported', timestamp: now, summary: validation.valid ? 'Theme imported as draft.' : 'Theme import rejected.' }],
  } satisfies ManagedThemeRecord
}

export function withThemeLifecycle(record: ManagedThemeRecord, status: ManagedThemeStatus, summary: string) {
  const now = new Date().toISOString()
  const nextPackage = refreshThemePackage({
    ...record.package,
    meta: {
      ...record.package.meta,
      status,
      isActive: status === 'active',
      updatedAt: now,
    },
    lifecycle: {
      ...record.package.lifecycle,
      status,
      submittedAt: status === 'review' ? now : record.package.lifecycle.submittedAt,
      approvedAt: status === 'approved' ? now : record.package.lifecycle.approvedAt,
      activatedAt: status === 'active' ? now : record.package.lifecycle.activatedAt,
      archivedAt: status === 'archived' ? now : record.package.lifecycle.archivedAt,
      reason: summary,
    },
  })
  return validateManagedTheme({
    ...record,
    status,
    package: nextPackage,
    updatedAt: now,
    audit: [
      { eventType: `theme_${status}`, timestamp: now, summary },
      ...record.audit,
    ],
  })
}

export function validateManagedTheme(record: ManagedThemeRecord) {
  const nextPackage = refreshThemePackage({
    ...record.package,
    meta: {
      ...record.package.meta,
      themeKey: record.themeKey,
      displayName: record.displayName,
      slug: record.themeKey,
      description: record.description,
      author: record.author,
      version: record.version,
      status: record.status,
      isActive: record.status === 'active',
      updatedAt: record.updatedAt,
    },
    metadata: {
      ...record.package.metadata,
      artDirection: record.artDirection,
      inspiration: record.inspiration,
      category: record.category,
      notes: record.notes,
      source: record.source,
    },
  })
  const validation = validateEdenThemePackage(nextPackage).validation
  return {
    ...record,
    package: nextPackage,
    validation,
    componentTokens: componentTokensFromPackage(nextPackage, 'light'),
    motif: nextPackage.modes.light.motif,
  }
}

export function refreshThemePackage(themePackage: EdenThemePackage): EdenThemePackage {
  return {
    ...themePackage,
    cssVariables: {
      light: themeTokensToCssVars(themePackage.modes.light),
      dark: themeTokensToCssVars(themePackage.modes.dark),
    },
  }
}

export function componentTokensFromPackage(themePackage: EdenThemePackage, appearance: ThemeAppearance): ManagedThemeComponentTokens {
  return themePackage.modes[appearance].components
}

function sanitizeManagedThemeRecord(value: unknown): ManagedThemeRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as ManagedThemeRecord
  const themeKey = normalizeManagedThemeKey(record.themeKey)
  if (!themeKey || !record.package) return null
  const validation = validateEdenThemePackage(record.package)
  if (!validation.theme) return null
  const status = validation.theme.meta.status
  return {
    ...record,
    id: String(record.id || `theme_${themeKey}`),
    themeKey,
    displayName: String(record.displayName || validation.theme.meta.displayName || themeKey).slice(0, 100),
    description: String(record.description || validation.theme.meta.description || '').slice(0, 1000),
    status,
    source: ['system', 'imported', 'user_created', 'generated'].includes(record.source) ? record.source : validation.theme.metadata.source,
    artDirection: String(record.artDirection || validation.theme.metadata.artDirection || ''),
    inspiration: String(record.inspiration || validation.theme.metadata.inspiration || ''),
    category: String(record.category || validation.theme.metadata.category || 'system'),
    supportsLight: true,
    supportsDark: true,
    canBeDefault: Boolean(record.canBeDefault),
    notes: String(record.notes || validation.theme.metadata.notes || ''),
    author: String(record.author || validation.theme.meta.author || 'development_admin'),
    version: String(record.version || validation.theme.meta.version || '0.1.0'),
    package: refreshThemePackage(validation.theme),
    componentTokens: componentTokensFromPackage(validation.theme, 'light'),
    motif: validation.theme.modes.light.motif,
    validation: validation.validation,
    createdAt: String(record.createdAt || validation.theme.meta.createdAt || new Date().toISOString()),
    updatedAt: String(record.updatedAt || validation.theme.meta.updatedAt || new Date().toISOString()),
    createdBy: String(record.createdBy || 'development_admin'),
    images: Array.isArray(record.images) ? record.images : [],
    documents: Array.isArray(record.documents) ? record.documents : [],
    audit: Array.isArray(record.audit) ? record.audit.slice(0, 100) : [],
  }
}
