'use client'

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  CheckCircle2,
  Download,
  FileJson,
  Layers,
  Palette,
  Save,
  Search,
  Upload,
  XCircle,
} from 'lucide-react'
import PageBanner from '@/components/ui/PageBanner'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { ImageSlotUploader, type ImageSlot, type SlotImage } from '@/components/ui/ImageSlotUploader'
import { DocumentSlotUploader, type DocumentSlot, type SlotDocument } from '@/components/ui/DocumentSlotUploader'
import { themeConcepts, type ThemeConceptId } from '@/components/design-lab/themeConcepts'
import { validateEdenThemePackage } from '@/lib/theme/themeValidation'
import { themeTokensToCssVars } from '@/lib/theme/themeTransforms'
import {
  edenThemeRuntimePackageV2ToFigmaTokens,
  parseThemeImportTextV2,
  runtimeThemePackageV2ToCssVariables,
  toRuntimeThemePackageV2,
} from '@/lib/theme/themePackageV2'
import {
  THEME_MANAGEMENT_CHANGE_EVENT,
  createDraftThemeRecord,
  createImportedThemeRecord,
  getSystemThemeRecords,
  normalizeManagedThemeKey,
  readManagedThemeRecords,
  refreshThemePackage,
  upsertManagedThemeRecord,
  validateManagedTheme,
  withThemeLifecycle,
  type ManagedThemeAssetDocument,
  type ManagedThemeAssetImage,
  type ManagedThemeRecord,
  type ManagedThemeStatus,
} from '@/lib/theme/themeManagement'
import type { EdenThemePackage, ThemeAppearance, ThemeValidationIssue } from '@/lib/theme/themeSchema'
import { cn } from '@/lib/utils'

type ToastState = { type: ToastType; title?: string; message: string }
type ThemeTab = 'general' | 'colors' | 'components' | 'background' | 'typography' | 'audit' | 'importExport' | 'preview'
type ThemeFilter = 'all' | 'active' | 'draft' | 'inactive' | 'invalid'

const STATUS_LABELS: Record<ManagedThemeStatus, string> = {
  draft: 'Taslak',
  review: 'Pasif',
  approved: 'Pasif',
  inactive: 'Pasif',
  active: 'Aktif',
  archived: 'Pasif',
  rejected: 'Pasif',
}

const STATUS_CLASS: Record<ManagedThemeStatus, string> = {
  draft: 'border-slate-200 bg-slate-50 text-slate-700',
  review: 'border-zinc-200 bg-zinc-50 text-zinc-700',
  approved: 'border-zinc-200 bg-zinc-50 text-zinc-700',
  inactive: 'border-zinc-200 bg-zinc-50 text-zinc-700',
  active: 'border-teal-200 bg-teal-50 text-teal-800',
  archived: 'border-zinc-200 bg-zinc-50 text-zinc-700',
  rejected: 'border-zinc-200 bg-zinc-50 text-zinc-700',
}

const FILTERS: { id: ThemeFilter; label: string }[] = [
  { id: 'all', label: 'Tumu' },
  { id: 'active', label: 'Aktif' },
  { id: 'draft', label: 'Taslak' },
  { id: 'inactive', label: 'Pasif' },
  { id: 'invalid', label: 'Hata' },
]

const TABS: { id: ThemeTab; label: string }[] = [
  { id: 'general', label: 'Genel Bilgiler' },
  { id: 'colors', label: 'Renkler' },
  { id: 'components', label: 'Bilesen Kurallari' },
  { id: 'background', label: 'Arka Plan / Pattern' },
  { id: 'typography', label: 'Tipografi ve Olculer' },
  { id: 'audit', label: 'Durum Gecmisi' },
  { id: 'importExport', label: 'Export / Import' },
  { id: 'preview', label: 'Onizleme' },
]

const IMAGE_SLOTS: ImageSlot[] = [
  { id: 'light_page_banner', title: 'Light Page Banner', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 8 },
  { id: 'dark_page_banner', title: 'Dark Page Banner', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 8 },
  { id: 'light_smart_list_watermark', title: 'Light Smart List Watermark', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 8 },
  { id: 'dark_smart_list_watermark', title: 'Dark Smart List Watermark', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 8 },
  { id: 'light_form_hero', title: 'Light Form Hero', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 8 },
  { id: 'dark_form_hero', title: 'Dark Form Hero', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 8 },
  { id: 'light_detail_panel', title: 'Light Detail Panel', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 8 },
  { id: 'dark_detail_panel', title: 'Dark Detail Panel', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 8 },
  { id: 'light_wizard', title: 'Light Wizard', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 8 },
  { id: 'dark_wizard', title: 'Dark Wizard', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 8 },
  { id: 'light_login', title: 'Light Login', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 8 },
  { id: 'dark_login', title: 'Dark Login', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 8 },
  { id: 'light_dashboard_hero', title: 'Light Dashboard Hero', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 8 },
  { id: 'dark_dashboard_hero', title: 'Dark Dashboard Hero', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 8 },
  { id: 'light_empty_state', title: 'Light Empty State', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 8 },
  { id: 'dark_empty_state', title: 'Dark Empty State', acceptedTypes: ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'], maxSizeMB: 8 },
]

const DOCUMENT_SLOTS: DocumentSlot[] = [
  { id: 'designer_note', title: 'Tasarimci Notu', acceptedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown', 'text/plain'], maxSizeMB: 10 },
  { id: 'technical_document', title: 'Tema Teknik Dokumani', acceptedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown', 'text/plain'], maxSizeMB: 10 },
  { id: 'figma_token_export', title: 'Figma Token Export', acceptedTypes: ['application/json', 'text/plain'], maxSizeMB: 5 },
  { id: 'css_variable_export', title: 'CSS Variable Export', acceptedTypes: ['text/css', 'text/plain'], maxSizeMB: 5 },
  { id: 'theme_json_export', title: 'Tema JSON Export', acceptedTypes: ['application/json', 'text/plain'], maxSizeMB: 5 },
  { id: 'validation_report', title: 'Validation Report', acceptedTypes: ['application/pdf', 'application/json', 'text/plain', 'text/markdown'], maxSizeMB: 10 },
]

const COLOR_FIELDS: { path: string; label: string; helper: string }[] = [
  { path: 'colors.primary', label: 'Primary', helper: 'Ana aksiyon, aktif moduller' },
  { path: 'colors.primaryForeground', label: 'Primary Foreground', helper: 'Primary ustu metin' },
  { path: 'colors.secondary', label: 'Secondary', helper: 'Ikincil vurgular' },
  { path: 'colors.accent', label: 'Accent', helper: 'Sicak/karakter aksani' },
  { path: 'colors.background', label: 'Background', helper: 'Sayfa zemini' },
  { path: 'colors.foreground', label: 'Foreground', helper: 'Ana metin' },
  { path: 'colors.surface', label: 'Surface', helper: 'Panel yuzeyi' },
  { path: 'colors.surfaceMuted', label: 'Surface Muted', helper: 'Toolbar/list zeminleri' },
  { path: 'colors.card', label: 'Card', helper: 'Kart zemini' },
  { path: 'colors.cardForeground', label: 'Card Text', helper: 'Kart metni' },
  { path: 'colors.muted', label: 'Muted', helper: 'Pasif yuzey' },
  { path: 'colors.mutedForeground', label: 'Muted Text', helper: 'Ikincil metin' },
  { path: 'colors.border', label: 'Border', helper: 'Normal cizgi' },
  { path: 'colors.borderStrong', label: 'Border Strong', helper: 'Vurgulu cizgi' },
  { path: 'colors.input', label: 'Input', helper: 'Form alan zemini' },
  { path: 'colors.inputForeground', label: 'Input Text', helper: 'Form alan metni' },
  { path: 'colors.ring', label: 'Focus Ring', helper: 'Odak cizgisi' },
  { path: 'colors.success', label: 'Success', helper: 'Basari durumu' },
  { path: 'colors.warning', label: 'Warning', helper: 'Uyari durumu' },
  { path: 'colors.danger', label: 'Danger', helper: 'Hata/tehlike' },
  { path: 'colors.info', label: 'Info', helper: 'Bilgi durumu' },
]

export default function DevelopmentThemesPage() {
  const [records, setRecords] = useState<ManagedThemeRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ThemeTab>('general')
  const [filter, setFilter] = useState<ThemeFilter>('all')
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<ThemeAppearance>('light')
  const [importText, setImportText] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    function refresh() {
      setRecords(readManagedThemeRecords())
    }

    refresh()
    window.addEventListener(THEME_MANAGEMENT_CHANGE_EVENT, refresh)
    return () => window.removeEventListener(THEME_MANAGEMENT_CHANGE_EVENT, refresh)
  }, [])

  const systemRecords = useMemo(() => getSystemThemeRecords(), [])
  const hasManagedActiveTheme = records.some(record => record.status === 'active')
  const visibleSystemRecords = useMemo(
    () => systemRecords.map(record => hasManagedActiveTheme && record.status === 'active'
      ? withThemeLifecycle(record, 'inactive', 'Kullanici tarafindan aktif edilen sistem temasi nedeniyle pasif gorunur.')
      : record
    ),
    [hasManagedActiveTheme, systemRecords]
  )
  const allRecords = useMemo(() => [...visibleSystemRecords, ...records], [records, visibleSystemRecords])
  const selected = allRecords.find(record => record.id === selectedId) || null
  const listRecords = allRecords.filter(record => filterRecord(record, filter, search))
  const editable = Boolean(selected && selected.source !== 'system' && selected.status !== 'inactive')

  function notify(type: ToastType, message: string, title?: string) {
    setToast({ type, message, title })
  }

  function createDraft(baseThemeId: ThemeConceptId = themeConcepts[0].id) {
    const suffix = Date.now().toString(36)
    const themeKey = `tema_${suffix}`
    const draft = createDraftThemeRecord({
      displayName: 'Yeni Sistem Temasi',
      themeKey,
      description: 'Eden ERP sistem temasi V2 taslagi.',
      artDirection: 'Kurumsal sistem temasi',
      inspiration: 'Kurumsal sistem temasi icin sade ve yonetilebilir gorsel dil.',
      category: 'system',
      baseThemeId,
      createdBy: 'development_admin',
    })
    upsertManagedThemeRecord(draft)
    setRecords(readManagedThemeRecords())
    setSelectedId(draft.id)
    setActiveTab('general')
    notify('success', 'Yeni tema taslak olarak acildi.')
  }

  function makeEditableCopy(record: ManagedThemeRecord) {
    const suffix = Date.now().toString(36)
    const themeKey = `${record.themeKey}_v2_${suffix}`.slice(0, 64)
    const copy = createDraftThemeRecord({
      displayName: `${record.displayName} Kopya`,
      themeKey,
      description: record.description,
      artDirection: record.artDirection,
      inspiration: record.inspiration,
      category: 'system',
      baseThemeId: themeConcepts.find(theme => theme.id === record.themeKey)?.id || themeConcepts[0].id,
      createdBy: 'development_admin',
    })
    const next = validateManagedTheme({
      ...copy,
      package: refreshThemePackage({
        ...record.package,
        meta: {
          ...record.package.meta,
          id: themeKey,
          themeKey,
          displayName: `${record.displayName} Kopya`,
          slug: themeKey,
          status: 'draft',
          isActive: false,
          isDefault: false,
          version: '0.1.0',
          updatedAt: new Date().toISOString(),
        },
        lifecycle: { status: 'draft', reason: 'Sistem temasindan duzenlenebilir taslak olusturuldu.' },
        metadata: { ...record.package.metadata, source: 'user_created' },
      }),
      images: record.images || [],
      documents: record.documents || [],
    })
    upsertManagedThemeRecord(next)
    setRecords(readManagedThemeRecords())
    setSelectedId(next.id)
    setActiveTab('general')
    notify('success', 'Düzenlenebilir V2 kopya olusturuldu.')
  }

  function updateSelected(mutator: (record: ManagedThemeRecord) => ManagedThemeRecord) {
    if (!selected || selected.source === 'system') return
    const next = validateManagedTheme(mutator(selected))
    setRecords(current => {
      const exists = current.some(item => item.id === next.id)
      return exists
        ? current.map(item => item.id === next.id ? next : item)
        : [next, ...current]
    })
  }

  function saveSelected() {
    if (!selected || selected.source === 'system') {
      if (selected) makeEditableCopy(selected)
      return
    }
    const next = validateManagedTheme(selected)
    upsertManagedThemeRecord(next)
    setRecords(readManagedThemeRecords())
    setSelectedId(next.id)
    notify('success', 'Tema kaydedildi.')
  }

  function setLifecycle(record: ManagedThemeRecord, status: ManagedThemeStatus) {
    if (record.source === 'system') {
      notify('warning', 'Sistem temalari dogrudan degistirilemez; once duzenlenebilir kopya olusturun.')
      return
    }
    const validation = validateEdenThemePackage(record.package).validation
    if (status === 'active' && validation.activationBlocked) {
      notify('error', 'Validation veya kritik kontrast hatasi olan tema aktiflestirilemez.', 'Aktivasyon engellendi')
      return
    }
    const summary = lifecycleSummary(status)
    const next = withThemeLifecycle(record, status, summary)
    upsertManagedThemeRecord(next)
    setRecords(readManagedThemeRecords())
    setSelectedId(next.id)
    notify('success', summary)
  }

  function patchMeta(path: string, value: string | boolean) {
    updateSelected(record => {
      const pkg = setPackagePath(record.package, `meta.${path}`, value)
      return {
        ...record,
        themeKey: path === 'themeKey' && typeof value === 'string' ? value : record.themeKey,
        displayName: path === 'displayName' && typeof value === 'string' ? value : record.displayName,
        description: path === 'description' && typeof value === 'string' ? value : record.description,
        version: path === 'version' && typeof value === 'string' ? value : record.version,
        author: path === 'author' && typeof value === 'string' ? value : record.author,
        package: pkg,
        updatedAt: new Date().toISOString(),
      }
    })
  }

  function patchMetadata(path: keyof EdenThemePackage['metadata'], value: string) {
    updateSelected(record => ({
      ...record,
      artDirection: path === 'artDirection' ? value : record.artDirection,
      inspiration: path === 'inspiration' ? value : record.inspiration,
      category: path === 'category' ? value : record.category,
      notes: path === 'notes' ? value : record.notes,
      package: setPackagePath(record.package, `metadata.${path}`, value),
      updatedAt: new Date().toISOString(),
    }))
  }

  function patchMode(path: string, value: string | number | boolean) {
    updateSelected(record => ({
      ...record,
      package: setPackagePath(record.package, `modes.${mode}.${path}`, value),
      updatedAt: new Date().toISOString(),
    }))
  }

  function handleImagesChange(images: SlotImage[]) {
    updateSelected(record => {
      const nextImages = images as ManagedThemeAssetImage[]
      return {
        ...record,
        images: nextImages,
        package: applyImageAssets(record.package, nextImages),
        updatedAt: new Date().toISOString(),
      }
    })
  }

  function handleDocumentsChange(documents: SlotDocument[]) {
    updateSelected(record => ({
      ...record,
      documents: documents as ManagedThemeAssetDocument[],
      updatedAt: new Date().toISOString(),
    }))
  }

  function importTheme() {
    const result = parseThemeImportTextV2(importText)
    if (!result.theme) {
      const defaultMessage = result.kind === 'figma-tokens'
        ? 'Figma Tokens dosyasi runtime tema degildir. Eden Theme JSON import edin.'
        : 'Eden Theme JSON V2 validation gecemedi.'
      notify('error', result.validation.errors[0]?.message || defaultMessage, 'Import reddedildi')
      return
    }
    const record = createImportedThemeRecord(result.theme, result.validation, 'development_admin')
    upsertManagedThemeRecord(record)
    setRecords(readManagedThemeRecords())
    setSelectedId(record.id)
    setActiveTab('general')
    setImportText('')
    notify('success', 'Tema taslak olarak import edildi.')
  }

  function exportSelected(format: 'eden' | 'figma' | 'css') {
    if (!selected) return
    const runtimePackage = toRuntimeThemePackageV2(selected.package)
    if (format === 'eden') {
      downloadFile(`${selected.themeKey}.eden-theme.json`, JSON.stringify(runtimePackage, null, 2), 'application/json')
      return
    }
    if (format === 'figma') {
      downloadFile(`${selected.themeKey}.figma-tokens.json`, JSON.stringify(edenThemeRuntimePackageV2ToFigmaTokens(runtimePackage), null, 2), 'application/json')
      return
    }
    downloadFile(`${selected.themeKey}.css-variables.css`, runtimeThemePackageV2ToCssVariables(runtimePackage), 'text/css')
  }

  if (selected) {
    return (
      <div className="space-y-5">
        {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}
        <FormHeader
          record={selected}
          editable={editable}
          onBack={() => setSelectedId(null)}
          onCancel={() => setSelectedId(null)}
          onSave={selected.source === 'system' ? () => makeEditableCopy(selected) : saveSelected}
          onActivate={() => setLifecycle(selected, 'active')}
          onDeactivate={() => setLifecycle(selected, 'inactive')}
        />

        <section className="rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface)] p-4 shadow-sm">
          <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <UploaderBlock title="Resim Uploader">
                <ImageSlotUploader
                  slots={IMAGE_SLOTS}
                  images={selected.images as SlotImage[]}
                  onChange={handleImagesChange}
                  allowExtraSlots={false}
                  readOnly={!editable}
                  mode={editable ? 'update' : 'view'}
                />
              </UploaderBlock>
              <UploaderBlock title="Belge Uploader">
                <DocumentSlotUploader
                  slots={DOCUMENT_SLOTS}
                  documents={selected.documents as SlotDocument[]}
                  onChange={handleDocumentsChange}
                  allowExtraSlots={false}
                  readOnly={!editable}
                  mode={editable ? 'update' : 'view'}
                  defaultTab="documents"
                />
              </UploaderBlock>
            </div>

            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <StatusBadge status={selected.status} />
                <InfoChip>Sistem Teması</InfoChip>
                <InfoChip>Light/Dark destekli</InfoChip>
                <InfoChip>{sourceLabel(selected.source)}</InfoChip>
                {selected.package.meta.isActive && <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">Aktif tema</span>}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <TextField label="Tema adi" value={selected.displayName} disabled={!editable} onChange={value => patchMeta('displayName', value)} />
                <TextField label="Tema kodu / slug" value={selected.themeKey} disabled={!editable} onChange={value => patchMeta('themeKey', normalizeManagedThemeKey(value) || selected.themeKey)} />
                <TextField label="Versiyon" value={selected.version} disabled={!editable} onChange={value => patchMeta('version', value)} />
                <TextField label="Author" value={selected.author} disabled={!editable} onChange={value => patchMeta('author', value)} />
                <TextField label="Scope" value="Sistem" disabled />
                <TextField label="Son guncelleme" value={formatDate(selected.updatedAt)} disabled />
                <TextArea className="lg:col-span-2" label="Kisa aciklama" value={selected.description} disabled={!editable} onChange={value => patchMeta('description', value)} />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface)] shadow-sm">
          <div className="flex gap-2 overflow-x-auto border-b border-[var(--eden-border)] px-4 py-3">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  activeTab === tab.id
                    ? 'bg-[var(--eden-accent)] text-[var(--eden-accent-text)]'
                    : 'text-[var(--eden-text-muted)] hover:bg-[var(--eden-surface-muted)] hover:text-[var(--eden-text)]'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-5">
            {activeTab !== 'general' && activeTab !== 'importExport' && activeTab !== 'audit' && activeTab !== 'preview' && (
              <ModeSwitch mode={mode} onChange={setMode} />
            )}
            {activeTab === 'general' && (
              <GeneralTab record={selected} editable={editable} patchMeta={patchMeta} patchMetadata={patchMetadata} />
            )}
            {activeTab === 'colors' && (
              <ColorsTab record={selected} mode={mode} editable={editable} patchMode={patchMode} />
            )}
            {activeTab === 'background' && (
              <BackgroundTab record={selected} mode={mode} editable={editable} patchMode={patchMode} />
            )}
            {activeTab === 'components' && (
              <ComponentsTab record={selected} mode={mode} editable={editable} patchMode={patchMode} />
            )}
            {activeTab === 'typography' && (
              <TypographyTab record={selected} mode={mode} editable={editable} patchMode={patchMode} />
            )}
            {activeTab === 'preview' && (
              <PreviewTab record={selected} mode={mode} onModeChange={setMode} />
            )}
            {activeTab === 'importExport' && (
              <ImportExportTab
                record={selected}
                importText={importText}
                setImportText={setImportText}
                onImport={importTheme}
                onExport={exportSelected}
              />
            )}
            {activeTab === 'audit' && <AuditTab record={selected} />}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}
      <PageBanner
        mode="list"
        title="Temalarımız"
        subtitle="Eden ERP sistem temasını, tasarım tokenlarını ve arayüz görünüm kurallarını yönetin."
        icon={<Palette size={24} />}
        onAddClick={() => createDraft()}
        addButtonText="Ekle"
      />

      <section className="overflow-hidden rounded-xl border border-[var(--eden-smart-list-border,var(--eden-border))] bg-[var(--eden-smart-list-bg,var(--eden-surface))] shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[var(--eden-border)] bg-[var(--eden-smart-list-header-bg,var(--eden-surface-raised))] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--eden-text-muted)]" size={18} />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Tema ara..."
              className="h-10 w-full rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] pl-10 pr-3 text-sm text-[var(--eden-text)] outline-none focus:border-[var(--eden-input-focus)]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(item => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs font-semibold',
                  filter === item.id
                    ? 'border-[var(--eden-accent)] bg-[var(--eden-accent-soft)] text-[var(--eden-accent)]'
                    : 'border-[var(--eden-border)] bg-[var(--eden-surface)] text-[var(--eden-text-muted)] hover:text-[var(--eden-text)]'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--eden-table-header-bg)] text-[var(--eden-text-muted)]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Tema adi</th>
                <th className="px-4 py-3 text-left font-semibold">Tema kodu / slug</th>
                <th className="px-4 py-3 text-left font-semibold">Durum</th>
                <th className="px-4 py-3 text-left font-semibold">Versiyon</th>
                <th className="px-4 py-3 text-left font-semibold">Aktif tema mi?</th>
                <th className="px-4 py-3 text-left font-semibold">Son guncelleme</th>
              </tr>
            </thead>
            <tbody>
              {listRecords.map(record => (
                <tr
                  key={record.id}
                  onClick={() => {
                    setSelectedId(record.id)
                    setActiveTab('general')
                  }}
                  className="cursor-pointer border-t border-[var(--eden-border)] bg-[var(--eden-surface)] transition-colors hover:bg-[var(--eden-table-row-hover)]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-9 w-9 shrink-0 rounded-lg border border-[var(--eden-border)]" style={{ backgroundColor: record.package.modes.light.colors.primary }} />
                      <div>
                        <div className="font-semibold text-[var(--eden-text)]">{record.displayName}</div>
                        <div className="text-xs text-[var(--eden-text-muted)]">{record.source}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--eden-text-muted)]">{record.themeKey}</td>
                  <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                  <td className="px-4 py-3 text-[var(--eden-text)]">{record.version}</td>
                  <td className="px-4 py-3 text-[var(--eden-text)]">{record.package.meta.isActive ? 'Evet' : 'Hayir'}</td>
                  <td className="px-4 py-3 text-[var(--eden-text-muted)]">{formatDate(record.updatedAt)}</td>
                </tr>
              ))}
              {!listRecords.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-[var(--eden-text-muted)]">Tema kaydi bulunamadi.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function FormHeader({
  record,
  editable,
  onBack,
  onCancel,
  onSave,
  onActivate,
  onDeactivate,
}: {
  record: ManagedThemeRecord
  editable: boolean
  onBack: () => void
  onCancel: () => void
  onSave: () => void
  onActivate: () => void
  onDeactivate: () => void
}) {
  return (
    <section className="rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface)] px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-[var(--eden-text-muted)]">
            <button onClick={onBack} className="rounded-md border border-[var(--eden-border)] px-2.5 py-1 font-semibold text-[var(--eden-text)] hover:bg-[var(--eden-surface-muted)]">
              Geri
            </button>
            <span>Temalarımız</span>
            <span>/</span>
            <span className="truncate text-[var(--eden-text)]">{record.displayName}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="mr-2 truncate text-xl font-semibold text-[var(--eden-text)]">{record.displayName}</h1>
            <StatusBadge status={record.status} />
            <InfoChip>Sistem Teması</InfoChip>
            <InfoChip>Light/Dark</InfoChip>
            <InfoChip>{sourceLabel(record.source)}</InfoChip>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onCancel} className={secondaryButtonClass}>İptal</button>
          <button onClick={onSave} className={primaryButtonClass}>
            <Save size={16} /> Kaydet
          </button>
          {record.source !== 'system' && record.status === 'draft' && (
            <button onClick={onActivate} className={primaryButtonClass}>
              <CheckCircle2 size={16} /> Aktifleştir
            </button>
          )}
          {record.source !== 'system' && record.status === 'active' && (
            <button onClick={onDeactivate} className={secondaryButtonClass}>Pasife Al</button>
          )}
          {record.source === 'system' && (
            <button onClick={onSave} className={secondaryButtonClass}>
              <Layers size={16} /> Düzenlenebilir Kopya
            </button>
          )}
        </div>
      </div>
      {!editable && record.source !== 'system' && (
        <p className="mt-2 text-xs text-[var(--eden-text-muted)]">Bu kayıt mevcut durumda sınırlı düzenlenebilir.</p>
      )}
    </section>
  )
}

function UploaderBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface-raised)] p-3">
      <h2 className="mb-3 text-sm font-semibold text-[var(--eden-text)]">{title}</h2>
      {children}
    </div>
  )
}

function InfoChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--eden-border)] px-2.5 py-1 text-xs font-semibold text-[var(--eden-text-muted)]">
      {children}
    </span>
  )
}

function GeneralTab({
  record,
  editable,
  patchMeta,
  patchMetadata,
}: {
  record: ManagedThemeRecord
  editable: boolean
  patchMeta: (path: string, value: string | boolean) => void
  patchMetadata: (path: keyof EdenThemePackage['metadata'], value: string) => void
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TextField label="Tema adi" value={record.displayName} disabled={!editable} onChange={value => patchMeta('displayName', value)} />
      <TextField label="Tema kodu / slug" value={record.themeKey} disabled={!editable} onChange={value => patchMeta('themeKey', normalizeManagedThemeKey(value) || record.themeKey)} />
      <TextField label="Versiyon" value={record.version} disabled={!editable} onChange={value => patchMeta('version', value)} />
      <TextField label="Author" value={record.author} disabled={!editable} onChange={value => patchMeta('author', value)} />
      <TextField label="Scope" value="Sistem" disabled />
      <TextField label="Default mode" value={record.package.meta.defaultMode} disabled />
      <TextField label="Supported modes" value={record.package.meta.supportedModes.join(', ')} disabled />
      <TextField label="Kaynak" value={sourceLabel(record.source)} disabled />
      <TextArea className="lg:col-span-2" label="Açıklama" value={record.description} disabled={!editable} onChange={value => patchMeta('description', value)} />
      <TextArea label="Sanat yonu" value={record.artDirection} disabled={!editable} onChange={value => patchMetadata('artDirection', value)} />
      <TextArea label="Ilham notu" value={record.inspiration} disabled={!editable} onChange={value => patchMetadata('inspiration', value)} />
      <TextArea className="lg:col-span-2" label="Notlar" value={record.notes} disabled={!editable} onChange={value => patchMetadata('notes', value)} />
      <ValidationSummary record={record} />
    </div>
  )
}

function ColorsTab({ record, mode, editable, patchMode }: ModeTabProps) {
  const groups = [
    { id: 'core', label: 'Core', fields: COLOR_FIELDS.slice(0, 4) },
    { id: 'surface', label: 'Surface', fields: COLOR_FIELDS.slice(4, 11) },
    { id: 'text', label: 'Text', fields: COLOR_FIELDS.slice(11, 12).concat(COLOR_FIELDS.slice(5, 6), COLOR_FIELDS.slice(9, 12)) },
    { id: 'border', label: 'Border', fields: COLOR_FIELDS.slice(12, 16) },
    { id: 'semantic', label: 'Semantic', fields: COLOR_FIELDS.slice(17, 21) },
    { id: 'interaction', label: 'Interaction', fields: COLOR_FIELDS.slice(16, 17).concat(COLOR_FIELDS.slice(0, 3)) },
  ]
  const [activeGroup, setActiveGroup] = useState(groups[0].id)
  const group = groups.find(item => item.id === activeGroup) || groups[0]

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface-raised)] p-2">
        {groups.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveGroup(item.id)}
            className={cn(
              'mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-semibold last:mb-0',
              activeGroup === item.id ? 'bg-[var(--eden-accent-soft)] text-[var(--eden-accent)]' : 'text-[var(--eden-text-muted)] hover:bg-[var(--eden-surface-muted)]'
            )}
          >
            <span>{item.label}</span>
            <span className="text-xs">{item.fields.length}</span>
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--eden-border)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--eden-table-header-bg)] text-[var(--eden-text-muted)]">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Token adi</th>
              <th className="px-3 py-2 text-left font-semibold">Light renk</th>
              <th className="px-3 py-2 text-left font-semibold">Dark renk</th>
              <th className="px-3 py-2 text-left font-semibold">Foreground</th>
              <th className="px-3 py-2 text-left font-semibold">Kullanim</th>
              <th className="px-3 py-2 text-left font-semibold">Kontrast uyarisi</th>
            </tr>
          </thead>
          <tbody>
            {group.fields.map(field => {
              const lightValue = String(getPath(record.package.modes.light, field.path) || '')
              const darkValue = String(getPath(record.package.modes.dark, field.path) || '')
              return (
                <tr key={field.path} className="border-t border-[var(--eden-border)] bg-[var(--eden-surface)]">
                  <td className="px-3 py-2 font-mono text-xs text-[var(--eden-text)]">{field.path.replace('colors.', '')}</td>
                  <td className="px-3 py-2"><CompactColorInput value={lightValue} disabled={!editable || mode !== 'light'} onChange={value => patchMode(field.path, value)} /></td>
                  <td className="px-3 py-2"><CompactColorInput value={darkValue} disabled={!editable || mode !== 'dark'} onChange={value => patchMode(field.path, value)} /></td>
                  <td className="px-3 py-2 text-xs text-[var(--eden-text-muted)]">{foregroundHint(field.path)}</td>
                  <td className="px-3 py-2 text-xs text-[var(--eden-text-muted)]">{field.helper}</td>
                  <td className="px-3 py-2 text-xs text-[var(--eden-text-muted)]">{contrastHint(record, field.path)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BackgroundTab({ record, mode, editable, patchMode }: ModeTabProps) {
  const rows = [
    ['background.app.color', 'App background'],
    ['background.page.color', 'Page background'],
    ['background.pageBanner.color', 'Page Banner background'],
    ['background.smartList.color', 'Smart List background'],
    ['background.login.color', 'Login background'],
    ['background.dashboard.color', 'Dashboard background'],
    ['motif.type', 'Motif type'],
    ['motif.opacity', 'Pattern opacity'],
    ['motif.size', 'Pattern size'],
    ['motif.spacing', 'Pattern spacing'],
    ['background.pageBanner.overlayOpacity', 'Overlay'],
  ] as const
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <CompactPathTable rows={rows} source={record.package.modes[mode]} editable={editable} onChange={patchMode} />
      <div className="rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface-raised)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--eden-text)]">Arka plan preview</h3>
        <div
          className="h-52 rounded-lg border border-[var(--eden-border)]"
          style={{
            background: String(getPath(record.package.modes[mode], 'background.page.color') || 'var(--eden-bg)'),
          }}
        />
      </div>
    </div>
  )
}

function ComponentsTab({ record, mode, editable, patchMode }: ModeTabProps) {
  const sections = [
    { title: 'Shell / Sidebar / Topbar', groups: ['shell'] },
    { title: 'Page Banner', groups: ['pageBanner'] },
    { title: 'Smart List', groups: ['smartList'] },
    { title: 'Form', groups: ['forms'] },
    { title: 'Table', groups: ['tables'] },
    { title: 'Button', groups: ['buttons'] },
    { title: 'Badge', groups: ['badges'] },
    { title: 'Wizard', groups: ['wizard'] },
    { title: 'Modal / Drawer', groups: ['modal', 'drawer'] },
    { title: 'Toast / Alert', groups: ['toast', 'alerts'] },
  ]
  return (
    <div className="space-y-3">
      {sections.map(section => (
        <details key={section.title} className="rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface-raised)]" open={section.title === 'Page Banner'}>
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[var(--eden-text)]">{section.title}</summary>
          <div className="border-t border-[var(--eden-border)] p-3">
            {section.groups.map(group => (
              <TokenGroupEditor
                key={group}
                title={group}
                tokens={record.package.modes[mode].components[group as keyof typeof record.package.modes.light.components] || {}}
                editable={editable}
                onChange={(key, value) => patchMode(`components.${group}.${key}`, value)}
              />
            ))}
          </div>
        </details>
      ))}
    </div>
  )
}

function TypographyTab({ record, mode, editable, patchMode }: ModeTabProps) {
  const tokens = record.package.modes[mode]
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <CompactObjectEditor title="Fontlar" tokens={tokens.typography} editable={editable} onChange={(key, value) => patchMode(`typography.${key}`, value)} />
      <CompactObjectEditor title="Spacing" tokens={tokens.spacing} editable={editable} onChange={(key, value) => patchMode(`spacing.${key}`, value)} />
      <CompactObjectEditor title="Radius" tokens={tokens.shape} editable={editable} onChange={(key, value) => patchMode(`shape.${key}`, value)} />
      <CompactObjectEditor title="Shadow" tokens={tokens.shadow} editable={editable} onChange={(key, value) => patchMode(`shadow.${key}`, value)} />
      <CompactObjectEditor title="Density" tokens={tokens.density} editable={editable} onChange={(key, value) => patchMode(`density.${key}`, value)} />
    </div>
  )
}

function PreviewTab({ record, mode, onModeChange }: { record: ManagedThemeRecord; mode: ThemeAppearance; onModeChange: (mode: ThemeAppearance) => void }) {
  const vars = themeTokensToCssVars(record.package.modes[mode])
  const tokens = record.package.modes[mode]
  return (
    <div className="space-y-4" style={vars as CSSProperties}>
      <ModeSwitch mode={mode} onChange={onModeChange} />
      <div className="overflow-hidden rounded-[var(--eden-radius-card)] border border-[var(--eden-border)] bg-[var(--eden-bg)] p-4 text-[var(--eden-text)]">
        <div className="mb-4 rounded-[var(--eden-radius-card)] border border-[var(--eden-page-banner-border)] bg-[var(--eden-page-banner-bg)] p-5 text-[var(--eden-page-banner-text)] shadow-[var(--eden-page-banner-shadow)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Page Banner</p>
              <h3 className="mt-1 text-xl font-semibold">{record.displayName}</h3>
              <p className="mt-1 text-sm opacity-80">{record.description || 'Tema aciklamasi'}</p>
            </div>
            <span className="rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold">Ekle</span>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-[var(--eden-radius-card)] bg-[var(--eden-nav-bg)] p-3 text-[var(--eden-nav-text)]">
            {['Ana Sayfa', 'Sirket Yonetimi', 'Temalarımız'].map((item, index) => (
              <div key={item} className={cn('mb-2 rounded-lg px-3 py-2 text-sm', index === 2 ? 'bg-[var(--eden-nav-active-bg)] text-[var(--eden-nav-active-text)]' : 'text-[var(--eden-nav-muted)]')}>
                {item}
              </div>
            ))}
          </aside>
          <main className="space-y-4">
            <div className="rounded-[var(--eden-radius-card)] border border-[var(--eden-smart-list-border)] bg-[var(--eden-smart-list-bg)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="font-semibold">Smart List</div>
                <div className="rounded-lg bg-[var(--eden-smart-list-header-bg)] px-3 py-1 text-xs">2/3</div>
              </div>
              <div className="overflow-hidden rounded-lg border border-[var(--eden-border)]">
                {['Tema adi', 'Durum', 'Versiyon'].map((item, index) => (
                  <div key={item} className={cn('grid grid-cols-3 border-b border-[var(--eden-border)] px-3 py-2 text-sm last:border-0', index === 0 ? 'bg-[var(--eden-table-header-bg)] font-semibold' : 'bg-[var(--eden-surface)]')}>
                    <span>{item}</span>
                    <span>{index === 0 ? 'Aktif' : STATUS_LABELS[record.status]}</span>
                    <span>{record.version}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[var(--eden-radius-card)] border border-[var(--eden-card-border)] bg-[var(--eden-card-bg)] p-[var(--eden-card-padding)] shadow-[var(--eden-card-shadow)]">
                <h4 className="font-semibold">Form Alani</h4>
                <div className="mt-3 space-y-2">
                  <div className="h-[var(--eden-form-field-height)] rounded-[var(--eden-radius-input)] border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-3 py-2 text-sm text-[var(--eden-text-muted)]">Tema adı</div>
                  <div className="h-[var(--eden-form-field-height)] rounded-[var(--eden-radius-input)] border border-[var(--eden-input-focus)] bg-[var(--eden-input-bg)] px-3 py-2 text-sm">Kurumsal Premium</div>
                </div>
              </div>
              <div className="rounded-[var(--eden-radius-card)] border border-[var(--eden-wizard-panel-border)] bg-[var(--eden-wizard-panel-bg)] p-4">
                <h4 className="font-semibold">Wizard</h4>
                <div className="mt-4 flex items-center gap-2">
                  {[1, 2, 3].map(step => (
                    <span key={step} className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold', step === 1 ? 'bg-[var(--eden-accent)] text-[var(--eden-accent-text)]' : 'bg-[var(--eden-surface-muted)]')}>
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
        <div className="mt-4 text-xs text-[var(--eden-text-muted)]">
          Motif: {tokens.motif.type} / Banner asset: {tokens.illustrations.pageBanner[mode].assetName || 'tanimsiz'}
        </div>
      </div>
    </div>
  )
}

function ImportExportTab({
  record,
  importText,
  setImportText,
  onImport,
  onExport,
}: {
  record: ManagedThemeRecord
  importText: string
  setImportText: (value: string) => void
  onImport: () => void
  onExport: (format: 'eden' | 'figma' | 'css') => void
}) {
  const runtimePackage = toRuntimeThemePackageV2(record.package)
  const figmaTokens = edenThemeRuntimePackageV2ToFigmaTokens(runtimePackage)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface-raised)] p-4">
        <h3 className="text-sm font-semibold text-[var(--eden-text)]">Export</h3>
        <p className="mt-1 text-sm text-[var(--eden-text-muted)]">Eden JSON runtime tema contract dosyasidir. Figma Tokens ayri tasarim exportudur ve runtime tema yerine gecmez.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => onExport('eden')} className={secondaryButtonClass}><FileJson size={16} /> Eden JSON</button>
          <button onClick={() => onExport('figma')} className={secondaryButtonClass}><Download size={16} /> Figma Tokens</button>
          <button onClick={() => onExport('css')} className={secondaryButtonClass}><Download size={16} /> CSS Variables</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Metric label="Runtime schema" value={runtimePackage.schemaVersion} />
          <Metric label="Asset registry" value={String(Object.keys(runtimePackage.assetRegistry).length)} />
          <Metric label="Figma groups" value={String(Object.keys(figmaTokens.global).length)} />
        </div>
        <pre className="mt-4 max-h-80 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(runtimePackage, null, 2)}</pre>
      </div>
      <div className="rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface-raised)] p-4">
        <h3 className="text-sm font-semibold text-[var(--eden-text)]">Import</h3>
        <p className="mt-1 text-sm text-[var(--eden-text-muted)]">Yalniz Eden Theme JSON runtime paketi kabul edilir. Figma Tokens import edilirse validation raporu verilir ama tema olarak acilmaz.</p>
        <textarea
          value={importText}
          onChange={event => setImportText(event.target.value)}
          className="mt-4 min-h-80 w-full rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] p-3 font-mono text-xs text-[var(--eden-text)] outline-none focus:border-[var(--eden-input-focus)]"
          placeholder={'{\n  "schemaVersion": "2.0.0",\n  "meta": {...},\n  "modes": {...},\n  "cssVariables": {...},\n  "assetRegistry": {...},\n  "validation": {...}\n}'}
        />
        <button onClick={onImport} className={cn(primaryButtonClass, 'mt-3')} disabled={!importText.trim()}>
          <Upload size={16} /> Import Et
        </button>
      </div>
    </div>
  )
}

function AuditTab({ record }: { record: ManagedThemeRecord }) {
  return (
    <div className="space-y-3">
      {record.audit.map((event, index) => (
        <div key={`${event.eventType}-${index}`} className="rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface-raised)] p-4">
          <div className="text-sm font-semibold text-[var(--eden-text)]">{event.eventType}</div>
          <div className="mt-1 text-xs text-[var(--eden-text-muted)]">{formatDate(event.timestamp)}</div>
          <p className="mt-2 text-sm text-[var(--eden-text-muted)]">{event.summary}</p>
        </div>
      ))}
      {!record.audit.length && <p className="text-sm text-[var(--eden-text-muted)]">Audit kaydi yok.</p>}
    </div>
  )
}

type ModeTabProps = {
  record: ManagedThemeRecord
  mode: ThemeAppearance
  editable: boolean
  patchMode: (path: string, value: string | number | boolean) => void
}

function ValidationSummary({ record }: { record: ManagedThemeRecord }) {
  const validation = record.validation || validateEdenThemePackage(record.package).validation
  const errors = validation.errors
  const contrastWarnings = validation.contrast.light.concat(validation.contrast.dark)
  return (
    <div className="lg:col-span-2 rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface-raised)] p-4">
      <div className="flex items-center gap-2">
        {validation.valid ? <CheckCircle2 className="text-emerald-600" size={18} /> : <XCircle className="text-red-600" size={18} />}
        <h3 className="text-sm font-semibold text-[var(--eden-text)]">Validation / Kontrast</h3>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Metric label="Error" value={String(errors.length)} />
        <Metric label="Warning" value={String(validation.warnings.length + contrastWarnings.length)} />
        <Metric label="Aktivasyon" value={validation.activationBlocked ? 'Bloklu' : 'Uygun'} />
      </div>
      <div className="mt-4 space-y-2">
        {errors.slice(0, 6).map(item => <IssueLine key={`${item.path}-${item.code}`} issue={item} />)}
        {validation.warnings.slice(0, 6).map((item, index) => (
          <div key={`${item.path}-${index}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {item.path}: {item.message}
          </div>
        ))}
        {contrastWarnings.slice(0, 6).map((item, index) => (
          <div key={`${item.path}-${index}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {item.path}: {item.message}
          </div>
        ))}
        {!errors.length && !validation.warnings.length && !contrastWarnings.length && <p className="text-sm text-[var(--eden-text-muted)]">Tema V2 validation ve temel kontrast kontrolunden gecti.</p>}
      </div>
    </div>
  )
}

function IssueLine({ issue }: { issue: ThemeValidationIssue }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
      {issue.path}: {issue.message}
    </div>
  )
}

function ModeSwitch({ mode, onChange }: { mode: ThemeAppearance; onChange: (mode: ThemeAppearance) => void }) {
  return (
    <div className="mb-4 inline-flex rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface-muted)] p-1">
      {(['light', 'dark'] as const).map(item => (
        <button
          key={item}
          onClick={() => onChange(item)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-semibold',
            mode === item ? 'bg-[var(--eden-surface)] text-[var(--eden-text)] shadow-sm' : 'text-[var(--eden-text-muted)]'
          )}
        >
          {item === 'light' ? 'Light' : 'Dark'}
        </button>
      ))}
    </div>
  )
}

function TextField({ label, value, disabled, onChange, className }: { label: string; value: string; disabled?: boolean; onChange?: (value: string) => void; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--eden-text-muted)]">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={event => onChange?.(event.target.value)}
        className="h-10 w-full rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-3 text-sm text-[var(--eden-text)] outline-none disabled:opacity-60 focus:border-[var(--eden-input-focus)]"
      />
    </label>
  )
}

function TextArea({ label, value, disabled, onChange, className }: { label: string; value: string; disabled?: boolean; onChange?: (value: string) => void; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--eden-text-muted)]">{label}</span>
      <textarea
        value={value}
        disabled={disabled}
        onChange={event => onChange?.(event.target.value)}
        rows={4}
        className="w-full rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-3 py-2 text-sm text-[var(--eden-text)] outline-none disabled:opacity-60 focus:border-[var(--eden-input-focus)]"
      />
    </label>
  )
}

function CompactColorInput({ value, disabled, onChange }: { value: string; disabled?: boolean; onChange: (value: string) => void }) {
  const canUsePicker = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
  return (
    <div className="flex min-w-[150px] items-center gap-2">
      <span className="h-7 w-7 shrink-0 rounded-md border border-[var(--eden-border)]" style={{ backgroundColor: value || 'transparent' }} />
      <input
        type={canUsePicker ? 'color' : 'text'}
        value={value}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
        className="h-8 min-w-0 flex-1 rounded-md border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-2 text-xs text-[var(--eden-text)] outline-none disabled:opacity-60 focus:border-[var(--eden-input-focus)]"
      />
    </div>
  )
}

function CompactPathTable({
  rows,
  source,
  editable,
  onChange,
}: {
  rows: readonly (readonly [string, string])[]
  source: unknown
  editable: boolean
  onChange: (path: string, value: string | number | boolean) => void
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--eden-border)]">
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--eden-table-header-bg)] text-[var(--eden-text-muted)]">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Alan</th>
            <th className="px-3 py-2 text-left font-semibold">Deger</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([path, label]) => {
            const raw = getPath(source, path)
            const value = raw === undefined || raw === null ? '' : String(raw)
            return (
              <tr key={path} className="border-t border-[var(--eden-border)] bg-[var(--eden-surface)]">
                <td className="px-3 py-2 text-[var(--eden-text)]">{label}</td>
                <td className="px-3 py-2">
                  <input
                    value={value}
                    disabled={!editable}
                    onChange={event => onChange(path, numericLike(raw) ? Number(event.target.value) : event.target.value)}
                    className="h-8 w-full min-w-[180px] rounded-md border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-2 text-sm text-[var(--eden-text)] outline-none disabled:opacity-60 focus:border-[var(--eden-input-focus)]"
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CompactObjectEditor({
  title,
  tokens,
  editable,
  onChange,
}: {
  title: string
  tokens: Record<string, unknown>
  editable: boolean
  onChange: (key: string, value: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface-raised)]">
      <div className="border-b border-[var(--eden-border)] px-3 py-2 text-sm font-semibold text-[var(--eden-text)]">{title}</div>
      <table className="min-w-full text-sm">
        <tbody>
          {Object.entries(tokens).map(([key, value]) => (
            <tr key={key} className="border-b border-[var(--eden-border)] last:border-0">
              <td className="w-44 px-3 py-2 font-mono text-xs text-[var(--eden-text-muted)]">{key}</td>
              <td className="px-3 py-2">
                <input
                  value={String(value ?? '')}
                  disabled={!editable}
                  onChange={event => onChange(key, event.target.value)}
                  className="h-8 w-full rounded-md border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-2 text-sm text-[var(--eden-text)] outline-none disabled:opacity-60 focus:border-[var(--eden-input-focus)]"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TokenGroupEditor({ title, tokens, editable, onChange }: { title: string; tokens: Record<string, string>; editable: boolean; onChange: (key: string, value: string) => void }) {
  return <CompactObjectEditor title={title} tokens={tokens} editable={editable} onChange={onChange} />
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface)] p-3">
      <div className="text-xs text-[var(--eden-text-muted)]">{label}</div>
      <div className="mt-1 text-lg font-semibold text-[var(--eden-text)]">{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: ManagedThemeStatus }) {
  return <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold', STATUS_CLASS[status])}>{STATUS_LABELS[status]}</span>
}

function sourceLabel(source: ManagedThemeRecord['source']) {
  if (source === 'system') return 'Sistem teması'
  if (source === 'imported') return 'Import edildi'
  if (source === 'generated') return 'Oluşturuldu'
  return 'Kullanıcı oluşturdu'
}

function foregroundHint(path: string) {
  if (path.toLowerCase().includes('primary')) return 'primaryForeground'
  if (path.toLowerCase().includes('card')) return 'cardForeground'
  if (path.toLowerCase().includes('input')) return 'inputForeground'
  if (path.toLowerCase().includes('muted')) return 'mutedForeground'
  return 'foreground'
}

function contrastHint(record: ManagedThemeRecord, path: string) {
  const validation = record.validation || validateEdenThemePackage(record.package).validation
  const issues = validation.contrast.light.concat(validation.contrast.dark)
  const issue = issues.find(item => item.path.includes(path.replace('colors.', '')))
  if (!issue) return 'Uygun'
  return issue.severity === 'critical' ? 'Kritik' : 'Uyari'
}

function numericLike(value: unknown) {
  return typeof value === 'number'
}

function filterRecord(record: ManagedThemeRecord, filter: ThemeFilter, search: string) {
  const query = search.trim().toLowerCase()
  const matchesSearch = !query
    || record.displayName.toLowerCase().includes(query)
    || record.themeKey.toLowerCase().includes(query)
    || record.description.toLowerCase().includes(query)
  if (!matchesSearch) return false
  if (filter === 'all') return true
  if (filter === 'invalid') return Boolean(record.validation && !record.validation.valid)
  if (filter === 'inactive') return record.status !== 'draft' && record.status !== 'active'
  return record.status === filter
}

function setPackagePath(packageValue: EdenThemePackage, path: string, value: unknown): EdenThemePackage {
  const draft = JSON.parse(JSON.stringify(packageValue)) as EdenThemePackage
  const parts = path.split('.')
  let cursor: Record<string, unknown> = draft as unknown as Record<string, unknown>
  parts.slice(0, -1).forEach(part => {
    if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {}
    cursor = cursor[part] as Record<string, unknown>
  })
  cursor[parts[parts.length - 1]] = value
  return refreshThemePackage(draft)
}

function getPath(value: unknown, path: string) {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined
    return (current as Record<string, unknown>)[key]
  }, value)
}

function applyImageAssets(packageValue: EdenThemePackage, images: ManagedThemeAssetImage[]) {
  let next = packageValue
  for (const image of images) {
    const src = image.previewUrl || image.url || image.thumbnailUrl || ''
    if (!src) continue
    const asset = {
      assetId: image.slotId,
      assetName: image.name || image.slotId,
      assetType: 'image',
      assetCategory: image.slotId,
      sourceType: 'upload',
      src,
      focalPointX: 50,
      focalPointY: 50,
      fit: 'cover',
      opacity: 1,
      overlayOpacity: 0,
      borderRadius: '18px',
      visibleOn: slotVisibility(image.slotId),
      enabled: true,
    }
    const target = imageSlotPackagePath(image.slotId)
    if (target) next = setPackagePath(next, target, asset)
  }
  return next
}

function slotVisibility(slotId: string) {
  if (slotId.includes('banner')) return ['banner']
  if (slotId.includes('smart_list')) return ['list']
  if (slotId.includes('form') || slotId.includes('detail_panel')) return ['form']
  if (slotId.includes('wizard')) return ['wizard']
  if (slotId.includes('login')) return ['login']
  if (slotId.includes('dashboard')) return ['dashboard']
  return []
}

function imageSlotPackagePath(slotId: string) {
  const paths: Record<string, string> = {
    light_page_banner: 'modes.light.illustrations.pageBanner.light',
    dark_page_banner: 'modes.dark.illustrations.pageBanner.dark',
    light_smart_list_watermark: 'modes.light.illustrations.listArea.watermark',
    dark_smart_list_watermark: 'modes.dark.illustrations.listArea.watermark',
    light_form_hero: 'modes.light.illustrations.formArea.heroIllustration',
    dark_form_hero: 'modes.dark.illustrations.formArea.heroIllustration',
    light_detail_panel: 'modes.light.illustrations.formArea.sideImage',
    dark_detail_panel: 'modes.dark.illustrations.formArea.sideImage',
    light_wizard: 'modes.light.illustrations.wizardArea.sideIllustration',
    dark_wizard: 'modes.dark.illustrations.wizardArea.sideIllustration',
    light_login: 'modes.light.illustrations.loginArea.heroImage',
    dark_login: 'modes.dark.illustrations.loginArea.heroImage',
    light_dashboard_hero: 'modes.light.illustrations.dashboardArea.dashboardHeroIllustration',
    dark_dashboard_hero: 'modes.dark.illustrations.dashboardArea.dashboardHeroIllustration',
    light_empty_state: 'modes.light.illustrations.listArea.emptyState',
    dark_empty_state: 'modes.dark.illustrations.listArea.emptyState',
  }
  return paths[slotId] || null
}

function lifecycleSummary(status: ManagedThemeStatus) {
  if (status === 'active') return 'Tema aktiflestirildi.'
  if (status === 'inactive') return 'Tema pasife alindi.'
  if (status === 'review' || status === 'approved' || status === 'archived' || status === 'rejected') return 'Tema pasif duruma alindi.'
  return 'Tema taslak durumuna alindi.'
}

function downloadFile(filename: string, body: string, contentType: string) {
  const blob = new Blob([body], { type: contentType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

const primaryButtonClass = 'inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--eden-accent)] px-3 text-sm font-semibold text-[var(--eden-accent-text)] disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButtonClass = 'inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface)] px-3 text-sm font-semibold text-[var(--eden-text)] hover:bg-[var(--eden-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50'
const dangerButtonClass = 'inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50'
