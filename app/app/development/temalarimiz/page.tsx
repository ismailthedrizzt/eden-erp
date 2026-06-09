'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Download,
  Eye,
  Layers,
  Palette,
  Save,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react'
import PageBanner from '@/components/ui/PageBanner'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { VISUAL_THEME_CHANGE_EVENT, VISUAL_THEME_STORAGE_KEY, themeConcepts, type ThemeConceptId } from '@/components/design-lab/themeConcepts'
import { parseAndValidateThemeJson, validateEdenThemePackage } from '@/lib/theme/themeValidation'
import { edenThemeToCssVariables, edenThemeToFigmaTokens, themeTokensToCssVars } from '@/lib/theme/themeTransforms'
import {
  THEME_MANAGEMENT_CHANGE_EVENT,
  componentTokensFromPackage,
  createDraftThemeRecord,
  createImportedThemeRecord,
  deleteManagedThemeRecord,
  getSystemThemeRecords,
  normalizeManagedThemeKey,
  readManagedThemeRecords,
  upsertManagedThemeRecord,
  validateManagedTheme,
  withThemeLifecycle,
  type ManagedMotifType,
  type ManagedThemeComponentTokens,
  type ManagedThemeRecord,
  type ManagedThemeStatus,
} from '@/lib/theme/themeManagement'
import type { EdenThemePackage, ThemeAppearance, ThemeModeTokens, ThemeValidationIssue } from '@/lib/theme/themeSchema'
import { cn } from '@/lib/utils'

type ToastState = { type: ToastType; title?: string; message: string }
type ThemeTab = 'general' | 'surface' | 'colors' | 'background' | 'illustrations' | 'typography' | 'components' | 'states' | 'metrics' | 'preview' | 'importExport'
type ThemeFilter = 'all' | 'active' | 'draft' | 'preview' | 'imported' | 'system' | 'invalid' | 'contrast'

const STATUS_LABELS: Record<ManagedThemeStatus, string> = {
  draft: 'Taslak',
  preview: 'İncelemede',
  active: 'Aktif',
  inactive: 'Onaylandı',
  archived: 'Arşivlendi',
  rejected: 'Reddedildi',
}

const SOURCE_LABELS: Record<string, string> = {
  system: 'system',
  imported: 'imported',
  user_created: 'user_created',
  generated: 'generated',
}

const FILTERS: { id: ThemeFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'active', label: 'Aktif' },
  { id: 'draft', label: 'Taslaklar' },
  { id: 'preview', label: 'İncelemede' },
  { id: 'imported', label: 'Import edilenler' },
  { id: 'system', label: 'Sistem temaları' },
  { id: 'invalid', label: 'Validation hatalı' },
  { id: 'contrast', label: 'Kontrast uyarısı' },
]

const TABS: { id: ThemeTab; label: string }[] = [
  { id: 'general', label: 'Genel Bilgiler' },
  { id: 'surface', label: 'Ana Ekran / Uygulama Yüzeyi' },
  { id: 'colors', label: 'Renkler' },
  { id: 'background', label: 'Arka Plan / Pattern' },
  { id: 'illustrations', label: 'Görseller / İllüstrasyonlar' },
  { id: 'typography', label: 'Tipografi' },
  { id: 'components', label: 'Bileşen Kuralları' },
  { id: 'states', label: 'Kurallar / State’ler' },
  { id: 'metrics', label: 'Ölçüler / Spacing / Radius / Shadow' },
  { id: 'preview', label: 'Preview' },
  { id: 'importExport', label: 'Export / Import' },
]

const COLOR_GROUPS = [
  {
    title: 'Base',
    paths: [
      ['color.background', 'background'],
      ['color.foreground', 'foreground'],
      ['color.surface', 'surface'],
      ['color.surfaceMuted', 'surfaceMuted'],
      ['color.surfaceRaised', 'surfaceRaised'],
      ['color.border', 'border'],
      ['color.borderStrong', 'borderStrong'],
      ['color.text.primary', 'text'],
      ['color.text.secondary', 'textMuted'],
      ['color.text.muted', 'textSoft'],
    ],
  },
  {
    title: 'Accent',
    paths: [
      ['color.accent.primary', 'accent'],
      ['color.accent.secondary', 'accentSecondary'],
      ['color.accent.soft', 'accentSoft'],
      ['color.warning', 'accentWarm'],
    ],
  },
  {
    title: 'Status',
    paths: [
      ['color.success', 'success'],
      ['color.warning', 'warning'],
      ['color.danger', 'danger'],
      ['color.info', 'info'],
    ],
  },
] as const

const TOKEN_GROUPS = [
  { key: 'radius', title: 'Shape' },
  { key: 'shadow', title: 'Shadow' },
  { key: 'typography', title: 'Typography' },
  { key: 'density', title: 'Density' },
  { key: 'icon', title: 'Icon' },
] as const

const MOTIF_TYPES: ManagedMotifType[] = ['none', 'geometric', 'botanical', 'horizon', 'circles', 'skyline', 'broken_grid', 'custom_svg']
const LIST_ACTION_CLASS = 'inline-flex h-7 items-center gap-1 rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface)] px-2 text-[11px] font-semibold text-[var(--eden-text)] hover:bg-[var(--eden-surface-muted)]'
const LIST_DANGER_ACTION_CLASS = 'inline-flex h-7 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 text-[11px] font-semibold text-red-700 hover:bg-red-100'
const DETAIL_ACTION_CLASS = 'inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface)] px-3 text-sm font-semibold text-[var(--eden-text)] hover:bg-[var(--eden-surface-muted)]'
const DETAIL_PRIMARY_ACTION_CLASS = 'inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--eden-accent)] px-3 text-sm font-semibold text-[var(--eden-accent-text)]'
const DETAIL_DANGER_ACTION_CLASS = 'inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 hover:bg-red-100'

export default function DevelopmentThemesPage() {
  const [records, setRecords] = useState<ManagedThemeRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ThemeTab>('general')
  const [filter, setFilter] = useState<ThemeFilter>('all')
  const [showCreate, setShowCreate] = useState(false)
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
  const filteredRecords = allRecords.filter(record => filterRecord(record, filter))
  const listMode = !selected

  function notify(type: ToastType, message: string, title?: string) {
    setToast({ type, message, title })
  }

  function saveRecord(record: ManagedThemeRecord, message = 'Tema kaydedildi.') {
    if (record.source === 'system') {
      notify('warning', 'Sistem temaları bu ekrandan değiştirilemez.')
      return
    }
    const next = validateManagedTheme(record)
    upsertManagedThemeRecord(next)
    setSelectedId(next.id)
    notify('success', message)
  }

  function createDraft(values: CreateThemeValues) {
    const themeKey = normalizeManagedThemeKey(values.themeKey)
    if (!themeKey) {
      notify('error', 'Internal key lowercase harf/rakam/underscore içermeli ve boşluk içermemelidir.', 'Key geçersiz')
      return
    }
    if (allRecords.some(record => record.themeKey === themeKey)) {
      notify('error', 'Bu internal key zaten kullanılıyor.', 'Key çakışması')
      return
    }
    const draft = createDraftThemeRecord({
      displayName: values.displayName,
      themeKey,
      description: values.description,
      artDirection: values.artDirection,
      inspiration: values.inspiration,
      category: values.category,
      baseThemeId: values.baseThemeId,
      createdBy: 'development_admin',
    })
    upsertManagedThemeRecord(draft)
    setSelectedId(draft.id)
    setActiveTab('general')
    setShowCreate(false)
    notify('success', 'Yeni tema taslak olarak oluşturuldu.')
  }

  function createBlankDraft() {
    const suffix = Date.now().toString(36)
    const themeKey = `tema_${suffix}`
    const draft = createDraftThemeRecord({
      displayName: 'Yeni Tema',
      themeKey,
      description: 'Eden ERP sistem teması taslağı.',
      artDirection: 'Kurumsal sistem teması',
      inspiration: 'Tema JSON, token ve görsel varlıkları bu formdan yönetilir.',
      category: 'system',
      baseThemeId: 'hikmet',
      createdBy: 'development_admin',
    })
    upsertManagedThemeRecord(draft)
    setSelectedId(draft.id)
    setActiveTab('general')
    setShowCreate(false)
    notify('success', 'Yeni tema formu taslak olarak açıldı.')
  }

  function duplicateTheme(record: ManagedThemeRecord) {
    const suffix = Date.now().toString(36)
    const themeKey = `${record.themeKey}_copy_${suffix}`.slice(0, 64)
    const now = new Date().toISOString()
    const duplicate = validateManagedTheme({
      ...record,
      id: `draft_${themeKey}`,
      themeKey,
      displayName: `${record.displayName} Kopya`,
      status: 'draft',
      source: 'user_created',
      canBeDefault: false,
      createdAt: now,
      updatedAt: now,
      createdBy: 'development_admin',
      package: {
        ...record.package,
        themeKey,
        displayName: `${record.displayName} Kopya`,
        version: '0.1.0',
      },
      audit: [{ eventType: 'theme_duplicated', timestamp: now, summary: `${record.themeKey} kopyalanarak yeni taslak oluşturuldu.` }],
    })
    upsertManagedThemeRecord(duplicate)
    setSelectedId(duplicate.id)
    setActiveTab('general')
    notify('success', 'Tema taslak olarak çoğaltıldı.')
  }

  function activateTheme(record: ManagedThemeRecord) {
    if (record.source === 'system') {
      notify('warning', 'Sistem temaları zaten kullanımda.')
      return
    }
    if (hasUnsafeMotifTemplate(record)) {
      notify('error', 'Motif template alanı JS/HTML/external URL veya keyfi CSS içeremez.', 'Güvenlik bloklandı')
      return
    }
    const validated = validateManagedTheme(record)
    const validation = validated.validation
    const contrastIssues = validation?.contrast.light.concat(validation.contrast.dark) || []
    if (!validation?.valid || validation.activationBlocked) {
      saveRecord(validated, 'Validation sonucu kaydedildi.')
      notify('error', 'Fail veya kritik kontrast hatası olan tema kullanıma açılamaz.', 'Aktivasyon engellendi')
      setActiveTab('importExport')
      return
    }
    const warningCount = validation.warnings.length + contrastIssues.filter(item => item.severity === 'warning').length
    if (warningCount > 0 && !window.confirm(`${warningCount} uyarı var. Yönetici onayıyla kullanıma açılsın mı?`)) {
      return
    }
    const activated = withThemeLifecycle(validated, 'active', 'Theme activated after validation.')
    saveRecord(activated, 'Tema kullanıma açıldı. Tema seçicide görünecek.')
  }

  function deactivateTheme(record: ManagedThemeRecord) {
    if (record.source === 'system') {
      notify('warning', 'Sistem temaları pasife alınamaz.')
      return
    }
    saveRecord(withThemeLifecycle(record, 'inactive', 'Theme deactivated.'), 'Tema pasife alındı.')
  }

  function archiveTheme(record: ManagedThemeRecord) {
    if (record.source === 'system' || record.status === 'active') {
      notify('warning', 'Sistem veya aktif tema arşivlenemez.')
      return
    }
    saveRecord(withThemeLifecycle(record, 'archived', 'Theme archived.'), 'Tema arşivlendi.')
  }

  function removeTheme(record: ManagedThemeRecord) {
    if (record.source === 'system' || record.status === 'active') {
      notify('warning', 'Sistem veya aktif tema silinemez.')
      return
    }
    if (!window.confirm(`${record.displayName} silinsin mi?`)) return
    deleteManagedThemeRecord(record.id)
    setSelectedId(null)
    notify('success', 'Tema silindi.')
  }

  function applyTheme(record: ManagedThemeRecord) {
    if (record.status !== 'active') {
      notify('warning', 'Sadece kullanıma açılmış temalar kullanıcı tercihi olarak uygulanabilir.')
      return
    }
    window.localStorage.setItem(VISUAL_THEME_STORAGE_KEY, record.themeKey)
    window.dispatchEvent(new CustomEvent(VISUAL_THEME_CHANGE_EVENT, { detail: { themeId: record.themeKey } }))
    notify('success', 'Tema bu oturumda uygulandı.')
  }

  return (
    <main className="space-y-5">
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}

      <PageBanner
        mode={listMode ? 'list' : 'form'}
        title="Temalarımız"
        subtitle="Eden ERP sistem temasını, tasarım tokenlarını ve arayüz görünüm kurallarını yönetin."
        icon={<Palette size={24} />}
        onAddClick={listMode ? createBlankDraft : undefined}
        onBackClick={!listMode ? () => setSelectedId(null) : undefined}
        addButtonText="Ekle"
        backButtonText="Listeye Dön"
      />

      {showCreate && (
        <CreateThemePanel
          onCreate={createDraft}
          onCancel={() => setShowCreate(false)}
          onImported={record => {
            upsertManagedThemeRecord(record)
            setSelectedId(record.id)
            setActiveTab('importExport')
            setShowCreate(false)
            notify(record.status === 'preview' ? 'success' : 'error', record.status === 'preview' ? 'Tema preview olarak import edildi.' : 'Tema validation nedeniyle reddedildi.')
          }}
        />
      )}

      {selected ? (
        <ThemeDetailV2
          record={selected}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSave={saveRecord}
          onActivate={activateTheme}
          onArchive={archiveTheme}
          onDuplicate={duplicateTheme}
          notify={notify}
        />
      ) : (
        <ThemeListV2
          records={filteredRecords}
          filter={filter}
          onFilterChange={setFilter}
          onSelect={record => {
            setSelectedId(record.id)
            setActiveTab('general')
          }}
        />
      )}
    </main>
  )
}

interface CreateThemeValues {
  displayName: string
  themeKey: string
  description: string
  artDirection: string
  inspiration: string
  category: string
  baseThemeId: ThemeConceptId
}

function CreateThemePanel({
  onCreate,
  onCancel,
  onImported,
}: {
  onCreate: (values: CreateThemeValues) => void
  onCancel: () => void
  onImported: (record: ManagedThemeRecord) => void
}) {
  const [values, setValues] = useState<CreateThemeValues>({
    displayName: '',
    themeKey: '',
    description: '',
    artDirection: '',
    inspiration: '',
    category: 'custom',
    baseThemeId: 'hikmet',
  })
  const [importText, setImportText] = useState('')

  function importTheme() {
    const { theme, validation } = parseAndValidateThemeJson(importText)
    if (!theme) {
      const fallback = themeConcepts[0]
      onImported(createImportedThemeRecord({
        ...themeConceptToFallbackPackage(fallback.id),
        themeKey: `rejected_${Date.now()}`,
        displayName: 'Reddedilen import',
      }, validation))
      return
    }
    onImported(createImportedThemeRecord(theme, validation))
  }

  return (
    <section className="grid gap-4 rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface)] p-4 shadow-[var(--eden-shadow-card)] lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--eden-text)]">Yeni tema taslağı</h2>
          <p className="mt-1 text-sm text-[var(--eden-text-muted)]">Boş tema veya mevcut sistem temasından kopya ile draft oluşturun.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Tema adı" value={values.displayName} onChange={displayName => setValues({ ...values, displayName })} />
          <TextField label="Internal key" value={values.themeKey} onChange={themeKey => setValues({ ...values, themeKey })} placeholder="atlas_gokkubbe" />
          <TextField label="Sanat yönü" value={values.artDirection} onChange={artDirection => setValues({ ...values, artDirection })} />
          <TextField label="Kategori" value={values.category} onChange={category => setValues({ ...values, category })} />
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-[var(--eden-text-muted)]">Mevcut temadan kopyala</span>
            <select value={values.baseThemeId} onChange={event => setValues({ ...values, baseThemeId: event.target.value as ThemeConceptId })} className="h-10 w-full rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-3 text-sm text-[var(--eden-text)]">
              {themeConcepts.map(theme => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-[var(--eden-text-muted)]">Açıklama</span>
            <textarea value={values.description} onChange={event => setValues({ ...values, description: event.target.value })} rows={3} className="w-full rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-3 py-2 text-sm text-[var(--eden-text)]" />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-[var(--eden-text-muted)]">İlham notu</span>
            <textarea value={values.inspiration} onChange={event => setValues({ ...values, inspiration: event.target.value })} rows={2} className="w-full rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-3 py-2 text-sm text-[var(--eden-text)]" />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onCreate(values)} disabled={!values.displayName.trim() || !values.themeKey.trim()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--eden-accent)] px-4 text-sm font-semibold text-[var(--eden-accent-text)] disabled:opacity-50">
            <Save size={16} /> Taslak Oluştur
          </button>
          <button type="button" onClick={onCancel} className="inline-flex h-10 items-center rounded-lg border border-[var(--eden-border)] px-4 text-sm font-semibold text-[var(--eden-text)]">
            Vazgeç
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--eden-text)]">Import dosyasından oluştur</h2>
          <p className="mt-1 text-sm text-[var(--eden-text-muted)]">JSON validation sonrası otomatik aktif olmaz; preview veya rejected olarak kaydedilir.</p>
        </div>
        <textarea value={importText} onChange={event => setImportText(event.target.value)} rows={12} placeholder={'{ "schemaVersion": "1.0.0", ... }'} className="w-full rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] p-3 font-mono text-xs text-[var(--eden-text)]" />
        <button type="button" onClick={importTheme} disabled={!importText.trim()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--eden-border)] px-4 text-sm font-semibold text-[var(--eden-text)] disabled:opacity-50">
          <Upload size={16} /> Import Et
        </button>
      </div>
    </section>
  )
}

function ThemeDetailV2({
  record,
  activeTab,
  onTabChange,
  onSave,
  onActivate,
  onArchive,
  onDuplicate,
  notify,
}: {
  record: ManagedThemeRecord
  activeTab: ThemeTab
  onTabChange: (tab: ThemeTab) => void
  onSave: (record: ManagedThemeRecord, message?: string) => void
  onActivate: (record: ManagedThemeRecord) => void
  onArchive: (record: ManagedThemeRecord) => void
  onDuplicate: (record: ManagedThemeRecord) => void
  notify: (type: ToastType, message: string, title?: string) => void
}) {
  const [draft, setDraft] = useState(record)
  const locked = draft.source === 'system' || draft.status === 'active'
  const validation = draft.validation || validateEdenThemePackage(draft.package).validation
  const activeColor = draft.package.tokens.light.color.accent.primary

  useEffect(() => setDraft(record), [record])

  function update(next: ManagedThemeRecord) {
    setDraft(validateManagedTheme({ ...next, updatedAt: new Date().toISOString() }))
  }

  function saveLifecycle(status: ManagedThemeStatus, summary: string, message: string) {
    const next = withThemeLifecycle(draft, status, summary)
    setDraft(next)
    onSave(next, message)
  }

  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface)] p-4 shadow-[var(--eden-shadow-card)]">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 opacity-25" style={{ background: `radial-gradient(circle at top right, ${activeColor}, transparent 66%)` }} />
        <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={draft.status} />
              <span className="rounded-full bg-[var(--eden-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--eden-text-muted)]">scope: system</span>
              <span className="rounded-full bg-[var(--eden-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--eden-text-muted)]">{draft.status === 'active' ? 'Aktif sistem teması' : 'Aktif değil'}</span>
            </div>
            <h2 className="truncate text-2xl font-semibold text-[var(--eden-text)]">{draft.displayName}</h2>
            <p className="mt-1 max-w-3xl text-sm text-[var(--eden-text-muted)]">{draft.description || 'Tema açıklaması girilmedi.'}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <Metric label="Slug" value={draft.themeKey} />
              <Metric label="Versiyon" value={draft.version} />
              <Metric label="Son güncelleme" value={formatDate(draft.updatedAt)} />
              <Metric label="Validation" value={validation.valid ? 'Geçerli' : 'Uyarı var'} />
            </div>
          </div>
          <div className="rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface-raised)] p-3">
            <div className="mb-3 flex gap-2">
              {[draft.package.tokens.light.color.accent.primary, draft.package.tokens.light.color.accent.secondary, draft.package.tokens.light.color.background, draft.package.tokens.light.color.surface, draft.package.tokens.light.color.border].map(color => (
                <span key={color} className="h-8 flex-1 rounded-lg border border-[var(--eden-border)]" style={{ backgroundColor: color }} />
              ))}
            </div>
            <div className="h-24 rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface)] p-3" style={{ background: previewBannerBackground(draft, 'light') }}>
              <div className="h-4 w-28 rounded-full bg-white/60" />
              <div className="mt-3 h-8 rounded-lg bg-white/40" />
            </div>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2">
          {!locked && <button type="button" onClick={() => onSave(draft)} className={DETAIL_PRIMARY_ACTION_CLASS}><Save size={15} /> Kaydet</button>}
          <button type="button" onClick={() => exportRecord(draft, 'eden')} className={DETAIL_ACTION_CLASS}><Download size={15} /> JSON Export</button>
          <button type="button" onClick={() => onTabChange('importExport')} className={DETAIL_ACTION_CLASS}><Upload size={15} /> JSON Import</button>
          <button type="button" onClick={() => exportRecord(draft, 'figma')} className={DETAIL_ACTION_CLASS}><Download size={15} /> Figma Token Export</button>
          <button type="button" onClick={() => onDuplicate(draft)} className={DETAIL_ACTION_CLASS}><Palette size={15} /> Çoğalt</button>
        </div>
      </div>

      <LifecyclePanel
        record={draft}
        locked={draft.source === 'system'}
        onReview={() => saveLifecycle('preview', 'Theme sent to review.', 'Tema incelemeye gönderildi.')}
        onApprove={() => saveLifecycle('inactive', 'Theme approved for activation.', 'Tema onaylandı.')}
        onActivate={() => onActivate(draft)}
        onArchive={() => onArchive(draft)}
      />

      <div className="overflow-x-auto rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface)] p-2">
        <div className="flex min-w-max gap-1">
          {TABS.map(tab => (
            <button key={tab.id} type="button" onClick={() => onTabChange(tab.id)} className={cn('h-9 rounded-lg px-3 text-xs font-semibold transition', activeTab === tab.id ? 'bg-[var(--eden-accent)] text-[var(--eden-accent-text)]' : 'text-[var(--eden-text-muted)] hover:bg-[var(--eden-surface-muted)] hover:text-[var(--eden-text)]')}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface)] p-4 shadow-[var(--eden-shadow-card)]">
        {activeTab === 'general' && <GeneralTab record={draft} locked={locked} onChange={update} />}
        {activeTab === 'surface' && <SurfaceTab record={draft} locked={locked} onChange={update} />}
        {activeTab === 'colors' && <ColorsTab record={draft} locked={locked} onChange={update} />}
        {activeTab === 'background' && <BackgroundPatternTab record={draft} locked={locked} onChange={update} />}
        {activeTab === 'illustrations' && <IllustrationsTab record={draft} locked={locked} onChange={update} />}
        {activeTab === 'typography' && <TypographyTab record={draft} locked={locked} onChange={update} />}
        {activeTab === 'components' && <ComponentTokenEditor record={draft} locked={locked} onChange={update} />}
        {activeTab === 'states' && <StatesTab record={draft} locked={locked} onChange={update} />}
        {activeTab === 'metrics' && <MetricsTab record={draft} locked={locked} onChange={update} />}
        {activeTab === 'preview' && <ThemePreview record={draft} />}
        {activeTab === 'importExport' && <ImportExportTab record={draft} locked={locked} onChange={update} notify={notify} />}
      </div>
    </section>
  )
}

function LifecyclePanel({ record, locked, onReview, onApprove, onActivate, onArchive }: { record: ManagedThemeRecord; locked: boolean; onReview: () => void; onApprove: () => void; onActivate: () => void; onArchive: () => void }) {
  return (
    <section className="rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--eden-text)]">Aktivasyon lifecycle</h3>
          <p className="mt-1 text-sm text-[var(--eden-text-muted)]">Aktif tema yapma işlemi liste aksiyonu değil; inceleme, onay ve aktivasyon geçişleriyle yönetilir.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={locked || record.status !== 'draft'} onClick={onReview} className={DETAIL_ACTION_CLASS}>İncelemeye Gönder</button>
          <button type="button" disabled={locked || record.status !== 'preview'} onClick={onApprove} className={DETAIL_ACTION_CLASS}>Onayla</button>
          <button type="button" disabled={locked || !['inactive', 'preview'].includes(record.status)} onClick={onActivate} className={DETAIL_ACTION_CLASS}>Aktifleştir</button>
          <button type="button" disabled={locked || record.status === 'active' || record.status === 'archived'} onClick={onArchive} className={DETAIL_ACTION_CLASS}>Arşivle</button>
        </div>
      </div>
    </section>
  )
}

function ThemeListV2({
  records,
  filter,
  onFilterChange,
  onSelect,
}: {
  records: ManagedThemeRecord[]
  filter: ThemeFilter
  onFilterChange: (filter: ThemeFilter) => void
  onSelect: (record: ManagedThemeRecord) => void
}) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<'updatedAt' | 'displayName' | 'status'>('updatedAt')
  const visibleRecords = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR')
    return records
      .filter(record => {
        if (!needle) return true
        return [record.displayName, record.themeKey, record.status, record.version]
          .join(' ')
          .toLocaleLowerCase('tr-TR')
          .includes(needle)
      })
      .sort((a, b) => {
        if (sortKey === 'displayName') return a.displayName.localeCompare(b.displayName, 'tr')
        if (sortKey === 'status') return STATUS_LABELS[a.status].localeCompare(STATUS_LABELS[b.status], 'tr')
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
  }, [query, records, sortKey])

  return (
    <section className="theme-list-surface relative overflow-hidden rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface)] shadow-[var(--eden-shadow-card)]">
      <div className="pointer-events-none absolute right-0 top-0 h-24 w-64 opacity-20" style={{ background: 'radial-gradient(circle at top right, var(--eden-accent-soft), transparent 68%)' }} />
      <div className="relative flex flex-col gap-3 border-b border-[var(--eden-border)] bg-[var(--eden-surface-muted)]/70 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.slice(0, 6).map(item => (
            <button key={item.id} type="button" onClick={() => onFilterChange(item.id)} className={cn('h-8 rounded-lg px-3 text-xs font-semibold transition', filter === item.id ? 'bg-[var(--eden-accent)] text-[var(--eden-accent-text)]' : 'bg-[var(--eden-surface)] text-[var(--eden-text-muted)] hover:text-[var(--eden-text)]')}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Tema ara..."
            className="h-9 min-w-[220px] rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-3 text-sm text-[var(--eden-text)] outline-none focus:border-[var(--eden-input-focus)]"
          />
          <select value={sortKey} onChange={event => setSortKey(event.target.value as typeof sortKey)} className="h-9 rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-3 text-sm text-[var(--eden-text)]">
            <option value="updatedAt">Son güncelleme</option>
            <option value="displayName">Tema adı</option>
            <option value="status">Durum</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[860px] grid-cols-[1.35fr_1fr_0.75fr_0.65fr_0.7fr_1fr] border-b border-[var(--eden-border)] bg-[var(--eden-table-header-bg)] px-4 py-3 text-xs font-semibold text-[var(--eden-text-muted)]">
          <span>Tema adı</span>
          <span>Tema kodu / slug</span>
          <span>Durum</span>
          <span>Versiyon</span>
          <span>Aktif tema mı?</span>
          <span>Son güncelleme tarihi</span>
        </div>
        {visibleRecords.map(record => (
          <button
            key={record.id}
            type="button"
            onClick={() => onSelect(record)}
            className="grid min-w-[860px] grid-cols-[1.35fr_1fr_0.75fr_0.65fr_0.7fr_1fr] items-center border-b border-[var(--eden-border)] px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-[var(--eden-table-row-hover)]"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="h-9 w-9 shrink-0 rounded-lg border border-[var(--eden-border)] shadow-sm" style={{ background: `linear-gradient(135deg, ${record.package.tokens.light.color.accent.primary}, ${record.package.tokens.light.color.accent.secondary})` }} />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-[var(--eden-text)]">{record.displayName}</span>
                <span className="block truncate text-xs text-[var(--eden-text-muted)]">Sistem teması</span>
              </span>
            </span>
            <code className="truncate text-xs text-[var(--eden-text-muted)]">{record.themeKey}</code>
            <StatusBadge status={record.status} />
            <span className="text-xs font-semibold text-[var(--eden-text-muted)]">{record.version}</span>
            <span className={cn('text-xs font-semibold', record.status === 'active' ? 'text-emerald-600' : 'text-[var(--eden-text-muted)]')}>{record.status === 'active' ? 'Evet' : 'Hayır'}</span>
            <span className="text-xs text-[var(--eden-text-muted)]">{formatDate(record.updatedAt)}</span>
          </button>
        ))}
        {visibleRecords.length === 0 && (
          <div className="flex min-h-[220px] items-center justify-center p-8 text-center">
            <div>
              <div className="mx-auto mb-3 h-16 w-16 rounded-2xl border border-dashed border-[var(--eden-border)] bg-[var(--eden-surface-muted)]" />
              <p className="font-semibold text-[var(--eden-text)]">Tema kaydı bulunamadı</p>
              <p className="mt-1 text-sm text-[var(--eden-text-muted)]">Arama veya filtreyi değiştirerek tekrar deneyin.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function ThemeList({
  records,
  filter,
  onFilterChange,
  onSelect,
  onExport,
  onActivate,
  onArchive,
  onDelete,
  onApply,
}: {
  records: ManagedThemeRecord[]
  filter: ThemeFilter
  onFilterChange: (filter: ThemeFilter) => void
  onSelect: (record: ManagedThemeRecord) => void
  onExport: (record: ManagedThemeRecord, format: ExportFormat) => void
  onActivate: (record: ManagedThemeRecord) => void
  onArchive: (record: ManagedThemeRecord) => void
  onDelete: (record: ManagedThemeRecord) => void
  onApply: (record: ManagedThemeRecord) => void
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface)] p-3">
        {FILTERS.map(item => (
          <button key={item.id} type="button" onClick={() => onFilterChange(item.id)} className={cn('h-8 rounded-lg px-3 text-xs font-semibold transition', filter === item.id ? 'bg-[var(--eden-accent)] text-[var(--eden-accent-text)]' : 'bg-[var(--eden-surface-muted)] text-[var(--eden-text-muted)] hover:text-[var(--eden-text)]')}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface)]">
        <div className="grid min-w-[1180px] grid-cols-[1.35fr_1fr_0.75fr_0.75fr_1fr_0.9fr_0.8fr_1.4fr] border-b border-[var(--eden-border)] bg-[var(--eden-table-header-bg)] px-4 py-3 text-xs font-semibold text-[var(--eden-text-muted)]">
          <span>Tema adı</span>
          <span>Internal key</span>
          <span>Durum</span>
          <span>Light/Dark</span>
          <span>Sanat yönü</span>
          <span>Source</span>
          <span>Kullanıma açık mı?</span>
          <span>İşlemler</span>
        </div>
        <div className="overflow-x-auto">
          {records.map(record => {
            const validation = record.validation || validateEdenThemePackage(record.package).validation
            const contrastWarnings = validation.contrast.light.concat(validation.contrast.dark).length
            return (
              <div key={record.id} className="grid min-w-[1180px] grid-cols-[1.35fr_1fr_0.75fr_0.75fr_1fr_0.9fr_0.8fr_1.4fr] items-center border-b border-[var(--eden-border)] px-4 py-3 text-sm last:border-b-0 hover:bg-[var(--eden-table-row-hover)]">
                <button type="button" onClick={() => onSelect(record)} className="flex min-w-0 items-center gap-3 text-left">
                  <span className="h-8 w-8 shrink-0 rounded-lg border border-[var(--eden-border)]" style={{ backgroundColor: record.package.tokens.light.color.accent.primary }} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-[var(--eden-text)]">{record.displayName}</span>
                    <span className="block truncate text-xs text-[var(--eden-text-muted)]">{record.description || 'Tema açıklaması girilmedi'}</span>
                  </span>
                </button>
                <code className="truncate text-xs text-[var(--eden-text-muted)]">{record.themeKey}</code>
                <StatusBadge status={record.status} />
                <span className="text-xs font-semibold text-[var(--eden-text-muted)]">{record.supportsLight ? 'Light' : '-'} / {record.supportsDark ? 'Dark' : '-'}</span>
                <span className="truncate text-xs text-[var(--eden-text-muted)]">{record.artDirection || '-'}</span>
                <span className="text-xs text-[var(--eden-text-muted)]">{SOURCE_LABELS[record.source] || record.source}</span>
                <span className="text-xs font-semibold">{record.status === 'active' ? 'Evet' : 'Hayır'}</span>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => onSelect(record)} className={LIST_ACTION_CLASS}><Eye size={13} /> Detay</button>
                  <button type="button" onClick={() => onExport(record, 'eden')} className={LIST_ACTION_CLASS}><Download size={13} /> Export</button>
                  {record.status !== 'active' && record.status !== 'archived' && <button type="button" onClick={() => onActivate(record)} className={LIST_ACTION_CLASS}><CheckCircle2 size={13} /> Aç</button>}
                  {record.status === 'active' && <button type="button" onClick={() => onApply(record)} className={LIST_ACTION_CLASS}><Palette size={13} /> Uygula</button>}
                  {record.source !== 'system' && record.status !== 'active' && <button type="button" onClick={() => onArchive(record)} className={LIST_ACTION_CLASS}><Archive size={13} /> Arşivle</button>}
                  {record.source !== 'system' && ['draft', 'preview', 'rejected'].includes(record.status) && <button type="button" onClick={() => onDelete(record)} className={LIST_DANGER_ACTION_CLASS}><XCircle size={13} /> Sil</button>}
                  {(validation.errors.length > 0 || contrastWarnings > 0) && <span className="inline-flex h-7 items-center rounded-lg bg-amber-50 px-2 text-[11px] font-semibold text-amber-800">Uyarı</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ThemeDetail({
  record,
  activeTab,
  onTabChange,
  onSave,
  onActivate,
  onDeactivate,
  onArchive,
  onDelete,
  onApply,
  notify,
}: {
  record: ManagedThemeRecord
  activeTab: string
  onTabChange: (tab: ThemeTab) => void
  onSave: (record: ManagedThemeRecord, message?: string) => void
  onActivate: (record: ManagedThemeRecord) => void
  onDeactivate: (record: ManagedThemeRecord) => void
  onArchive: (record: ManagedThemeRecord) => void
  onDelete: (record: ManagedThemeRecord) => void
  onApply: (record: ManagedThemeRecord) => void
  notify: (type: ToastType, message: string, title?: string) => void
}) {
  const [draft, setDraft] = useState(record)
  const locked = draft.source === 'system'

  useEffect(() => setDraft(record), [record])

  function update(next: ManagedThemeRecord) {
    setDraft(validateManagedTheme({ ...next, updatedAt: new Date().toISOString() }))
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface)] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold text-[var(--eden-text)]">{draft.displayName}</h2>
              <StatusBadge status={draft.status} />
              <span className="rounded-full bg-[var(--eden-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--eden-text-muted)]">{draft.themeKey}</span>
              <span className="rounded-full bg-[var(--eden-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--eden-text-muted)]">{draft.source}</span>
            </div>
            <p className="mt-1 text-sm text-[var(--eden-text-muted)]">{draft.description || 'Açıklama girilmedi.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!locked && <button type="button" onClick={() => onSave(draft)} className={DETAIL_PRIMARY_ACTION_CLASS}><Save size={15} /> Kaydet</button>}
            <button type="button" onClick={() => onTabChange('preview')} className={DETAIL_ACTION_CLASS}><Eye size={15} /> Önizle</button>
            {draft.status !== 'active' && draft.status !== 'archived' && <button type="button" onClick={() => onActivate(draft)} className={DETAIL_ACTION_CLASS}><CheckCircle2 size={15} /> Kullanıma Aç</button>}
            {draft.status === 'active' && <button type="button" onClick={() => onApply(draft)} className={DETAIL_ACTION_CLASS}><Palette size={15} /> Tema Olarak Seç</button>}
            {draft.status === 'active' && !locked && <button type="button" onClick={() => onDeactivate(draft)} className={DETAIL_ACTION_CLASS}>Pasife Al</button>}
            {!locked && draft.status !== 'active' && <button type="button" onClick={() => onArchive(draft)} className={DETAIL_ACTION_CLASS}><Archive size={15} /> Arşivle</button>}
            {!locked && ['draft', 'preview', 'rejected'].includes(draft.status) && <button type="button" onClick={() => onDelete(draft)} className={DETAIL_DANGER_ACTION_CLASS}><XCircle size={15} /> Sil</button>}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface)] p-2">
        <div className="flex min-w-max gap-1">
          {TABS.map(tab => (
            <button key={tab.id} type="button" onClick={() => onTabChange(tab.id)} className={cn('h-9 rounded-lg px-3 text-xs font-semibold transition', activeTab === tab.id ? 'bg-[var(--eden-accent)] text-[var(--eden-accent-text)]' : 'text-[var(--eden-text-muted)] hover:bg-[var(--eden-surface-muted)] hover:text-[var(--eden-text)]')}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface)] p-4 shadow-[var(--eden-shadow-card)]">
        {activeTab === 'general' && <GeneralTab record={draft} locked={locked} onChange={update} />}
        {activeTab === 'light' && <ModeTokenEditor mode="light" record={draft} locked={locked} onChange={update} />}
        {activeTab === 'dark' && <ModeTokenEditor mode="dark" record={draft} locked={locked} onChange={update} />}
        {activeTab === 'components' && <ComponentTokenEditor record={draft} locked={locked} onChange={update} />}
        {activeTab === 'motif' && <MotifEditor record={draft} locked={locked} onChange={update} />}
        {activeTab === 'preview' && <ThemePreview record={draft} />}
        {activeTab === 'validation' && <ValidationTab record={draft} />}
        {activeTab === 'importExport' && <ImportExportTab record={draft} locked={locked} onChange={update} notify={notify} />}
        {activeTab === 'usage' && <UsageTab record={draft} />}
        {activeTab === 'audit' && <AuditTab record={draft} />}
      </div>
    </section>
  )
}

function GeneralTab({ record, locked, onChange }: { record: ManagedThemeRecord; locked: boolean; onChange: (record: ManagedThemeRecord) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TextField disabled={locked} label="Tema adı" value={record.displayName} onChange={displayName => onChange({ ...record, displayName })} />
      <TextField disabled label="Internal key" value={record.themeKey} onChange={() => undefined} />
      <TextField disabled={locked} label="Sanat yönü" value={record.artDirection} onChange={artDirection => onChange({ ...record, artDirection })} />
      <TextField disabled={locked} label="Kategori" value={record.category} onChange={category => onChange({ ...record, category })} />
      <TextField disabled={locked} label="Versiyon" value={record.version} onChange={version => onChange({ ...record, version })} />
      <TextField disabled={locked} label="Author" value={record.author} onChange={author => onChange({ ...record, author })} />
      <label className="lg:col-span-2">
        <span className="mb-1 block text-xs font-semibold text-[var(--eden-text-muted)]">Açıklama</span>
        <textarea disabled={locked} value={record.description} onChange={event => onChange({ ...record, description: event.target.value })} rows={3} className="w-full rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-3 py-2 text-sm text-[var(--eden-text)] disabled:opacity-60" />
      </label>
      <label className="lg:col-span-2">
        <span className="mb-1 block text-xs font-semibold text-[var(--eden-text-muted)]">İlham notu</span>
        <textarea disabled={locked} value={record.inspiration} onChange={event => onChange({ ...record, inspiration: event.target.value })} rows={2} className="w-full rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-3 py-2 text-sm text-[var(--eden-text)] disabled:opacity-60" />
      </label>
      <ToggleRow label="Light destekleniyor" checked={record.supportsLight} disabled={locked} onChange={supportsLight => onChange({ ...record, supportsLight })} />
      <ToggleRow label="Dark destekleniyor" checked={record.supportsDark} disabled={locked} onChange={supportsDark => onChange({ ...record, supportsDark })} />
      <ToggleRow label="Varsayılan tema olabilir" checked={record.canBeDefault} disabled={locked} onChange={canBeDefault => onChange({ ...record, canBeDefault })} />
      <div>
        <span className="mb-1 block text-xs font-semibold text-[var(--eden-text-muted)]">Durum</span>
        <div className="flex h-10 items-center"><StatusBadge status={record.status} /></div>
      </div>
    </div>
  )
}

function SurfaceTab({ record, locked, onChange }: { record: ManagedThemeRecord; locked: boolean; onChange: (record: ManagedThemeRecord) => void }) {
  const fields = [
    ['Sayfa arka planı', 'surface.pageBackground'],
    ['Ana içerik arka planı', 'surface.mainBackground'],
    ['Kart arka planı', 'surface.cardBackground'],
    ['Sidebar arka planı', 'surface.sidebarBackground'],
    ['Topbar arka planı', 'surface.topbarBackground'],
    ['Login ekranı arka planı', 'surface.loginBackground'],
    ['Dashboard yüzeyi', 'surface.dashboardSurface'],
    ['Form yüzeyi', 'surface.formSurface'],
    ['Liste yüzeyi', 'surface.listSurface'],
    ['Modal yüzeyi', 'surface.modalSurface'],
    ['Drawer yüzeyi', 'surface.drawerSurface'],
  ] as const
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(([label, path]) => (
          <ManagedMetadataField key={path} record={record} locked={locked} label={label} path={path} fallback={defaultSurfaceValue(record, path)} onChange={onChange} />
        ))}
      </div>
      <div className="rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface-muted)] p-4">
        <PreviewMiniShell record={record} />
      </div>
    </div>
  )
}

function ColorsTab({ record, locked, onChange }: { record: ManagedThemeRecord; locked: boolean; onChange: (record: ManagedThemeRecord) => void }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface-muted)] p-4">
        <h3 className="text-sm font-semibold text-[var(--eden-text)]">Light renk tokenları</h3>
        <div className="mt-3">
          <ModeTokenEditor mode="light" record={record} locked={locked} onChange={onChange} />
        </div>
      </div>
      <div className="rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface-muted)] p-4">
        <h3 className="text-sm font-semibold text-[var(--eden-text)]">Dark renk tokenları</h3>
        <div className="mt-3">
          <ModeTokenEditor mode="dark" record={record} locked={locked} onChange={onChange} />
        </div>
      </div>
    </div>
  )
}

function BackgroundPatternTab({ record, locked, onChange }: { record: ManagedThemeRecord; locked: boolean; onChange: (record: ManagedThemeRecord) => void }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="grid gap-3 sm:grid-cols-2">
        <ManagedMetadataSelect record={record} locked={locked} label="Background type" path="background.type" options={['solid', 'gradient', 'svg-pattern', 'image', 'mixed']} fallback="gradient" onChange={onChange} />
        <ManagedMetadataField record={record} locked={locked} label="Gradient yönü" path="background.gradientDirection" fallback="135deg" onChange={onChange} />
        <ManagedMetadataField record={record} locked={locked} label="Gradient başlangıç rengi" path="background.gradientFrom" fallback={record.package.tokens.light.color.background} onChange={onChange} />
        <ManagedMetadataField record={record} locked={locked} label="Gradient bitiş rengi" path="background.gradientTo" fallback={record.package.tokens.light.color.surfaceMuted} onChange={onChange} />
        <ManagedMetadataSelect record={record} locked={locked} label="Pattern tipi" path="background.patternType" options={['finance', 'bank', 'abstract', 'grid', 'dots', 'custom']} fallback="grid" onChange={onChange} />
        <ManagedMetadataField record={record} locked={locked} label="Pattern rengi" path="background.patternColor" fallback={record.package.tokens.light.color.accent.primary} onChange={onChange} />
        <ManagedMetadataField record={record} locked={locked} label="Pattern opacity" path="background.patternOpacity" fallback="0.12" onChange={onChange} />
        <ManagedMetadataField record={record} locked={locked} label="Pattern size" path="background.patternSize" fallback="32px" onChange={onChange} />
        <ManagedMetadataField record={record} locked={locked} label="Pattern spacing" path="background.patternSpacing" fallback="24px" onChange={onChange} />
        <ManagedMetadataField record={record} locked={locked} label="Pattern rotation" path="background.patternRotation" fallback="0deg" onChange={onChange} />
        <ManagedMetadataField record={record} locked={locked} label="Overlay rengi" path="background.overlayColor" fallback={record.package.tokens.light.color.surface} onChange={onChange} />
        <ManagedMetadataField record={record} locked={locked} label="Overlay opacity" path="background.overlayOpacity" fallback="0.24" onChange={onChange} />
      </div>
      <div className="min-h-[280px] rounded-xl border border-[var(--eden-border)] p-5" style={{ background: previewPatternBackground(record) }}>
        <div className="rounded-xl border border-white/20 bg-white/25 p-4 text-sm font-semibold text-[var(--eden-text)] backdrop-blur">
          Background / pattern preview
        </div>
      </div>
    </div>
  )
}

function IllustrationsTab({ record, locked, onChange }: { record: ManagedThemeRecord; locked: boolean; onChange: (record: ManagedThemeRecord) => void }) {
  const groups = [
    ['Page Banner Görselleri', 'illustrations.pageBanner', ['light banner illustration', 'dark banner illustration', 'banner fallback image']],
    ['Liste Alanı Görselleri', 'illustrations.listArea', ['list header decoration', 'list panel subtle illustration', 'list watermark', 'list empty-state illustration']],
    ['Form / Detail Alanı Görselleri', 'illustrations.formArea', ['form hero illustration', 'detail panel side image', 'form decorative corner art', 'logo placeholder artwork']],
    ['Wizard Görselleri', 'illustrations.wizardArea', ['wizard background illustration', 'wizard side illustration', 'wizard completion illustration']],
    ['Login / Welcome / Dashboard Hero Görselleri', 'illustrations.loginDashboardArea', ['login hero image', 'welcome card image', 'dashboard hero illustration']],
  ] as const
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface-muted)] p-4 text-sm text-[var(--eden-text-muted)]">
        Görseller binary/base64 olarak JSON içine gömülmez; asset reference mantığıyla yönetilir. Hero alanındaki resim slotları light/dark varyantlarını ayrı tutar.
      </div>
      <section className="rounded-xl border border-[var(--eden-border)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--eden-text)]">Page Banner görsel sistemi</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <ManagedMetadataSelect record={record} locked={locked} label="banner background type" path="banner.backgroundType" options={['solid', 'gradient', 'pattern', 'illustration', 'illustration + overlay']} fallback="gradient" onChange={onChange} />
          <ManagedMetadataField record={record} locked={locked} label="banner overlay" path="banner.overlayColor" fallback={record.package.tokens.light.color.accent.secondary} onChange={onChange} />
          <ManagedMetadataField record={record} locked={locked} label="image opacity" path="banner.imageOpacity" fallback="0.28" onChange={onChange} />
          <ManagedMetadataSelect record={record} locked={locked} label="image positioning" path="banner.imagePositioning" options={['top-right', 'center', 'bottom-right', 'full-bleed']} fallback="top-right" onChange={onChange} />
          <ManagedMetadataSelect record={record} locked={locked} label="image sizing" path="banner.imageSizing" options={['cover', 'contain', 'auto']} fallback="cover" onChange={onChange} />
          <ManagedMetadataSelect record={record} locked={locked} label="crop behavior" path="banner.cropBehavior" options={['safe-center', 'focal-point', 'edge-fade']} fallback="safe-center" onChange={onChange} />
          <ManagedMetadataSelect record={record} locked={locked} label="corner decoration" path="banner.cornerDecoration" options={['none', 'frame', 'motif', 'watermark']} fallback="motif" onChange={onChange} />
          <ManagedMetadataSelect record={record} locked={locked} label="frame style" path="banner.frameStyle" options={['none', 'subtle', 'accent', 'ornamental']} fallback="subtle" onChange={onChange} />
        </div>
      </section>
      {groups.map(([title, path, assets]) => (
        <section key={path} className="rounded-xl border border-[var(--eden-border)] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--eden-text)]">{title}</h3>
          <div className="grid gap-3 lg:grid-cols-3">
            {assets.map((asset, index) => (
              <div key={asset} className="rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface-muted)] p-3">
                <p className="mb-2 text-xs font-semibold text-[var(--eden-text)]">{asset}</p>
                <ManagedMetadataField record={record} locked={locked} label="assetId" path={`${path}.${index}.assetId`} fallback={`${record.themeKey}_${index}`} onChange={onChange} />
                <ManagedMetadataField record={record} locked={locked} label="assetName" path={`${path}.${index}.assetName`} fallback={asset} onChange={onChange} />
                <ManagedMetadataSelect record={record} locked={locked} label="sourceType" path={`${path}.${index}.sourceType`} options={['upload', 'internal-library', 'url-reference']} fallback="internal-library" onChange={onChange} />
                <ManagedMetadataField record={record} locked={locked} label="lightVariant" path={`${path}.${index}.lightVariant`} fallback="/theme-assets/light-placeholder.svg" onChange={onChange} />
                <ManagedMetadataField record={record} locked={locked} label="darkVariant" path={`${path}.${index}.darkVariant`} fallback="/theme-assets/dark-placeholder.svg" onChange={onChange} />
                <ManagedMetadataSelect record={record} locked={locked} label="fit" path={`${path}.${index}.fit`} options={['cover', 'contain', 'fill']} fallback="cover" onChange={onChange} />
                <ManagedMetadataField record={record} locked={locked} label="opacity" path={`${path}.${index}.opacity`} fallback="0.18" onChange={onChange} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function TypographyTab({ record, locked, onChange }: { record: ManagedThemeRecord; locked: boolean; onChange: (record: ManagedThemeRecord) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {(['light', 'dark'] as const).map(mode => (
        <section key={mode} className="rounded-xl border border-[var(--eden-border)] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--eden-text)]">{mode === 'light' ? 'Light' : 'Dark'} typography</h3>
          <TextField disabled={locked} label="Ana font ailesi" value={record.package.tokens[mode].typography.fontFamily} onChange={fontFamily => onChange({ ...record, package: { ...record.package, tokens: { ...record.package.tokens, [mode]: { ...record.package.tokens[mode], typography: { ...record.package.tokens[mode].typography, fontFamily } } } } })} />
          <TextField disabled={locked} label="Heading weight" value={String(record.package.tokens[mode].typography.headingWeight)} onChange={headingWeight => onChange({ ...record, package: { ...record.package, tokens: { ...record.package.tokens, [mode]: { ...record.package.tokens[mode], typography: { ...record.package.tokens[mode].typography, headingWeight } } } } })} />
          <TextField disabled={locked} label="Body weight" value={String(record.package.tokens[mode].typography.bodyWeight)} onChange={bodyWeight => onChange({ ...record, package: { ...record.package, tokens: { ...record.package.tokens, [mode]: { ...record.package.tokens[mode], typography: { ...record.package.tokens[mode].typography, bodyWeight } } } } })} />
        </section>
      ))}
      <ManagedMetadataField record={record} locked={locked} label="Başlık font ailesi" path="typography.headingFontFamily" fallback="system-ui" onChange={onChange} />
      <ManagedMetadataField record={record} locked={locked} label="Monospace font ailesi" path="typography.monoFontFamily" fallback="ui-monospace" onChange={onChange} />
      <ManagedMetadataField record={record} locked={locked} label="Base font size" path="typography.baseFontSize" fallback="14px" onChange={onChange} />
      <ManagedMetadataField record={record} locked={locked} label="Line height" path="typography.lineHeight" fallback="1.5" onChange={onChange} />
    </div>
  )
}

function StatesTab({ record, locked, onChange }: { record: ManagedThemeRecord; locked: boolean; onChange: (record: ManagedThemeRecord) => void }) {
  const fields = ['hover background', 'active background', 'selected background', 'selected border', 'disabled opacity', 'focus ring', 'focus ring offset', 'error state', 'warning state', 'success state', 'loading state', 'skeleton state']
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map(field => (
        <ManagedMetadataField key={field} record={record} locked={locked} label={field} path={`states.${field.replaceAll(' ', '_')}`} fallback={field.includes('opacity') ? '0.55' : record.package.tokens.light.color.surfaceMuted} onChange={onChange} />
      ))}
    </div>
  )
}

function MetricsTab({ record, locked, onChange }: { record: ManagedThemeRecord; locked: boolean; onChange: (record: ManagedThemeRecord) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-xl border border-[var(--eden-border)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--eden-text)]">Spacing</h3>
        {['page padding', 'section gap', 'card padding', 'field gap', 'table row height', 'sidebar width', 'topbar height'].map(field => (
          <ManagedMetadataField key={field} record={record} locked={locked} label={field} path={`metrics.${field.replaceAll(' ', '_')}`} fallback="16px" onChange={onChange} />
        ))}
      </section>
      <section className="rounded-xl border border-[var(--eden-border)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--eden-text)]">Radius</h3>
        {Object.entries(record.package.tokens.light.radius).map(([key, value]) => (
          <TextField key={key} disabled={locked} label={key} value={String(value)} onChange={next => onChange({ ...record, package: { ...record.package, tokens: { ...record.package.tokens, light: { ...record.package.tokens.light, radius: { ...record.package.tokens.light.radius, [key]: next } } } } })} />
        ))}
      </section>
      <section className="rounded-xl border border-[var(--eden-border)] p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--eden-text)]">Shadow</h3>
        {Object.entries(record.package.tokens.light.shadow).map(([key, value]) => (
          <TextField key={key} disabled={locked} label={key} value={String(value)} onChange={next => onChange({ ...record, package: { ...record.package, tokens: { ...record.package.tokens, light: { ...record.package.tokens.light, shadow: { ...record.package.tokens.light.shadow, [key]: next } } } } })} />
        ))}
      </section>
    </div>
  )
}

function ManagedMetadataField({ record, locked, label, path, fallback, onChange }: { record: ManagedThemeRecord; locked: boolean; label: string; path: string; fallback: string; onChange: (record: ManagedThemeRecord) => void }) {
  const value = String(getNestedValue(getThemeManagementMetadata(record), path) ?? fallback)
  return <TextField disabled={locked} label={label} value={value} onChange={next => onChange(setThemeManagementMetadata(record, path, next))} />
}

function ManagedMetadataSelect({ record, locked, label, path, options, fallback, onChange }: { record: ManagedThemeRecord; locked: boolean; label: string; path: string; options: readonly string[]; fallback: string; onChange: (record: ManagedThemeRecord) => void }) {
  const value = String(getNestedValue(getThemeManagementMetadata(record), path) ?? fallback)
  return (
    <label>
      <span className="mb-1 block text-xs font-semibold text-[var(--eden-text-muted)]">{label}</span>
      <select disabled={locked} value={value} onChange={event => onChange(setThemeManagementMetadata(record, path, event.target.value))} className="h-10 w-full rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-3 text-sm text-[var(--eden-text)] disabled:opacity-60">
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function PreviewMiniShell({ record }: { record: ManagedThemeRecord }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--eden-border)] bg-[var(--eden-bg)]">
      <div className="flex h-10 items-center gap-2 border-b border-[var(--eden-border)] bg-[var(--eden-header-bg)] px-3">
        <span className="h-5 w-5 rounded bg-[var(--eden-accent-soft)]" />
        <span className="h-2 w-24 rounded bg-[var(--eden-border)]" />
      </div>
      <div className="grid grid-cols-[110px_1fr]">
        <div className="min-h-[210px] bg-[var(--eden-nav-bg)] p-3">
          <span className="mb-3 block h-3 rounded bg-white/30" />
          <span className="mb-2 block h-7 rounded bg-white/20" />
          <span className="block h-7 rounded bg-white/10" />
        </div>
        <div className="space-y-3 p-3">
          <div className="rounded-lg p-4 text-white" style={{ background: previewBannerBackground(record, 'light') }}>
            <span className="block h-4 w-32 rounded bg-white/50" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-16 rounded-lg border border-[var(--eden-card-border)] bg-[var(--eden-card-bg)]" />
            <div className="h-16 rounded-lg border border-[var(--eden-card-border)] bg-[var(--eden-card-bg)]" />
          </div>
          <div className="h-20 rounded-lg border border-[var(--eden-border)] bg-[var(--eden-table-header-bg)]" />
        </div>
      </div>
    </div>
  )
}

function ModeTokenEditor({ mode, record, locked, onChange }: { mode: ThemeAppearance; record: ManagedThemeRecord; locked: boolean; onChange: (record: ManagedThemeRecord) => void }) {
  const tokens = record.package.tokens[mode]

  function update(path: string, value: string | number) {
    onChange({
      ...record,
      package: {
        ...record.package,
        tokens: {
          ...record.package.tokens,
          [mode]: setNestedValue(tokens, path, value) as ThemeModeTokens,
        },
      },
      componentTokens: mode === 'light' ? componentTokensFromPackage({ ...record.package, tokens: { ...record.package.tokens, [mode]: setNestedValue(tokens, path, value) as ThemeModeTokens } }, 'light') : record.componentTokens,
    })
  }

  return (
    <div className="space-y-5">
      {COLOR_GROUPS.map(group => (
        <section key={group.title}>
          <h3 className="mb-3 text-sm font-semibold text-[var(--eden-text)]">{group.title}</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {group.paths.map(([path, label]) => (
              <ColorField key={path} label={label} tokenPath={path} value={String(getNestedValue(tokens, path) || '')} disabled={locked} onChange={value => update(path, value)} />
            ))}
          </div>
        </section>
      ))}
      <div className="grid gap-4 lg:grid-cols-2">
        {TOKEN_GROUPS.map(group => (
          <section key={group.key} className="rounded-lg border border-[var(--eden-border)] p-3">
            <h3 className="mb-3 text-sm font-semibold text-[var(--eden-text)]">{group.title}</h3>
            <div className="grid gap-3">
              {Object.entries(tokens[group.key]).map(([key, value]) => (
                <TextField key={key} disabled={locked} label={key} value={String(value)} onChange={next => update(`${group.key}.${key}`, numericIfNeeded(value, next))} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function ComponentTokenEditor({ record, locked, onChange }: { record: ManagedThemeRecord; locked: boolean; onChange: (record: ManagedThemeRecord) => void }) {
  function update(group: keyof ManagedThemeComponentTokens, key: string, value: string) {
    onChange({
      ...record,
      componentTokens: {
        ...record.componentTokens,
        [group]: {
          ...record.componentTokens[group],
          [key]: value,
        },
      },
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {(Object.entries(record.componentTokens) as [keyof ManagedThemeComponentTokens, Record<string, string>][]).map(([group, values]) => (
        <section key={group} className="rounded-lg border border-[var(--eden-border)] p-3">
          <h3 className="mb-3 text-sm font-semibold capitalize text-[var(--eden-text)]">{componentGroupLabel(group)}</h3>
          <div className="grid gap-3">
            {Object.entries(values).map(([key, value]) => (
              <TextField key={key} disabled={locked} label={key} value={value} onChange={next => update(group, key, next)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function MotifEditor({ record, locked, onChange }: { record: ManagedThemeRecord; locked: boolean; onChange: (record: ManagedThemeRecord) => void }) {
  const motif = record.motif
  const update = (patch: Partial<typeof motif>) => onChange({ ...record, motif: { ...motif, ...patch } })
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <section className="space-y-3">
        <label>
          <span className="mb-1 block text-xs font-semibold text-[var(--eden-text-muted)]">Motif tipi</span>
          <select disabled={locked} value={motif.motifType} onChange={event => update({ motifType: event.target.value as ManagedMotifType })} className="h-10 w-full rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-3 text-sm text-[var(--eden-text)] disabled:opacity-60">
            {MOTIF_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <ColorField disabled={locked} label="Motif primary" tokenPath="motif.primaryColor" value={motif.primaryColor} onChange={primaryColor => update({ primaryColor })} />
          <ColorField disabled={locked} label="Motif secondary" tokenPath="motif.secondaryColor" value={motif.secondaryColor} onChange={secondaryColor => update({ secondaryColor })} />
          <ColorField disabled={locked} label="Motif warm" tokenPath="motif.warmColor" value={motif.warmColor} onChange={warmColor => update({ warmColor })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField disabled={locked} label="Opacity light" value={motif.opacityLight} min={0} max={1} step={0.01} onChange={opacityLight => update({ opacityLight })} />
          <NumberField disabled={locked} label="Opacity dark" value={motif.opacityDark} min={0} max={1} step={0.01} onChange={opacityDark => update({ opacityDark })} />
          <NumberField disabled={locked} label="Line width" value={motif.lineWidth} min={0.5} max={6} step={0.5} onChange={lineWidth => update({ lineWidth })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField disabled={locked} label="Placement" value={motif.placement} onChange={placement => update({ placement: placement as typeof motif.placement })} />
          <TextField disabled={locked} label="Density" value={motif.density} onChange={density => update({ density: density as typeof motif.density })} />
        </div>
      </section>
      <section className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow disabled={locked} label="Banner motif aktif" checked={motif.bannerEnabled} onChange={bannerEnabled => update({ bannerEnabled })} />
          <ToggleRow disabled={locked} label="Content/list motif aktif" checked={motif.contentEnabled} onChange={contentEnabled => update({ contentEnabled })} />
          <ToggleRow disabled={locked} label="Empty state motif aktif" checked={motif.emptyStateEnabled} onChange={emptyStateEnabled => update({ emptyStateEnabled })} />
          <ToggleRow disabled={locked} label="Wizard motif aktif" checked={motif.wizardEnabled} onChange={wizardEnabled => update({ wizardEnabled })} />
        </div>
        <label>
          <span className="mb-1 block text-xs font-semibold text-[var(--eden-text-muted)]">Inline SVG template, opsiyonel</span>
          <textarea disabled={locked} value={motif.inlineSvgTemplate} onChange={event => update({ inlineSvgTemplate: event.target.value })} rows={4} className="w-full rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] p-3 font-mono text-xs text-[var(--eden-text)] disabled:opacity-60" />
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-[var(--eden-text-muted)]">CSS background template, opsiyonel</span>
          <textarea disabled={locked} value={motif.cssBackgroundTemplate} onChange={event => update({ cssBackgroundTemplate: event.target.value })} rows={4} className="w-full rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] p-3 font-mono text-xs text-[var(--eden-text)] disabled:opacity-60" />
        </label>
        {hasUnsafeMotifTemplate(record) && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">Template alanında script, foreignObject, external URL, inline handler veya keyfi CSS blok algılandı.</div>
        )}
      </section>
    </div>
  )
}

function ThemePreview({ record }: { record: ManagedThemeRecord }) {
  const [mode, setMode] = useState<ThemeAppearance>('light')
  const vars = themeTokensToCssVars(record.package.tokens[mode])
  const previewStyle = vars as CSSProperties
  return (
    <div className="space-y-4" style={previewStyle}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--eden-text)]">Gerçek bileşen önizleme</h3>
        <div className="inline-flex rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface-muted)] p-1">
          {(['light', 'dark'] as ThemeAppearance[]).map(item => (
            <button key={item} type="button" onClick={() => setMode(item)} className={cn('h-8 rounded-md px-3 text-xs font-semibold', mode === item ? 'bg-[var(--eden-accent)] text-[var(--eden-accent-text)]' : 'text-[var(--eden-text-muted)]')}>
              {item === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-xl bg-[var(--eden-bg)] p-4 text-[var(--eden-text)]">
        <PageBanner mode="list" title="Şirketlerimiz" subtitle="Yönetilen şirket kayıtlarını görüntüleyin" icon={<Layers size={22} />} onAddClick={() => undefined} />
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <section className="rounded-[var(--eden-radius-card)] border border-[var(--eden-border)] bg-[var(--eden-surface)] p-4 shadow-[var(--eden-shadow-card)]">
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[var(--eden-radius-card)] border border-[var(--eden-border)] bg-[var(--eden-surface-muted)] p-3">
              <input value="Ara..." readOnly className="h-10 min-w-64 rounded-[var(--eden-radius-input)] border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-3 text-sm text-[var(--eden-text-muted)]" />
              <span className="rounded-full bg-[var(--eden-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--eden-text)]">2/3</span>
              <span className="ml-auto rounded-lg border border-[var(--eden-border)] px-3 py-2 text-xs font-semibold">Smart List</span>
            </div>
            <table className="w-full overflow-hidden rounded-[var(--eden-radius-card)] border border-[var(--eden-border)] text-sm">
              <thead className="bg-[var(--eden-table-header-bg)] text-[var(--eden-text)]">
                <tr><th className="p-3 text-left">Kısa Ünvan</th><th className="p-3 text-left">VKN</th><th className="p-3 text-left">Durum</th></tr>
              </thead>
              <tbody>
                <tr className="bg-[var(--eden-table-row-selected)]"><td className="p-3">Eden Teknoloji</td><td className="p-3">3241196401</td><td className="p-3"><span className="rounded-full bg-[var(--eden-success-soft)] px-2 py-1 text-xs font-semibold text-[var(--eden-success)]">Onaylı</span></td></tr>
                <tr className="hover:bg-[var(--eden-table-row-hover)]"><td className="p-3">Development A.Ş.</td><td className="p-3">1234567890</td><td className="p-3"><span className="rounded-full bg-[var(--eden-warning-soft)] px-2 py-1 text-xs font-semibold text-[var(--eden-warning)]">Taslak</span></td></tr>
              </tbody>
            </table>
          </section>
          <aside className="space-y-4">
            <section className="rounded-[var(--eden-radius-card)] border border-[var(--eden-border)] bg-[var(--eden-surface)] p-4 shadow-[var(--eden-shadow-card)]">
              <h4 className="font-semibold">Form preview</h4>
              <div className="mt-3 space-y-2">
                <input value="Alfa A.Ş." readOnly className="h-10 w-full rounded-[var(--eden-radius-input)] border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-3 text-sm" />
                <button className="h-10 w-full rounded-[var(--eden-radius-button)] bg-[var(--eden-accent)] font-semibold text-[var(--eden-accent-text)]">Birincil Button</button>
              </div>
            </section>
            <section className="rounded-[var(--eden-radius-card)] border border-[var(--eden-border)] bg-[var(--eden-surface-muted)] p-4">
              <h4 className="font-semibold">Empty state</h4>
              <p className="mt-2 text-sm text-[var(--eden-text-muted)]">Henüz widget eklenmemiş.</p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

function ValidationTab({ record }: { record: ManagedThemeRecord }) {
  const validation = validateEdenThemePackage(record.package).validation
  const issues = validation.errors.concat(validation.warnings)
  const contrast = validation.contrast.light.concat(validation.contrast.dark)
  return (
    <div className="space-y-4">
      <div className={cn('rounded-lg border p-4', validation.valid && !validation.activationBlocked ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900')}>
        <div className="flex items-center gap-2 font-semibold">
          {validation.valid && !validation.activationBlocked ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {validation.valid && !validation.activationBlocked ? 'Validation pass' : 'Validation fail'}
        </div>
        <p className="mt-1 text-sm">Fail olan tema Kullanıma Aç yapılamaz. Warning admin onayıyla açılabilir.</p>
      </div>
      <IssueList title="Schema / Güvenlik" issues={issues} />
      <ContrastList contrast={contrast} />
    </div>
  )
}

function ImportExportTab({ record, locked, onChange, notify }: { record: ManagedThemeRecord; locked: boolean; onChange: (record: ManagedThemeRecord) => void; notify: (type: ToastType, message: string, title?: string) => void }) {
  const [importText, setImportText] = useState('')

  function updateFromImport() {
    const { theme, validation } = parseAndValidateThemeJson(importText)
    if (!theme || !validation.valid) {
      notify('error', 'Import validation başarısız. Tema güncellenmedi.', 'Import reddedildi')
      return
    }
    onChange({
      ...record,
      displayName: theme.displayName,
      description: theme.description || record.description,
      package: theme,
      componentTokens: componentTokensFromPackage(theme, 'light'),
      validation,
      audit: [{ eventType: 'theme_imported', timestamp: new Date().toISOString(), summary: 'Theme updated from import.' }, ...record.audit],
    })
    notify('success', 'Import içeriği taslağa uygulandı. Aktif olmadı.')
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--eden-text)]">Export</h3>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => exportRecord(record, 'eden')} className={DETAIL_ACTION_CLASS}><Download size={15} /> Eden JSON</button>
          <button type="button" onClick={() => exportRecord(record, 'figma')} className={DETAIL_ACTION_CLASS}><Download size={15} /> Figma/Tokens</button>
          <button type="button" onClick={() => exportRecord(record, 'css')} className={DETAIL_ACTION_CLASS}><Download size={15} /> CSS Variables</button>
          <button type="button" onClick={() => exportRecord(record, 'readme')} className={DETAIL_ACTION_CLASS}><Download size={15} /> README</button>
        </div>
        <p className="text-sm text-[var(--eden-text-muted)]">Export yalnız tema tokenları ve açıklama içerir; secret veya kullanıcı verisi içermez.</p>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--eden-text)]">Import ile Güncelle</h3>
        <textarea disabled={locked || record.status === 'active'} value={importText} onChange={event => setImportText(event.target.value)} rows={10} className="w-full rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] p-3 font-mono text-xs text-[var(--eden-text)] disabled:opacity-60" />
        <button type="button" disabled={locked || record.status === 'active' || !importText.trim()} onClick={updateFromImport} className={cn(DETAIL_ACTION_CLASS, 'disabled:opacity-50')}><Upload size={15} /> Import Uygula</button>
      </section>
    </div>
  )
}

function UsageTab({ record }: { record: ManagedThemeRecord }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Metric label="Bu tema aktif mi?" value={record.status === 'active' ? 'Evet' : 'Hayır'} />
      <Metric label="Sistem varsayılanı mı?" value={record.source === 'system' ? 'Sistem teması' : 'Hayır'} />
      <Metric label="Tenant varsayılanı mı?" value="Bu bilgi henüz takip edilmiyor" />
      <Metric label="Kullanıcı sayısı" value="Bu bilgi henüz takip edilmiyor" />
    </div>
  )
}

function AuditTab({ record }: { record: ManagedThemeRecord }) {
  return (
    <div className="space-y-3">
      {record.audit.length ? record.audit.map(item => (
        <div key={`${item.eventType}-${item.timestamp}`} className="rounded-lg border border-[var(--eden-border)] p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--eden-text)]">
            <span>{item.eventType}</span>
            <span className="text-xs text-[var(--eden-text-muted)]">{new Date(item.timestamp).toLocaleString('tr-TR')}</span>
          </div>
          <p className="mt-1 text-sm text-[var(--eden-text-muted)]">{item.summary}</p>
        </div>
      )) : <p className="text-sm text-[var(--eden-text-muted)]">Audit olayı bulunmuyor.</p>}
    </div>
  )
}

function TextField({ label, value, onChange, placeholder, disabled = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <label>
      <span className="mb-1 block text-xs font-semibold text-[var(--eden-text-muted)]">{label}</span>
      <input disabled={disabled} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-3 text-sm text-[var(--eden-text)] outline-none focus:border-[var(--eden-input-focus)] disabled:opacity-60" />
    </label>
  )
}

function NumberField({ label, value, min, max, step, disabled, onChange }: { label: string; value: number; min: number; max: number; step: number; disabled: boolean; onChange: (value: number) => void }) {
  return (
    <label>
      <span className="mb-1 block text-xs font-semibold text-[var(--eden-text-muted)]">{label}</span>
      <input disabled={disabled} type="number" value={value} min={min} max={max} step={step} onChange={event => onChange(Number(event.target.value))} className="h-10 w-full rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-3 text-sm text-[var(--eden-text)] disabled:opacity-60" />
    </label>
  )
}

function ColorField({ label, tokenPath, value, disabled = false, onChange }: { label: string; tokenPath: string; value: string; disabled?: boolean; onChange: (value: string) => void }) {
  const colorInputValue = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'
  return (
    <label className="rounded-lg border border-[var(--eden-border)] p-3">
      <span className="mb-2 block text-xs font-semibold text-[var(--eden-text)]">{label}</span>
      <div className="flex items-center gap-2">
        <input disabled={disabled} type="color" value={colorInputValue} onChange={event => onChange(event.target.value)} className="h-9 w-10 rounded border border-[var(--eden-border)] bg-transparent disabled:opacity-60" />
        <input disabled={disabled} value={value} onChange={event => onChange(event.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--eden-input-border)] bg-[var(--eden-input-bg)] px-2 font-mono text-xs text-[var(--eden-text)] disabled:opacity-60" />
      </div>
      <span className="mt-1 block truncate text-[10px] text-[var(--eden-text-muted)]">{tokenPath}</span>
    </label>
  )
}

function ToggleRow({ label, checked, disabled = false, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex h-10 items-center justify-between gap-3 rounded-lg border border-[var(--eden-border)] px-3">
      <span className="text-sm font-semibold text-[var(--eden-text)]">{label}</span>
      <input disabled={disabled} type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4" />
    </label>
  )
}

function StatusBadge({ status }: { status: ManagedThemeStatus }) {
  const className = status === 'active'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : status === 'draft'
      ? 'bg-slate-50 text-slate-700 border-slate-200'
      : status === 'preview'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : status === 'rejected'
          ? 'bg-red-50 text-red-700 border-red-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
  return <span className={cn('inline-flex w-fit rounded-full border px-2 py-0.5 text-[11px] font-semibold', className)}>{STATUS_LABELS[status]}</span>
}

function IssueList({ title, issues }: { title: string; issues: ThemeValidationIssue[] }) {
  return (
    <section className="rounded-lg border border-[var(--eden-border)] p-3">
      <h3 className="mb-2 text-sm font-semibold text-[var(--eden-text)]">{title}</h3>
      {issues.length ? issues.map(issue => (
        <div key={`${issue.path}-${issue.code}`} className="mb-2 rounded-lg bg-[var(--eden-surface-muted)] p-2 text-xs">
          <strong>{issue.severity.toUpperCase()}</strong> {issue.path}: {issue.message}
        </div>
      )) : <p className="text-sm text-[var(--eden-text-muted)]">Sorun bulunmadı.</p>}
    </section>
  )
}

function ContrastList({ contrast }: { contrast: ReturnType<typeof validateEdenThemePackage>['validation']['contrast']['light'] }) {
  return (
    <section className="rounded-lg border border-[var(--eden-border)] p-3">
      <h3 className="mb-2 text-sm font-semibold text-[var(--eden-text)]">Kontrast</h3>
      {contrast.length ? contrast.map(item => (
        <div key={`${item.mode}-${item.path}`} className="mb-2 rounded-lg bg-[var(--eden-surface-muted)] p-2 text-xs">
          <strong>{item.severity.toUpperCase()}</strong> {item.mode} {item.path}: {item.ratio} / {item.minimum}
        </div>
      )) : <p className="text-sm text-[var(--eden-text-muted)]">Kontrast sorunu bulunmadı.</p>}
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface-muted)] p-3">
      <div className="text-xs font-semibold text-[var(--eden-text-muted)]">{label}</div>
      <div className="mt-2 text-sm font-semibold text-[var(--eden-text)]">{value}</div>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function getThemeManagementMetadata(record: ManagedThemeRecord): Record<string, unknown> {
  const metadata = record.package.metadata as Record<string, unknown> | undefined
  const themeManagement = metadata?.themeManagement
  return themeManagement && typeof themeManagement === 'object' && !Array.isArray(themeManagement)
    ? themeManagement as Record<string, unknown>
    : {}
}

function setThemeManagementMetadata(record: ManagedThemeRecord, path: string, value: unknown): ManagedThemeRecord {
  const nextThemeManagement = setNestedValue(getThemeManagementMetadata(record), path, value)
  return {
    ...record,
    package: {
      ...record.package,
      metadata: {
        ...(record.package.metadata || {}),
        themeManagement: nextThemeManagement,
      },
    },
  }
}

function defaultSurfaceValue(record: ManagedThemeRecord, path: string) {
  const light = record.package.tokens.light.color
  if (path.includes('sidebar')) return light.accent.primary
  if (path.includes('topbar')) return light.surface
  if (path.includes('card') || path.includes('form') || path.includes('modal') || path.includes('drawer')) return light.surface
  if (path.includes('list')) return light.surfaceMuted
  return light.background
}

function previewBannerBackground(record: ManagedThemeRecord, mode: ThemeAppearance) {
  const colors = record.package.tokens[mode].color
  const meta = getThemeManagementMetadata(record)
  const type = String(getNestedValue(meta, 'banner.backgroundType') ?? 'gradient')
  const from = String(getNestedValue(meta, `illustrations.pageBanner.${mode === 'light' ? 'lightColor' : 'darkColor'}`) ?? colors.accent.primary)
  const to = String(getNestedValue(meta, 'banner.overlayColor') ?? colors.accent.secondary)
  if (type === 'solid') return colors.accent.primary
  return `linear-gradient(135deg, ${from}, ${to}), radial-gradient(circle at 85% 20%, ${colors.accent.soft}, transparent 38%)`
}

function previewPatternBackground(record: ManagedThemeRecord) {
  const colors = record.package.tokens.light.color
  const meta = getThemeManagementMetadata(record)
  const from = String(getNestedValue(meta, 'background.gradientFrom') ?? colors.background)
  const to = String(getNestedValue(meta, 'background.gradientTo') ?? colors.surfaceMuted)
  const patternColor = String(getNestedValue(meta, 'background.patternColor') ?? colors.accent.primary)
  const spacing = String(getNestedValue(meta, 'background.patternSpacing') ?? '24px')
  return `linear-gradient(135deg, ${from}, ${to}), radial-gradient(circle, ${patternColor} 1px, transparent 1px) 0 0 / ${spacing} ${spacing}`
}

type ExportFormat = 'eden' | 'figma' | 'css' | 'readme'

function exportRecord(record: ManagedThemeRecord, format: ExportFormat) {
  const packageWithMetadata = {
    ...record.package,
    metadata: {
      ...(record.package.metadata || {}),
      componentTokens: record.componentTokens,
      motif: record.motif,
      lifecycleStatus: record.status,
    },
  } satisfies EdenThemePackage
  const artifact = format === 'eden'
    ? { filename: `${record.themeKey}.eden-theme.json`, type: 'application/json', body: JSON.stringify(packageWithMetadata, null, 2) }
    : format === 'figma'
      ? { filename: `${record.themeKey}.figma-tokens.json`, type: 'application/json', body: JSON.stringify(edenThemeToFigmaTokens(packageWithMetadata), null, 2) }
      : format === 'css'
        ? { filename: `${record.themeKey}.css-variables.css`, type: 'text/css', body: edenThemeToCssVariables(packageWithMetadata) }
        : { filename: `${record.themeKey}.README.md`, type: 'text/markdown', body: buildReadme(record) }
  downloadText(artifact.filename, artifact.type, artifact.body)
}

function downloadText(filename: string, type: string, body: string) {
  const blob = new Blob([body], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function buildReadme(record: ManagedThemeRecord) {
  return `# ${record.displayName}

Theme key: \`${record.themeKey}\`
Status: \`${record.status}\`
Source: \`${record.source}\`

Layout, workflows and Eden logo must not change. Edit only JSON design tokens, component tokens and motif configuration. Do not add CSS/JS/HTML, external URLs, font files or executable content.
`
}

function filterRecord(record: ManagedThemeRecord, filter: ThemeFilter) {
  const validation = record.validation || validateEdenThemePackage(record.package).validation
  if (filter === 'active') return record.status === 'active'
  if (filter === 'draft') return record.status === 'draft'
  if (filter === 'preview') return record.status === 'preview'
  if (filter === 'imported') return record.source === 'imported'
  if (filter === 'system') return record.source === 'system'
  if (filter === 'invalid') return !validation.valid
  if (filter === 'contrast') return validation.contrast.light.concat(validation.contrast.dark).length > 0
  return true
}

function getNestedValue(source: unknown, path: string) {
  return path.split('.').reduce<unknown>((current, key) => current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined, source)
}

function setNestedValue<T>(source: T, path: string, value: unknown): T {
  const parts = path.split('.')
  const clone: any = Array.isArray(source) ? [...source] : { ...(source as Record<string, unknown>) }
  let current = clone
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = value
      return
    }
    current[part] = Array.isArray(current[part]) ? [...current[part]] : { ...(current[part] || {}) }
    current = current[part]
  })
  return clone
}

function numericIfNeeded(previous: unknown, next: string) {
  return typeof previous === 'number' ? Number(next) : next
}

function componentGroupLabel(group: string) {
  if (group === 'pageBanner') return 'Page banner'
  return group.replace(/([A-Z])/g, ' $1')
}

function hasUnsafeMotifTemplate(record: ManagedThemeRecord) {
  const raw = `${record.motif.inlineSvgTemplate || ''}\n${record.motif.cssBackgroundTemplate || ''}`
  return /<script|foreignObject|on[a-z]+\s*=|javascript:|https?:\/\/|@import|url\s*\(|expression\s*\(|iframe|base64|data:/i.test(raw)
}

function themeConceptToFallbackPackage(themeId: ThemeConceptId) {
  const record = getSystemThemeRecords().find(item => item.themeKey === themeId) || getSystemThemeRecords()[0]
  return record.package
}
