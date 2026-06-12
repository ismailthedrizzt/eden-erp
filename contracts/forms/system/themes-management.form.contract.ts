import type { DocumentSlot } from '../../../components/ui/DocumentSlotUploader'
import type { ImageSlot } from '../../../components/ui/ImageSlotUploader'
import type { EdenFormContract } from '../../core/form.contract'
import type { EdenFieldBadgeContract, EdenReactiveFieldContract } from '../../core/field.contract'
import { workspaceThemeModes, workspaceThemeScopes, workspaceThemeSources } from '../../entities/workspace-theme.contract'

export type ThemeManagementTab =
  | 'general'
  | 'colors'
  | 'components'
  | 'background'
  | 'typography'
  | 'audit'
  | 'importExport'
  | 'preview'

export type ThemeColorFieldContract = {
  path: string
  helper: string
}

export type ThemeColorGroupContract = {
  id: string
  label: string
  fieldPaths: readonly string[]
}

export type ThemeComponentSectionContract = {
  title: string
  groups: readonly string[]
}

export type ThemeGeneratedDocumentKind =
  | 'designer_note_markdown'
  | 'technical_document_markdown'
  | 'figma_tokens_json'
  | 'css_variables'
  | 'eden_theme_json'
  | 'validation_report_json'

export type ThemeDocumentSlotContract = DocumentSlot & {
  generatedFrom?: {
    kind: ThemeGeneratedDocumentKind
    source: 'theme_json'
    regenerateOn: readonly ('field_change' | 'asset_change' | 'validation_change')[]
  }
  hydratesFields?: readonly string[]
  validationBadge?: EdenFieldBadgeContract
}

export const themeManagementTabs: Array<{ id: ThemeManagementTab; label: string }> = [
  { id: 'general', label: 'Genel Bilgiler' },
  { id: 'colors', label: 'Renkler' },
  { id: 'components', label: 'Bilesen Kurallari' },
  { id: 'background', label: 'Arka Plan / Pattern' },
  { id: 'typography', label: 'Tipografi ve Olculer' },
  { id: 'audit', label: 'Durum Gecmisi' },
  { id: 'importExport', label: 'Export / Import' },
  { id: 'preview', label: 'Onizleme' },
]

export const themeImageSlots: ImageSlot[] = [
  { id: 'light-page-banner', title: 'Light Page Banner', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 5 },
  { id: 'dark-page-banner', title: 'Dark Page Banner', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 5 },
  { id: 'light-smart-list-watermark', title: 'Light Smart List Watermark', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 5 },
  { id: 'dark-smart-list-watermark', title: 'Dark Smart List Watermark', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 5 },
  { id: 'light-form-hero', title: 'Light Form Hero', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 5 },
  { id: 'dark-form-hero', title: 'Dark Form Hero', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 5 },
  { id: 'light-detail-panel', title: 'Light Detail Panel', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 5 },
  { id: 'dark-detail-panel', title: 'Dark Detail Panel', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 5 },
  { id: 'light-wizard', title: 'Light Wizard', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 5 },
  { id: 'dark-wizard', title: 'Dark Wizard', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 5 },
  { id: 'light-login', title: 'Light Login', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 5 },
  { id: 'dark-login', title: 'Dark Login', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 5 },
  { id: 'light-dashboard-hero', title: 'Light Dashboard Hero', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 5 },
  { id: 'dark-dashboard-hero', title: 'Dark Dashboard Hero', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 5 },
  { id: 'light-empty-state', title: 'Light Empty State', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 5 },
  { id: 'dark-empty-state', title: 'Dark Empty State', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 5 },
]

const generatedDocumentBadge = { label: 'Otomatik', tone: 'info', visibleWhen: 'always' } as const satisfies EdenFieldBadgeContract
const hydratingDocumentBadge = { label: 'Alanlari Doldurur', tone: 'success', visibleWhen: 'has_value' } as const satisfies EdenFieldBadgeContract

export const themeDocumentSlots: ThemeDocumentSlotContract[] = [
  {
    id: 'designer-note',
    title: 'Tasarimci Notu',
    acceptedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown', 'text/plain'],
    maxSizeMB: 10,
    generatedFrom: { kind: 'designer_note_markdown', source: 'theme_json', regenerateOn: ['field_change', 'asset_change'] },
    validationBadge: generatedDocumentBadge,
  },
  {
    id: 'technical-doc',
    title: 'Tema Teknik Dokumani',
    acceptedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown', 'text/plain'],
    maxSizeMB: 10,
    generatedFrom: { kind: 'technical_document_markdown', source: 'theme_json', regenerateOn: ['field_change', 'asset_change', 'validation_change'] },
    validationBadge: generatedDocumentBadge,
  },
  {
    id: 'figma-token-export',
    title: 'Figma Token Export',
    acceptedTypes: ['application/json', 'text/plain'],
    maxSizeMB: 5,
    generatedFrom: { kind: 'figma_tokens_json', source: 'theme_json', regenerateOn: ['field_change', 'asset_change'] },
    validationBadge: generatedDocumentBadge,
  },
  {
    id: 'css-variable-export',
    title: 'CSS Variable Export',
    acceptedTypes: ['text/css', 'text/plain'],
    maxSizeMB: 5,
    generatedFrom: { kind: 'css_variables', source: 'theme_json', regenerateOn: ['field_change'] },
    validationBadge: generatedDocumentBadge,
  },
  {
    id: 'theme-json-export',
    title: 'Tema JSON Export',
    acceptedTypes: ['application/json', 'text/plain'],
    maxSizeMB: 5,
    generatedFrom: { kind: 'eden_theme_json', source: 'theme_json', regenerateOn: ['field_change', 'asset_change', 'validation_change'] },
    hydratesFields: ['display_name', 'theme_key', 'version', 'author', 'description', 'theme_json', 'colors', 'background', 'typography', 'components', 'illustrations', 'validation_result'],
    validationBadge: hydratingDocumentBadge,
  },
  {
    id: 'validation-report',
    title: 'Validation Report',
    acceptedTypes: ['application/pdf', 'application/json', 'text/markdown', 'text/plain'],
    maxSizeMB: 10,
    generatedFrom: { kind: 'validation_report_json', source: 'theme_json', regenerateOn: ['field_change', 'asset_change', 'validation_change'] },
    validationBadge: generatedDocumentBadge,
  },
]

export const themeColorFields: ThemeColorFieldContract[] = [
  { path: 'colors.background', helper: 'Sayfa arka plani' },
  { path: 'colors.foreground', helper: 'Ana metin rengi' },
  { path: 'colors.surface', helper: 'Standart yuzeyler' },
  { path: 'colors.surfaceMuted', helper: 'Ikincil yuzeyler' },
  { path: 'colors.surfaceRaised', helper: 'Yukseltilmis kartlar' },
  { path: 'colors.border', helper: 'Standart cizgi' },
  { path: 'colors.borderStrong', helper: 'Guclu cizgi' },
  { path: 'colors.text.primary', helper: 'Ana metin' },
  { path: 'colors.text.secondary', helper: 'Ikincil metin' },
  { path: 'colors.text.muted', helper: 'Muted metin' },
  { path: 'colors.accent.primary', helper: 'Ana aksan' },
  { path: 'colors.accent.secondary', helper: 'Ikincil aksan' },
  { path: 'colors.accent.soft', helper: 'Yumusak aksan yuzeyi' },
  { path: 'colors.success', helper: 'Basari durumu' },
  { path: 'colors.warning', helper: 'Uyari durumu' },
  { path: 'colors.danger', helper: 'Hata durumu' },
  { path: 'colors.info', helper: 'Bilgi durumu' },
]

export const themeColorGroups: ThemeColorGroupContract[] = [
  { id: 'core', label: 'Core', fieldPaths: ['colors.background', 'colors.foreground'] },
  { id: 'surface', label: 'Surface', fieldPaths: ['colors.surface', 'colors.surfaceMuted', 'colors.surfaceRaised'] },
  { id: 'text', label: 'Text', fieldPaths: ['colors.text.primary', 'colors.text.secondary', 'colors.text.muted'] },
  { id: 'border', label: 'Border', fieldPaths: ['colors.border', 'colors.borderStrong'] },
  { id: 'semantic', label: 'Semantic', fieldPaths: ['colors.success', 'colors.warning', 'colors.danger', 'colors.info'] },
  { id: 'interaction', label: 'Interaction', fieldPaths: ['colors.accent.primary', 'colors.accent.secondary', 'colors.accent.soft'] },
]

export const themeBackgroundRows: readonly (readonly [string, string])[] = [
  ['background.app.color', 'App background'],
  ['background.page.color', 'Page background'],
  ['background.pageBanner.type', 'Page Banner type'],
  ['background.pageBanner.overlayColor', 'Page Banner overlay'],
  ['background.pageBanner.overlayOpacity', 'Page Banner overlay opacity'],
  ['background.smartList.type', 'Smart List type'],
  ['background.smartList.watermarkOpacity', 'Smart List watermark opacity'],
  ['background.login.type', 'Login background'],
  ['motif.type', 'Motif type'],
  ['motif.opacity', 'Pattern opacity'],
  ['motif.size', 'Pattern size'],
  ['motif.spacing', 'Pattern spacing'],
]

export const themeComponentSections: ThemeComponentSectionContract[] = [
  { title: 'Shell / Sidebar / Topbar', groups: ['shell', 'sidebar', 'topbar'] },
  { title: 'Page Banner', groups: ['pageBanner'] },
  { title: 'Smart List', groups: ['smartList'] },
  { title: 'Form', groups: ['form', 'input', 'select'] },
  { title: 'Table', groups: ['table'] },
  { title: 'Button', groups: ['button'] },
  { title: 'Badge', groups: ['badge'] },
  { title: 'Wizard', groups: ['wizard'] },
  { title: 'Modal / Drawer', groups: ['modal', 'drawer'] },
  { title: 'Toast / Alert', groups: ['toast', 'alert'] },
]

export const themeReactiveFieldContracts: EdenReactiveFieldContract[] = [
  {
    id: 'theme-json-document-hydrates-theme-form',
    className: 'eden-reactive-document-slot',
    source: {
      kind: 'document_slot',
      slotIds: ['theme-json-export'],
      event: 'import',
    },
    hydratesFields: ['display_name', 'theme_key', 'version', 'author', 'description', 'theme_json', 'colors', 'background', 'typography', 'components', 'illustrations', 'validation_result'],
    completionRule: 'valid_eden_theme_json',
    validationBadge: hydratingDocumentBadge,
    requiredBeforeSubmit: false,
  },
]

export const themeManagementFormContract = {
  fields: [
    { name: 'display_name', kind: 'string', label: 'Tema adi', required: true, validationUi: { className: 'eden-required-field', emptyTone: 'danger', completeTone: 'success', showBadge: true, badge: { label: 'Zorunlu', tone: 'danger', visibleWhen: 'empty' } } },
    { name: 'theme_key', kind: 'string', label: 'Tema kodu / slug', required: true, validationUi: { className: 'eden-required-field', emptyTone: 'danger', completeTone: 'success', showBadge: true, badge: { label: 'Zorunlu', tone: 'danger', visibleWhen: 'empty' } } },
    { name: 'version', kind: 'string', label: 'Versiyon', required: true, validationUi: { className: 'eden-required-field', emptyTone: 'danger', completeTone: 'success', showBadge: true, badge: { label: 'Zorunlu', tone: 'danger', visibleWhen: 'empty' } } },
    { name: 'author', kind: 'string', label: 'Author', optional: true },
    { name: 'scope', kind: 'enum', label: 'Scope', enumValues: workspaceThemeScopes, readonly: true },
    { name: 'default_mode', kind: 'enum', label: 'Default mode', enumValues: workspaceThemeModes, optional: true },
    { name: 'source', kind: 'enum', label: 'Kaynak', enumValues: workspaceThemeSources, readonly: true },
    { name: 'description', kind: 'string', label: 'Aciklama', optional: true },
    { name: 'theme_json', kind: 'jsonb', label: 'Tema JSON', required: true },
  ],
  fieldOrder: ['display_name', 'theme_key', 'version', 'author', 'scope', 'default_mode', 'source', 'description', 'theme_json'],
  defaultValues: {
    scope: 'system',
    default_mode: 'system',
    version: '1.0.0',
  },
  readonlyFields: ['scope', 'source'],
  hiddenFields: ['theme_json'],
  submitBehavior: 'save_draft',
  cancelBehavior: 'return_to_list',
  draftSaveBehavior: 'create_draft',
  forbiddenBehaviors: ['theme_activation', 'theme_import', 'theme_export', 'asset_upload'],
  tabs: themeManagementTabs,
  imageSlots: themeImageSlots,
  documentSlots: themeDocumentSlots,
  reactiveFields: themeReactiveFieldContracts,
  colorFields: themeColorFields,
  colorGroups: themeColorGroups,
  backgroundRows: themeBackgroundRows,
  componentSections: themeComponentSections,
} as const satisfies EdenFormContract & {
  tabs: typeof themeManagementTabs
  imageSlots: typeof themeImageSlots
  documentSlots: typeof themeDocumentSlots
  reactiveFields: typeof themeReactiveFieldContracts
  colorFields: typeof themeColorFields
  colorGroups: typeof themeColorGroups
  backgroundRows: typeof themeBackgroundRows
  componentSections: typeof themeComponentSections
}
