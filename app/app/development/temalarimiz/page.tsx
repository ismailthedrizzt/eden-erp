'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  Archive,
  CheckCircle2,
  Download,
  FileJson,
  Image as ImageIcon,
  Layers,
  Palette,
  Save,
  Search,
  Send,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react'
import PageBanner from '@/components/ui/PageBanner'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { ImageSlotUploader, type ImageSlot, type SlotImage } from '@/components/ui/ImageSlotUploader'
import { DocumentSlotUploader, type DocumentSlot, type SlotDocument } from '@/components/ui/DocumentSlotUploader'
import { themeConcepts, type ThemeConceptId } from '@/components/design-lab/themeConcepts'
import { parseAndValidateThemeJson, validateEdenThemePackage } from '@/lib/theme/themeValidation'
import { edenThemeToCssVariables, edenThemeToFigmaTokens, themeTokensToCssVars } from '@/lib/theme/themeTransforms'
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
import type { EdenThemePackage, ThemeAppearance, ThemeModeTokens, ThemeValidationIssue } from '@/lib/theme/themeSchema'
import { cn } from '@/lib/utils'

type ToastState = { type: ToastType; title?: string; message: string }
type ThemeTab = 'general' | 'surface' | 'colors' | 'background' | 'illustrations' | 'components' | 'states' | 'preview' | 'importExport' | 'audit'
type ThemeFilter = 'all' | 'active' | 'draft' | 'review' | 'approved' | 'archived' | 'invalid'

const STATUS_LABELS: Record<ManagedThemeStatus, string> = {
  draft: 'Taslak',
  review: 'Incelemede',
  approved: 'Onaylandi',
  active: 'Aktif',
  archived: 'Arsivlendi',
  rejected: 'Reddedildi',
}

const STATUS_CLASS: Record<ManagedThemeStatus, string> = {
  draft: 'border-slate-200 bg-slate-50 text-slate-700',
  review: 'border-amber-200 bg-amber-50 text-amber-800',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  active: 'border-teal-200 bg-teal-50 text-teal-800',
  archived: 'border-zinc-200 bg-zinc-50 text-zinc-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
}

const FILTERS: { id: ThemeFilter; label: string }[] = [
  { id: 'all', label: 'Tumu' },
  { id: 'active', label: 'Aktif' },
  { id: 'draft', label: 'Taslak' },
  { id: 'review', label: 'Incelemede' },
  { id: 'approved', label: 'Onaylandi' },
  { id: 'archived', label: 'Arsiv' },
  { id: 'invalid', label: 'Hata' },
]

const TABS: { id: ThemeTab; label: string }[] = [
  { id: 'general', label: 'Genel Bilgiler' },
  { id: 'surface', label: 'Ana Ekran / Uygulama Yuzeyi' },
  { id: 'colors', label: 'Renkler' },
  { id: 'background', label: 'Arka Plan / Pattern' },
  { id: 'illustrations', label: 'Gorseller / Illustrasyonlar' },
  { id: 'components', label: 'Bilesen Kurallari' },
  { id: 'states', label: 'Kurallar / State' },
  { id: 'preview', label: 'Preview' },
  { id: 'importExport', label: 'Export / Import' },
  { id: 'audit', label: 'Audit' },
]

const IMAGE_SLOTS: ImageSlot[] = [
  { id: 'light_banner', title: 'Light Banner', description: 'PageBanner light gorseli', required: true },
  { id: 'dark_banner', title: 'Dark Banner', description: 'PageBanner dark gorseli', required: true },
  { id: 'form_hero', title: 'Form Hero', description: 'Detay form sol/hero gorseli' },
  { id: 'list_watermark', title: 'Liste Watermark', description: 'Smart List yuzey gorseli' },
  { id: 'wizard_side', title: 'Wizard Side', description: 'Sihirbaz yan panel gorseli' },
  { id: 'dashboard_hero', title: 'Dashboard Hero', description: 'Ana sayfa karsilama gorseli' },
]

const DOCUMENT_SLOTS: DocumentSlot[] = [
  { id: 'designer_brief', title: 'Tasarimci Notlari', acceptedTypes: ['application/pdf', 'text/markdown', 'text/plain'], maxSizeMB: 10 },
  { id: 'figma_tokens', title: 'Figma Tokens', acceptedTypes: ['application/json', 'text/plain'], maxSizeMB: 5 },
  { id: 'theme_readme', title: 'README', acceptedTypes: ['text/markdown', 'text/plain'], maxSizeMB: 5 },
  { id: 'validation_notes', title: 'Validation Notlari', acceptedTypes: ['application/pdf', 'text/plain'], maxSizeMB: 10 },
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

const SURFACE_FIELDS = [
  ['background.page.color', 'Sayfa arka plani'],
  ['background.app.gradientTo', 'Ana icerik ikinci renk'],
  ['background.sidebar.color', 'Sidebar arka plani'],
  ['background.topbar.color', 'Topbar arka plani'],
  ['background.form.color', 'Form yuzeyi'],
  ['background.list.color', 'Liste yuzeyi'],
  ['background.login.color', 'Login arka plani'],
  ['background.dashboard.color', 'Dashboard yuzeyi'],
] as const

const COMPONENT_GROUPS = ['shell', 'pageBanner', 'smartList', 'cards', 'forms', 'tables', 'badges', 'wizard', 'tabs', 'modal', 'drawer', 'buttons', 'alerts', 'toast', 'interaction'] as const

const STATE_FIELDS = [
  ['states.hoverBackground', 'Hover background'],
  ['states.activeBackground', 'Active background'],
  ['states.selectedBackground', 'Selected background'],
  ['states.selectedBorder', 'Selected border'],
  ['states.disabledOpacity', 'Disabled opacity'],
  ['states.focusRing', 'Focus ring'],
  ['states.errorState', 'Error state'],
  ['states.warningState', 'Warning state'],
  ['states.successState', 'Success state'],
  ['spacing.pagePadding', 'Page padding'],
  ['spacing.sectionGap', 'Section gap'],
  ['spacing.cardPadding', 'Card padding'],
  ['spacing.tableRowHeight', 'Table row height'],
  ['shape.radiusCard', 'Card radius'],
  ['shape.radiusBanner', 'Banner radius'],
  ['shadow.shadowCard', 'Card shadow'],
  ['shadow.shadowBanner', 'Banner shadow'],
] as const

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
  const allRecords = useMemo(() => [...systemRecords, ...records], [records, systemRecords])
  const selected = allRecords.find(record => record.id === selectedId) || null
  const listRecords = allRecords.filter(record => filterRecord(record, filter, search))
  const editable = Boolean(selected && selected.source !== 'system' && selected.status !== 'active' && selected.status !== 'archived')

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
      inspiration: 'Tema tokenlari, gorselleri ve bilesen kurallari bu formdan yonetilir.',
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
        lifecycle: { status: 'draft', reason: 'Editable copy created from system theme.' },
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
      notify('warning', 'Sistem seed temalari dogrudan lifecycle degistirmez; once kopya olusturun.')
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
    const result = parseAndValidateThemeJson(importText)
    if (!result.theme) {
      notify('error', result.validation.errors[0]?.message || 'Tema JSON V2 validation gecemedi.', 'Import reddedildi')
      return
    }
    const record = createImportedThemeRecord(result.theme, result.validation, 'development_admin')
    upsertManagedThemeRecord(record)
    setRecords(readManagedThemeRecords())
    setSelectedId(record.id)
    setActiveTab('general')
    setImportText('')
    notify('success', 'Tema inceleme durumunda import edildi.')
  }

  function exportSelected(format: 'eden' | 'figma' | 'css') {
    if (!selected) return
    if (format === 'eden') {
      downloadFile(`${selected.themeKey}.eden-theme.v2.json`, JSON.stringify(selected.package, null, 2), 'application/json')
      return
    }
    if (format === 'figma') {
      downloadFile(`${selected.themeKey}.figma-tokens.json`, JSON.stringify(edenThemeToFigmaTokens(selected.package), null, 2), 'application/json')
      return
    }
    downloadFile(`${selected.themeKey}.css-variables.css`, edenThemeToCssVariables(selected.package), 'text/css')
  }

  if (selected) {
    return (
      <div className="space-y-5">
        {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}
        <PageBanner
          mode="form"
          formMode={editable ? 'edit' : 'view'}
          title="Temalarımız"
          subtitle="Sistem temasi V2 token, gorsel ve lifecycle formu."
          icon={<Palette size={24} />}
          onBackClick={() => setSelectedId(null)}
          backButtonText="Listeye Don"
        />

        <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-4 rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface)] p-4 shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-[var(--eden-text)]">Tema gorsel ve belge slotlari</h2>
              <p className="mt-1 text-sm text-[var(--eden-text-muted)]">Banner, liste, form ve wizard gorselleri V2 tema varligi olarak tutulur.</p>
            </div>
            <ImageSlotUploader
              slots={IMAGE_SLOTS}
              images={selected.images as SlotImage[]}
              onChange={handleImagesChange}
              allowExtraSlots={false}
              readOnly={!editable}
              mode={editable ? 'update' : 'view'}
            />
            <DocumentSlotUploader
              slots={DOCUMENT_SLOTS}
              documents={selected.documents as SlotDocument[]}
              onChange={handleDocumentsChange}
              allowExtraSlots={false}
              readOnly={!editable}
              mode={editable ? 'update' : 'view'}
              defaultTab="upload"
            />
          </div>

          <div className="rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface)] p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <span className="rounded-full border border-[var(--eden-border)] px-2.5 py-1 text-xs font-semibold text-[var(--eden-text-muted)]">scope: system</span>
                  <span className="rounded-full border border-[var(--eden-border)] px-2.5 py-1 text-xs font-semibold text-[var(--eden-text-muted)]">{selected.source}</span>
                  {selected.package.meta.isActive && <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">Aktif sistem temasi</span>}
                </div>
                <h1 className="truncate text-2xl font-semibold text-[var(--eden-text)]">{selected.displayName}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--eden-text-muted)]">{selected.description || 'Açıklama girilmedi.'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.source === 'system' ? (
                  <button onClick={() => makeEditableCopy(selected)} className={primaryButtonClass}>
                    <Layers size={16} /> Duzenlenebilir Kopya
                  </button>
                ) : (
                  <button onClick={saveSelected} className={primaryButtonClass}>
                    <Save size={16} /> Kaydet
                  </button>
                )}
                <button onClick={() => exportSelected('eden')} className={secondaryButtonClass}><FileJson size={16} /> JSON</button>
                <button onClick={() => exportSelected('figma')} className={secondaryButtonClass}><Download size={16} /> Figma</button>
                <button onClick={() => exportSelected('css')} className={secondaryButtonClass}><Download size={16} /> CSS</button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <TextField label="Tema adi" value={selected.displayName} disabled={!editable} onChange={value => patchMeta('displayName', value)} />
              <TextField label="Tema kodu / slug" value={selected.themeKey} disabled={!editable} onChange={value => patchMeta('themeKey', normalizeManagedThemeKey(value) || selected.themeKey)} />
              <TextField label="Versiyon" value={selected.version} disabled={!editable} onChange={value => patchMeta('version', value)} />
              <TextField label="Author" value={selected.author} disabled={!editable} onChange={value => patchMeta('author', value)} />
              <TextArea className="lg:col-span-2" label="Açıklama" value={selected.description} disabled={!editable} onChange={value => patchMeta('description', value)} />
            </div>

            <LifecyclePanel
              record={selected}
              onReview={() => setLifecycle(selected, 'review')}
              onApprove={() => setLifecycle(selected, 'approved')}
              onActivate={() => setLifecycle(selected, 'active')}
              onArchive={() => setLifecycle(selected, 'archived')}
            />
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
              <GeneralTab record={selected} editable={editable} patchMetadata={patchMetadata} />
            )}
            {activeTab === 'surface' && (
              <SurfaceTab record={selected} mode={mode} editable={editable} patchMode={patchMode} />
            )}
            {activeTab === 'colors' && (
              <ColorsTab record={selected} mode={mode} editable={editable} patchMode={patchMode} />
            )}
            {activeTab === 'background' && (
              <BackgroundTab record={selected} mode={mode} editable={editable} patchMode={patchMode} />
            )}
            {activeTab === 'illustrations' && (
              <IllustrationsTab record={selected} mode={mode} editable={editable} patchMode={patchMode} />
            )}
            {activeTab === 'components' && (
              <ComponentsTab record={selected} mode={mode} editable={editable} patchMode={patchMode} />
            )}
            {activeTab === 'states' && (
              <StatesTab record={selected} mode={mode} editable={editable} patchMode={patchMode} />
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

function GeneralTab({
  record,
  editable,
  patchMetadata,
}: {
  record: ManagedThemeRecord
  editable: boolean
  patchMetadata: (path: keyof EdenThemePackage['metadata'], value: string) => void
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TextArea label="Sanat yonu" value={record.artDirection} disabled={!editable} onChange={value => patchMetadata('artDirection', value)} />
      <TextArea label="Ilham notu" value={record.inspiration} disabled={!editable} onChange={value => patchMetadata('inspiration', value)} />
      <TextField label="Kategori" value={record.category} disabled={!editable} onChange={value => patchMetadata('category', value)} />
      <TextField label="Light / Dark / System mode" value={record.package.meta.supportedModes.join(', ')} disabled />
      <TextArea className="lg:col-span-2" label="Notlar" value={record.notes} disabled={!editable} onChange={value => patchMetadata('notes', value)} />
      <ValidationSummary record={record} />
    </div>
  )
}

function SurfaceTab({ record, mode, editable, patchMode }: ModeTabProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {SURFACE_FIELDS.map(([path, label]) => (
        <ColorTextField
          key={path}
          label={label}
          value={String(getPath(record.package.modes[mode], path) || '')}
          disabled={!editable}
          onChange={value => patchMode(path, value)}
        />
      ))}
      <SurfacePreview modeTokens={record.package.modes[mode]} />
    </div>
  )
}

function ColorsTab({ record, mode, editable, patchMode }: ModeTabProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {COLOR_FIELDS.map(field => (
        <ColorTextField
          key={field.path}
          label={field.label}
          helper={field.helper}
          value={String(getPath(record.package.modes[mode], field.path) || '')}
          disabled={!editable}
          onChange={value => patchMode(field.path, value)}
        />
      ))}
    </div>
  )
}

function BackgroundTab({ record, mode, editable, patchMode }: ModeTabProps) {
  const backgrounds = record.package.modes[mode].background
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Object.entries(backgrounds).map(([key, value]) => (
        <div key={key} className="rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface-raised)] p-4">
          <h3 className="mb-3 text-sm font-semibold capitalize text-[var(--eden-text)]">{key}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Type" value={value.type} disabled />
            <ColorTextField label="Color" value={value.color || ''} disabled={!editable} onChange={next => patchMode(`background.${key}.color`, next)} />
            <ColorTextField label="Gradient From" value={value.gradientFrom || ''} disabled={!editable} onChange={next => patchMode(`background.${key}.gradientFrom`, next)} />
            <ColorTextField label="Gradient To" value={value.gradientTo || ''} disabled={!editable} onChange={next => patchMode(`background.${key}.gradientTo`, next)} />
            <TextField label="Pattern opacity" value={String(value.patternOpacity)} disabled={!editable} onChange={next => patchMode(`background.${key}.patternOpacity`, Number(next))} />
          </div>
        </div>
      ))}
    </div>
  )
}

function IllustrationsTab({ record, mode, editable, patchMode }: ModeTabProps) {
  const illustrations = record.package.modes[mode].illustrations
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AssetCard title="Page Banner Light" asset={illustrations.pageBanner.light} editable={editable} onOpacity={value => patchMode('illustrations.pageBanner.light.opacity', value)} />
      <AssetCard title="Page Banner Dark" asset={illustrations.pageBanner.dark} editable={editable} onOpacity={value => patchMode('illustrations.pageBanner.dark.opacity', value)} />
      <AssetCard title="Liste Watermark" asset={illustrations.listArea.watermark} editable={editable} onOpacity={value => patchMode('illustrations.listArea.watermark.opacity', value)} />
      <AssetCard title="Form Hero" asset={illustrations.formArea.heroIllustration} editable={editable} onOpacity={value => patchMode('illustrations.formArea.heroIllustration.opacity', value)} />
      <AssetCard title="Wizard Side" asset={illustrations.wizardArea.sideIllustration} editable={editable} onOpacity={value => patchMode('illustrations.wizardArea.sideIllustration.opacity', value)} />
      <AssetCard title="Dashboard Hero" asset={illustrations.dashboardArea.dashboardHeroIllustration} editable={editable} onOpacity={value => patchMode('illustrations.dashboardArea.dashboardHeroIllustration.opacity', value)} />
    </div>
  )
}

function ComponentsTab({ record, mode, editable, patchMode }: ModeTabProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {COMPONENT_GROUPS.map(group => (
        <TokenGroupEditor
          key={group}
          title={group}
          tokens={record.package.modes[mode].components[group]}
          editable={editable}
          onChange={(key, value) => patchMode(`components.${group}.${key}`, value)}
        />
      ))}
    </div>
  )
}

function StatesTab({ record, mode, editable, patchMode }: ModeTabProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {STATE_FIELDS.map(([path, label]) => (
        <TextField
          key={path}
          label={label}
          value={String(getPath(record.package.modes[mode], path) || '')}
          disabled={!editable}
          onChange={value => patchMode(path, path === 'states.disabledOpacity' ? Number(value) : value)}
        />
      ))}
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
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface-raised)] p-4">
        <h3 className="text-sm font-semibold text-[var(--eden-text)]">Export</h3>
        <p className="mt-1 text-sm text-[var(--eden-text-muted)]">Export sadece tema tokenlari, gorsel referanslari ve tasarim metadata icerir.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => onExport('eden')} className={secondaryButtonClass}><FileJson size={16} /> Eden JSON</button>
          <button onClick={() => onExport('figma')} className={secondaryButtonClass}><Download size={16} /> Figma Tokens</button>
          <button onClick={() => onExport('css')} className={secondaryButtonClass}><Download size={16} /> CSS Variables</button>
        </div>
        <pre className="mt-4 max-h-80 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify(record.package, null, 2)}</pre>
      </div>
      <div className="rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface-raised)] p-4">
        <h3 className="text-sm font-semibold text-[var(--eden-text)]">Import</h3>
        <p className="mt-1 text-sm text-[var(--eden-text-muted)]">Yalniz V2 Eden Theme JSON kabul edilir. Import otomatik aktif olmaz, inceleme durumunda acilir.</p>
        <textarea
          value={importText}
          onChange={event => setImportText(event.target.value)}
          className="mt-4 min-h-80 w-full rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] p-3 font-mono text-xs text-[var(--eden-text)] outline-none focus:border-[var(--eden-input-focus)]"
          placeholder={'{\n  "schemaVersion": "2.0.0",\n  "meta": {...},\n  "modes": {...}\n}'}
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

function LifecyclePanel({
  record,
  onReview,
  onApprove,
  onActivate,
  onArchive,
}: {
  record: ManagedThemeRecord
  onReview: () => void
  onApprove: () => void
  onActivate: () => void
  onArchive: () => void
}) {
  const blocked = record.validation?.activationBlocked
  return (
    <div className="mt-5 rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface-raised)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--eden-text)]">Lifecycle</h3>
          <p className="mt-1 text-sm text-[var(--eden-text-muted)]">Aktivasyon liste aksiyonu degil; inceleme, onay ve aktiflestirme gecisleriyle yonetilir.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={record.source === 'system' || record.status !== 'draft'} onClick={onReview} className={secondaryButtonClass}><Send size={16} /> Incelemeye Gonder</button>
          <button disabled={record.source === 'system' || record.status !== 'review'} onClick={onApprove} className={secondaryButtonClass}><ShieldCheck size={16} /> Onayla</button>
          <button disabled={record.source === 'system' || record.status !== 'approved' || blocked} onClick={onActivate} className={primaryButtonClass}><CheckCircle2 size={16} /> Aktiflestir</button>
          <button disabled={record.source === 'system' || record.status === 'active'} onClick={onArchive} className={dangerButtonClass}><Archive size={16} /> Arsivle</button>
        </div>
      </div>
    </div>
  )
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

function ColorTextField({ label, value, helper, disabled, onChange }: { label: string; value: string; helper?: string; disabled?: boolean; onChange: (value: string) => void }) {
  const canUsePicker = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
  return (
    <label className="block rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface-raised)] p-3">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--eden-text-muted)]">{label}</span>
      <div className="flex items-center gap-2">
        <span className="h-9 w-9 rounded-lg border border-[var(--eden-border)]" style={{ backgroundColor: value || 'transparent' }} />
        <input
          type={canUsePicker ? 'color' : 'text'}
          value={value}
          disabled={disabled}
          onChange={event => onChange(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-2 text-sm text-[var(--eden-text)] outline-none disabled:opacity-60 focus:border-[var(--eden-input-focus)]"
        />
      </div>
      {helper && <span className="mt-2 block text-xs text-[var(--eden-text-muted)]">{helper}</span>}
    </label>
  )
}

function TokenGroupEditor({ title, tokens, editable, onChange }: { title: string; tokens: Record<string, string>; editable: boolean; onChange: (key: string, value: string) => void }) {
  return (
    <div className="rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface-raised)] p-4">
      <h3 className="mb-3 text-sm font-semibold capitalize text-[var(--eden-text)]">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(tokens).map(([key, value]) => (
          <TextField key={key} label={key} value={String(value)} disabled={!editable} onChange={next => onChange(key, next)} />
        ))}
      </div>
    </div>
  )
}

function AssetCard({ title, asset, editable, onOpacity }: { title: string; asset: ThemeModeTokens['illustrations']['formArea']['heroIllustration']; editable: boolean; onOpacity: (value: number) => void }) {
  return (
    <div className="rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface-raised)] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--eden-accent-soft)] text-[var(--eden-accent)]">
          <ImageIcon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--eden-text)]">{title}</h3>
          <p className="mt-1 truncate text-xs text-[var(--eden-text-muted)]">{asset.assetName || asset.assetId || 'Asset tanimli degil'}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <TextField label="Source type" value={asset.sourceType} disabled />
            <TextField label="Fit" value={asset.fit} disabled />
            <TextField label="Opacity" value={String(asset.opacity)} disabled={!editable} onChange={value => onOpacity(Number(value))} />
            <TextField label="Enabled" value={asset.enabled ? 'true' : 'false'} disabled />
          </div>
        </div>
      </div>
    </div>
  )
}

function SurfacePreview({ modeTokens }: { modeTokens: ThemeModeTokens }) {
  const vars = themeTokensToCssVars(modeTokens)
  return (
    <div className="lg:col-span-2 rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface-raised)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--eden-text)]">Canli yuzey onizleme</h3>
      <div className="rounded-xl border border-[var(--eden-border)] p-4" style={vars as CSSProperties}>
        <div className="rounded-lg bg-[var(--eden-bg)] p-4 text-[var(--eden-text)]">
          <div className="rounded-lg bg-[var(--eden-header-bg)] p-3">Topbar</div>
          <div className="mt-3 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
            <div className="rounded-lg bg-[var(--eden-nav-bg)] p-3 text-[var(--eden-nav-text)]">Sidebar</div>
            <div className="rounded-lg border border-[var(--eden-card-border)] bg-[var(--eden-card-bg)] p-3">Card / Smart List / Form alanlari</div>
          </div>
        </div>
      </div>
    </div>
  )
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

function filterRecord(record: ManagedThemeRecord, filter: ThemeFilter, search: string) {
  const query = search.trim().toLowerCase()
  const matchesSearch = !query
    || record.displayName.toLowerCase().includes(query)
    || record.themeKey.toLowerCase().includes(query)
    || record.description.toLowerCase().includes(query)
  if (!matchesSearch) return false
  if (filter === 'all') return true
  if (filter === 'invalid') return Boolean(record.validation && !record.validation.valid)
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
    if (image.slotId === 'light_banner') next = setPackagePath(next, 'modes.light.illustrations.pageBanner.light', asset)
    if (image.slotId === 'dark_banner') next = setPackagePath(next, 'modes.dark.illustrations.pageBanner.dark', asset)
    if (image.slotId === 'form_hero') {
      next = setPackagePath(next, 'modes.light.illustrations.formArea.heroIllustration', asset)
      next = setPackagePath(next, 'modes.dark.illustrations.formArea.heroIllustration', asset)
    }
    if (image.slotId === 'list_watermark') {
      next = setPackagePath(next, 'modes.light.illustrations.listArea.watermark', asset)
      next = setPackagePath(next, 'modes.dark.illustrations.listArea.watermark', asset)
    }
    if (image.slotId === 'wizard_side') {
      next = setPackagePath(next, 'modes.light.illustrations.wizardArea.sideIllustration', asset)
      next = setPackagePath(next, 'modes.dark.illustrations.wizardArea.sideIllustration', asset)
    }
    if (image.slotId === 'dashboard_hero') {
      next = setPackagePath(next, 'modes.light.illustrations.dashboardArea.dashboardHeroIllustration', asset)
      next = setPackagePath(next, 'modes.dark.illustrations.dashboardArea.dashboardHeroIllustration', asset)
    }
  }
  return next
}

function slotVisibility(slotId: string) {
  if (slotId.includes('banner')) return ['banner']
  if (slotId.includes('list')) return ['list']
  if (slotId.includes('form')) return ['form']
  if (slotId.includes('wizard')) return ['wizard']
  if (slotId.includes('dashboard')) return ['dashboard']
  return []
}

function lifecycleSummary(status: ManagedThemeStatus) {
  if (status === 'review') return 'Tema incelemeye gonderildi.'
  if (status === 'approved') return 'Tema onaylandi.'
  if (status === 'active') return 'Tema aktiflestirildi.'
  if (status === 'archived') return 'Tema arsivlendi.'
  if (status === 'rejected') return 'Tema reddedildi.'
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
