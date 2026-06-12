'use client'


import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  CheckCircle2,
  Download,
  FileJson,
  Layers,
  Palette,
  Save,
  Upload,
  XCircle,
} from 'lucide-react'
import PageBanner from '@/components/ui/PageBanner'
import { Toast, type ToastType } from '@/components/ui/Toast'
import { SmartDataTable, type ColumnDef } from '@/components/ui/SmartDataTable'
import type { ImageSlot, SlotImage } from '@/components/ui/ImageSlotUploader'
import type { DocumentSlot, SlotDocument } from '@/components/ui/DocumentSlotUploader'
import {
  EdenCompactFieldGrid,
  EdenFormHeader,
  EdenFormHero,
  EdenFormShell,
  EdenFormTabs,
  EdenHeroDocumentUploader,
  EdenHeroImageUploader,
  EdenListPageShell,
  EdenSmartList,
  EdenStatusActionButton,
  EdenTokenTable,
} from '@/components/ui/eden-standard'
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
import type { EdenThemePackage, ThemeAppearance, ThemeValidationIssue, ThemeValidationResult } from '@/lib/theme/themeSchema'
import { cn } from '@/lib/utils'
import { workspaceThemeStatusClass as STATUS_CLASS, workspaceThemeStatusLabels as STATUS_LABELS } from '@/contracts/entities/workspace-theme.contract'
import { themeManagementPageContract } from '@/contracts/pages/system/themes-management.page.contract'
import { themeManagementListContract, themeManagementFilters as FILTERS, type ThemeManagementFilter as ThemeFilter } from '@/contracts/lists/system/themes-management.list.contract'
import {
  themeBackgroundRows,
  themeColorFields as COLOR_FIELDS,
  themeColorGroups,
  themeComponentSections,
  themeDocumentSlots as DOCUMENT_SLOTS,
  themeImageSlots as IMAGE_SLOTS,
  themeManagementFormContract,
  themeManagementTabs as TABS,
  type ThemeManagementTab as ThemeTab,
} from '@/contracts/forms/system/themes-management.form.contract'
import { themeImportWizardContract } from '@/contracts/wizards/system/theme-import.wizard.contract'
import { themeActivationWizardContract } from '@/contracts/wizards/system/theme-activation.wizard.contract'
import { themeManagementLifecycleContract } from '@/contracts/lifecycle/system/theme-management.lifecycle.contract'
import { themeManagementApiServiceFunctions } from '@/contracts/api/system/theme-management.api.contract'

type ToastState = { type: ToastType; title?: string; message: string }
type ThemeTableRow = ManagedThemeRecord & { isActive: boolean }
type GeneratedThemeDocument = SlotDocument & { generated?: boolean }

const themeColumnRenderersByKey: Record<string, ColumnDef['render']> = {
  displayName: (_value, row: ThemeTableRow) => (
    <div className="flex items-center gap-3">
      <span
        className="h-9 w-9 shrink-0 rounded-lg border border-[var(--eden-border)]"
        style={{ backgroundColor: row.package.modes.light.colors.primary }}
      />
      <div className="min-w-0">
        <div className="truncate font-semibold text-[var(--eden-text)]">{row.displayName}</div>
        <div className="truncate text-xs text-[var(--eden-text-muted)]">{sourceLabel(row.source)}</div>
      </div>
    </div>
  ),
  themeKey: value => <span className="font-mono text-xs text-[var(--eden-text-muted)]">{String(value || '')}</span>,
  status: value => <StatusBadge status={value as ManagedThemeStatus} />,
  isActive: (_value, row: ThemeTableRow) => row.isActive ? 'Evet' : 'Hayir',
  updatedAt: value => <span className="text-[var(--eden-text-muted)]">{formatDate(String(value || ''))}</span>,
}

function buildThemeTableDefinition(): ColumnDef[] {
  return themeManagementListContract.columns.map(column => ({
    key: column.key,
    label: column.label,
    type: themeColumnType(column.key),
    sortable: Boolean('sortable' in column && column.sortable),
    filterable: Boolean('filterable' in column && column.filterable),
    searchable: Boolean('searchable' in column && column.searchable),
    visible: true,
    hideable: false,
    width: column.width,
    minWidth: column.width,
    fixedWidth: Boolean(column.width),
    render: themeColumnRenderersByKey[column.key],
  }))
}

function themeColumnType(key: string): ColumnDef['type'] {
  if (key === 'status') return 'badge'
  if (key === 'isActive') return 'boolean'
  if (key === 'updatedAt') return 'date'
  return 'text'
}

export default function DevelopmentThemesPage() {
  const [records, setRecords] = useState<ManagedThemeRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ThemeTab>(themeManagementFormContract.tabs[0].id)
  const [filter, setFilter] = useState<ThemeFilter>('all')
  const [mode, setMode] = useState<ThemeAppearance>('light')
  const [importText, setImportText] = useState('')
  const [toast, setToast] = useState<ToastState | null>(null)
  const themeTableColumns = useMemo(() => buildThemeTableDefinition(), [])
  const themeContractContext = useMemo(() => ({
    route: themeManagementPageContract.route,
    lifecycleTable: themeManagementLifecycleContract.transactionTable,
    serviceFunctions: themeManagementApiServiceFunctions,
    importOperation: themeImportWizardContract.lifecycleOperationType,
    activationOperation: themeActivationWizardContract.lifecycleOperationType,
  }), [])

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
  const listRecords = allRecords.filter(record => filterRecord(record, filter))
  const tableRows: ThemeTableRow[] = useMemo(
    () => listRecords.map(record => ({ ...record, isActive: record.package.meta.isActive })),
    [listRecords]
  )
  const selectedDocuments = useMemo(
    () => selected ? getThemeDocumentsForUploader(selected) : [],
    [selected]
  )
  const editable = Boolean(selected && selected.source !== 'system' && selected.status !== 'inactive')
  const canCreateDraftTheme = themeManagementPageContract.allowedActions.includes('create_draft')
    && themeContractContext.serviceFunctions.includes('createDraftThemeRecord')

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
    setActiveTab(themeManagementFormContract.tabs[0].id)
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
    setActiveTab(themeManagementFormContract.tabs[0].id)
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
    void applyDocumentsChange(documents)
  }

  async function applyDocumentsChange(documents: SlotDocument[]) {
    if (!selected || selected.source === 'system') return
    const changedImportDoc = findChangedImportDocument(selected.documents as SlotDocument[], documents)
    if (changedImportDoc) {
      try {
        const text = await readThemeDocumentText(changedImportDoc)
        const result = parseThemeImportTextV2(text)
        if (!result.theme) {
          const defaultMessage = result.kind === 'figma-tokens'
            ? 'Figma Tokens dosyasi runtime tema degildir. Eden Theme JSON import edin.'
            : 'Yuklenen belge Eden Theme JSON V2 validation gecemedi.'
          notify('error', result.validation.errors[0]?.message || defaultMessage, 'Belge import reddedildi')
          return
        }
        updateSelected(record => applyImportedThemeToExistingRecord(record, result.theme!, result.validation))
        notify('success', 'Tema JSON belgesi okundu; form alanlari ve uretilecek belgeler guncellendi.')
        return
      } catch (error) {
        notify('error', error instanceof Error ? error.message : 'Belge icerigi okunamadi.', 'Belge import reddedildi')
        return
      }
    }

    updateSelected(record => ({
      ...record,
      documents: cleanCustomDocuments(documents),
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
    setActiveTab(themeManagementFormContract.tabs[0].id)
    setImportText('')
    notify('success', themeImportWizardContract.successMessage)
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
      <EdenFormShell>
        {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}
        <ThemeFormHeader
          record={selected}
          editable={editable}
          onBack={() => setSelectedId(null)}
          onCancel={() => setSelectedId(null)}
          onSave={selected.source === 'system' ? () => makeEditableCopy(selected) : saveSelected}
          onActivate={() => setLifecycle(selected, 'active')}
          onDeactivate={() => setLifecycle(selected, 'inactive')}
        />

        <EdenFormHero>
          <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <EdenHeroImageUploader
                slots={IMAGE_SLOTS}
                images={selected.images as SlotImage[]}
                onChange={handleImagesChange}
                readOnly={!editable}
                mode={editable ? 'update' : 'view'}
              />
              <EdenHeroDocumentUploader
                slots={DOCUMENT_SLOTS}
                documents={selectedDocuments}
                onChange={handleDocumentsChange}
                readOnly={!editable}
                mode={editable ? 'update' : 'view'}
              />
            </div>

            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <StatusBadge status={selected.status} />
                <InfoChip>Sistem Teması</InfoChip>
                <InfoChip>Light/Dark destekli</InfoChip>
                <InfoChip>{sourceLabel(selected.source)}</InfoChip>
                {selected.package.meta.isActive && <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">Aktif tema</span>}
              </div>
              <EdenCompactFieldGrid>
                <TextField label="Tema adi" value={selected.displayName} disabled={!editable} onChange={value => patchMeta('displayName', value)} />
                <TextField label="Tema kodu / slug" value={selected.themeKey} disabled={!editable} onChange={value => patchMeta('themeKey', normalizeManagedThemeKey(value) || selected.themeKey)} />
                <TextField label="Versiyon" value={selected.version} disabled={!editable} onChange={value => patchMeta('version', value)} />
                <TextField label="Author" value={selected.author} disabled={!editable} onChange={value => patchMeta('author', value)} />
                <TextField label="Scope" value="Sistem" disabled />
                <TextField label="Son guncelleme" value={formatDate(selected.updatedAt)} disabled />
                <TextArea className="lg:col-span-2" label="Kisa aciklama" value={selected.description} disabled={!editable} onChange={value => patchMeta('description', value)} />
              </EdenCompactFieldGrid>
            </div>
          </div>
        </EdenFormHero>

        <EdenFormTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
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
        </EdenFormTabs>
      </EdenFormShell>
    )
  }

  return (
    <EdenListPageShell>
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />}
      <PageBanner
        mode="list"
        title="Temalarımız"
        subtitle="Eden ERP sistem temasını, tasarım tokenlarını ve arayüz görünüm kurallarını yönetin."
        icon={<Palette size={24} />}
        onAddClick={canCreateDraftTheme ? () => createDraft() : undefined}
        addButtonText="Ekle"
      />

      <EdenSmartList>
        <div className="mb-3 flex flex-wrap gap-2">
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

        <SmartDataTable<ThemeTableRow>
          columns={themeTableColumns}
          data={tableRows}
          loading={false}
          defaultView="list"
          storageKey="themes-management-smart-list"
          emptyText={<ThemeListEmptyState onCreate={canCreateDraftTheme ? () => createDraft() : undefined} />}
          onRowClick={record => {
            setSelectedId(record.id)
            setActiveTab(themeManagementFormContract.tabs[0].id)
          }}
          onRefresh={() => setRecords(readManagedThemeRecords())}
          defaultPageSize={10}
        />
      </EdenSmartList>
    </EdenListPageShell>
  )
}

function ThemeListEmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface-raised)] text-[var(--eden-accent)]">
        <Palette size={22} />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-[var(--eden-text)]">{themeManagementListContract.emptyState.title}</h3>
      <p className="mt-1 max-w-md text-sm text-[var(--eden-text-muted)]">{themeManagementListContract.emptyState.message}</p>
      {onCreate && (
        <button onClick={onCreate} className={cn(primaryButtonClass, 'mt-4')}>
          Ekle
        </button>
      )}
    </div>
  )
}

function ThemeFormHeader({
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
  const canActivate = record.source !== 'system'
    && (themeActivationWizardContract.allowedSourceStatuses as readonly string[]).includes(record.status)
    && record.status === 'draft'
  const canDeactivate = record.source !== 'system'
    && themeManagementLifecycleContract.operationTypes.includes('workspace_theme.deactivate')
    && record.status === 'active'

  return (
    <EdenFormHeader title={record.displayName} className="rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface)] px-4 py-3 shadow-sm">
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
          {canActivate && (
            <EdenStatusActionButton onClick={onActivate}>
              <CheckCircle2 size={16} /> Aktifleştir
            </EdenStatusActionButton>
          )}
          {canDeactivate && (
            <EdenStatusActionButton onClick={onDeactivate} variant="secondary">Pasife Al</EdenStatusActionButton>
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
    </EdenFormHeader>
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
  const fieldByPath = new Map(COLOR_FIELDS.map(field => [field.path, field]))
  const groups = themeColorGroups.map(group => ({
    id: group.id,
    label: group.label,
    fields: group.fieldPaths
      .map(path => fieldByPath.get(path))
      .filter((field): field is (typeof COLOR_FIELDS)[number] => Boolean(field)),
  }))
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
      <EdenTokenTable>
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
      </EdenTokenTable>
    </div>
  )
}

function BackgroundTab({ record, mode, editable, patchMode }: ModeTabProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <CompactPathTable rows={themeBackgroundRows} source={record.package.modes[mode]} editable={editable} onChange={patchMode} />
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
  return (
    <div className="space-y-3">
      {themeComponentSections.map(section => (
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
    <EdenTokenTable>
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
    </EdenTokenTable>
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
    <EdenTokenTable className="bg-[var(--eden-surface-raised)]">
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
    </EdenTokenTable>
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

function getThemeDocumentsForUploader(record: ManagedThemeRecord): SlotDocument[] {
  const generated = createGeneratedThemeDocuments(record)
  const generatedBySlot = new Map(generated.map(doc => [doc.slotId, doc]))
  const customDocuments = cleanCustomDocuments(record.documents as SlotDocument[])
  const activeCustomBySlot = new Map(
    customDocuments
      .filter(isActiveThemeDocument)
      .map(doc => [doc.slotId, doc])
  )
  const mergedActive = DOCUMENT_SLOTS.map(slot => activeCustomBySlot.get(slot.id) || generatedBySlot.get(slot.id))
    .filter((doc): doc is SlotDocument => Boolean(doc))
  const history = customDocuments.filter(doc => !isActiveThemeDocument(doc))
  return [...mergedActive, ...history]
}

function createGeneratedThemeDocuments(record: ManagedThemeRecord): GeneratedThemeDocument[] {
  const runtimePackage = toRuntimeThemePackageV2(record.package)
  const validation = record.validation || validateEdenThemePackage(record.package).validation
  const figmaTokens = edenThemeRuntimePackageV2ToFigmaTokens(runtimePackage)
  const cssVariables = runtimeThemePackageV2ToCssVariables(runtimePackage)
  const updatedAt = record.updatedAt || new Date().toISOString()
  return [
    generatedDocument(record, 'designer-note', `${record.themeKey}.designer-note.md`, designerNoteMarkdown(record), 'text/markdown', updatedAt),
    generatedDocument(record, 'technical-doc', `${record.themeKey}.technical-doc.md`, technicalDocumentMarkdown(record), 'text/markdown', updatedAt),
    generatedDocument(record, 'figma-token-export', `${record.themeKey}.figma-tokens.json`, JSON.stringify(figmaTokens, null, 2), 'application/json', updatedAt),
    generatedDocument(record, 'css-variable-export', `${record.themeKey}.css-variables.css`, cssVariables, 'text/css', updatedAt),
    generatedDocument(record, 'theme-json-export', `${record.themeKey}.eden-theme.json`, JSON.stringify(runtimePackage, null, 2), 'application/json', updatedAt),
    generatedDocument(record, 'validation-report', `${record.themeKey}.validation-report.json`, JSON.stringify({
      themeKey: record.themeKey,
      displayName: record.displayName,
      generatedAt: updatedAt,
      validation,
    }, null, 2), 'application/json', updatedAt),
  ]
}

function generatedDocument(
  record: ManagedThemeRecord,
  slotId: string,
  name: string,
  body: string,
  type: string,
  updatedAt: string
): GeneratedThemeDocument {
  return {
    slotId,
    documentId: `generated:${record.id}:${slotId}`,
    name,
    size: textByteSize(body),
    type,
    uploadedAt: updatedAt,
    updatedAt,
    status: 'active',
    version: 1,
    slotTitle: DOCUMENT_SLOTS.find(slot => slot.id === slotId)?.title || slotId,
    url: textDataUrl(body, type),
    previewUrl: textDataUrl(body, type),
    generated: true,
  }
}

function designerNoteMarkdown(record: ManagedThemeRecord) {
  return [
    `# ${record.displayName} - Tasarimci Notu`,
    '',
    `Tema kodu: ${record.themeKey}`,
    `Versiyon: ${record.version}`,
    `Durum: ${STATUS_LABELS[record.status]}`,
    '',
    '## Sanat Yonu',
    record.artDirection || '-',
    '',
    '## Ilham Notu',
    record.inspiration || '-',
    '',
    '## Kurallar',
    '- Eden ERP is akislari ve sayfa iskeleti degistirilmez.',
    '- Sadece token, yuzey, motif, banner ve asset referanslari uzerinden calisilir.',
    '- Light ve dark varyantlari birlikte teslim edilir.',
  ].join('\n')
}

function technicalDocumentMarkdown(record: ManagedThemeRecord) {
  const validation = record.validation || validateEdenThemePackage(record.package).validation
  return [
    `# ${record.displayName} - Tema Teknik Dokumani`,
    '',
    `Theme key: ${record.themeKey}`,
    `Schema version: ${record.package.schemaVersion}`,
    `Author: ${record.author}`,
    `Updated at: ${record.updatedAt}`,
    '',
    '## Paket',
    `- Runtime export: ${record.themeKey}.eden-theme.json`,
    `- Figma tokens: ${record.themeKey}.figma-tokens.json`,
    `- CSS variables: ${record.themeKey}.css-variables.css`,
    '',
    '## Validation',
    `- Valid: ${validation.valid ? 'yes' : 'no'}`,
    `- Errors: ${validation.errors.length}`,
    `- Warnings: ${validation.warnings.length + validation.contrast.light.length + validation.contrast.dark.length}`,
    `- Activation blocked: ${validation.activationBlocked ? 'yes' : 'no'}`,
  ].join('\n')
}

function findChangedImportDocument(previousDocuments: SlotDocument[], nextDocuments: SlotDocument[]) {
  const previousIds = new Set(cleanCustomDocuments(previousDocuments).map(themeDocumentIdentity))
  const hydratingSlotIds = new Set(themeManagementFormContract.reactiveFields
    .filter(item => item.className === 'eden-reactive-document-slot' && item.completionRule === 'valid_eden_theme_json')
    .flatMap(item => item.source.slotIds || [])
  )
  return nextDocuments.find(doc => {
    if (isGeneratedThemeDocument(doc) || !isActiveThemeDocument(doc)) return false
    if (!hydratingSlotIds.has(doc.slotId)) return false
    return !previousIds.has(themeDocumentIdentity(doc))
  }) || null
}

async function readThemeDocumentText(doc: SlotDocument) {
  if (doc.file) return doc.file.text()
  const url = doc.url || doc.previewUrl
  if (!url) throw new Error('Yuklenen belge icerigi okunamadi.')
  const response = await fetch(url, { credentials: 'same-origin' })
  if (!response.ok) throw new Error('Yuklenen belge icerigi indirilemedi.')
  return response.text()
}

function applyImportedThemeToExistingRecord(
  record: ManagedThemeRecord,
  themePackage: EdenThemePackage,
  validation: ThemeValidationResult
) {
  const imported = createImportedThemeRecord(themePackage, validation, record.createdBy)
  const now = new Date().toISOString()
  return validateManagedTheme({
    ...record,
    themeKey: imported.themeKey,
    displayName: imported.displayName,
    description: imported.description,
    status: imported.status,
    source: 'imported',
    artDirection: imported.artDirection,
    inspiration: imported.inspiration,
    category: imported.category,
    supportsLight: imported.supportsLight,
    supportsDark: imported.supportsDark,
    notes: imported.notes,
    author: imported.author,
    version: imported.version,
    package: imported.package,
    componentTokens: imported.componentTokens,
    motif: imported.motif,
    validation,
    updatedAt: now,
    documents: [],
    audit: [
      { eventType: 'theme_imported', timestamp: now, summary: 'Theme JSON document imported from hero document uploader.' },
      ...record.audit,
    ].slice(0, 100),
  })
}

function cleanCustomDocuments(documents: SlotDocument[]) {
  return documents
    .filter(doc => !isGeneratedThemeDocument(doc))
    .map(doc => {
      const copy: SlotDocument = { ...doc }
      delete copy.file
      return copy as ManagedThemeAssetDocument
    })
}

function isGeneratedThemeDocument(doc: SlotDocument): doc is GeneratedThemeDocument {
  return Boolean((doc as GeneratedThemeDocument).generated)
    || String(doc.documentId || '').startsWith('generated:')
    || String(doc.url || '').startsWith('data:')
}

function isActiveThemeDocument(doc: SlotDocument) {
  return doc.status !== 'archived' && doc.status !== 'deleted' && !doc.deletedAt && !doc.isDeleted
}

function themeDocumentIdentity(doc: SlotDocument) {
  return [
    doc.slotId,
    doc.documentId || '',
    doc.storagePath || '',
    doc.name || '',
    doc.size || 0,
    doc.type || '',
    doc.uploadedAt ? String(doc.uploadedAt) : '',
    doc.updatedAt ? String(doc.updatedAt) : '',
  ].join(':')
}

function textDataUrl(body: string, type: string) {
  return `data:${type};charset=utf-8,${encodeURIComponent(body)}`
}

function textByteSize(body: string) {
  return typeof TextEncoder === 'undefined' ? body.length : new TextEncoder().encode(body).length
}

function filterRecord(record: ManagedThemeRecord, filter: ThemeFilter) {
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
