'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { CheckCircle2, Eye, LockKeyhole, Palette, ShieldCheck, Sparkles } from 'lucide-react'
import { ComponentGallery } from './ComponentGallery'
import { DesignTokenPreview } from './DesignTokenPreview'
import { ThemeConceptSwitcher } from './ThemeConceptSwitcher'
import {
  DEFAULT_DESIGN_LAB_THEME_ID,
  LEGACY_DESIGN_LAB_THEME_STORAGE_KEY,
  VISUAL_THEME_CHANGE_EVENT,
  VISUAL_THEME_STORAGE_KEY,
  findThemeConcept,
  getThemeCssVars,
  normalizeThemeConceptId,
  themeConcepts,
  type ThemeConceptId,
} from './themeConcepts'
import { readCachedUiPreferences, syncUiPreferencesPatch } from '@/lib/user-state/client'
import { THEME_IMPORT_PREVIEW_STORAGE_KEY, type EdenThemePackage } from '@/lib/theme/themeSchema'
import { themeTokensToDesignLabCssVars } from '@/lib/theme/themeTransforms'
import { validateEdenThemePackage } from '@/lib/theme/themeValidation'

const evaluationCriteria = [
  'Kurumsal guven veriyor mu?',
  'AI-template hissini azaltiyor mu?',
  'Okunabilirlik iyi mi?',
  'Yogun ERP tablosunda goz yoruyor mu?',
  'Renkler fazla oyuncak/renkli mi?',
  'Sade ama karakterli mi?',
  'Ikonlar default gibi mi duruyor?',
  'Formlar ciddi is yazilimi gibi mi?',
  'Wizard guven veriyor mu?',
  'Action Center is listesi hissi veriyor mu?',
  'Belgeler anlasilir mi?',
  'Karanlik/aydinlik dengesi nasil?',
  'Turkiye KOBI/kurumsal pazarina uygun mu?',
  'Savunma/teknoloji projeleriyle uyumlu mu?',
]

export function DesignLabShell() {
  const [activeThemeId, setActiveThemeId] = useState<ThemeConceptId>(DEFAULT_DESIGN_LAB_THEME_ID)
  const [importedPreviewTheme, setImportedPreviewTheme] = useState<EdenThemePackage | null>(null)
  const [showImportedPreview, setShowImportedPreview] = useState(false)
  const activeTheme = findThemeConcept(activeThemeId)
  const themeVars = useMemo(() => {
    if (showImportedPreview && importedPreviewTheme) {
      return themeTokensToDesignLabCssVars(importedPreviewTheme.tokens.light)
    }
    return getThemeCssVars(activeTheme)
  }, [activeTheme, importedPreviewTheme, showImportedPreview])
  const previewDisplayName = showImportedPreview && importedPreviewTheme
    ? importedPreviewTheme.displayName
    : activeTheme.name

  useEffect(() => {
    const cachedThemeId = normalizeThemeConceptId(readCachedUiPreferences().visualTheme)
    const storedThemeId = normalizeThemeConceptId(
      window.localStorage.getItem(VISUAL_THEME_STORAGE_KEY)
        || window.localStorage.getItem(LEGACY_DESIGN_LAB_THEME_STORAGE_KEY)
    )
    if (cachedThemeId || storedThemeId) setActiveThemeId(cachedThemeId || storedThemeId || DEFAULT_DESIGN_LAB_THEME_ID)

    function handleExternalThemeChange(event: Event) {
      const themeId = (event as CustomEvent<{ themeId?: unknown }>).detail?.themeId
      const normalized = normalizeThemeConceptId(themeId)
      if (normalized) {
        setShowImportedPreview(false)
        setActiveThemeId(normalized)
      }
    }

    const rawImportedPreview = window.localStorage.getItem(THEME_IMPORT_PREVIEW_STORAGE_KEY)
    if (rawImportedPreview) {
      try {
        const { theme, validation } = validateEdenThemePackage(JSON.parse(rawImportedPreview))
        if (theme && validation.valid) setImportedPreviewTheme(theme)
      } catch {
        window.localStorage.removeItem(THEME_IMPORT_PREVIEW_STORAGE_KEY)
      }
    }

    window.addEventListener(VISUAL_THEME_CHANGE_EVENT, handleExternalThemeChange)
    return () => window.removeEventListener(VISUAL_THEME_CHANGE_EVENT, handleExternalThemeChange)
  }, [])

  function changeThemeConcept(themeId: ThemeConceptId) {
    setShowImportedPreview(false)
    setActiveThemeId(themeId)
    syncUiPreferencesPatch({ visualTheme: themeId }).catch(() => undefined)
    window.dispatchEvent(new CustomEvent(VISUAL_THEME_CHANGE_EVENT, {
      detail: { themeId },
    }))
  }

  return (
    <div
      className="-m-3 min-h-[calc(100vh-3.5rem)] bg-[var(--dl-background)] text-[var(--dl-text-primary)] sm:-m-5"
      style={themeVars as CSSProperties}
    >
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-raised)]" style={{ boxShadow: 'var(--dl-shadow-card)' }}>
          <div className="grid gap-5 p-5 lg:grid-cols-[1.35fr_0.65fr] lg:p-6">
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--dl-border-strong)] bg-[var(--dl-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--dl-text-secondary)]">
                  <LockKeyhole size={13} /> development_internal
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--dl-accent-primary)] px-2.5 py-1 text-xs font-semibold text-[var(--dl-surface-raised)]">
                  <ShieldCheck size={13} /> production UI untouched
                </span>
                {showImportedPreview && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--dl-border-strong)] bg-[var(--dl-surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--dl-text-secondary)]">
                    <Eye size={13} /> imported preview
                  </span>
                )}
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--dl-radius-large)] bg-[var(--dl-accent-primary)] text-[var(--dl-surface-raised)]">
                  <Palette size={22} strokeWidth={activeTheme.iconStyle.strokeWidth} />
                </span>
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold tracking-normal text-[var(--dl-text-primary)] sm:text-3xl">
                    {previewDisplayName}
                  </h1>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--dl-text-secondary)]">
                    Eden ERP icin alternatif gorsel kimlik konseptleri Development Design Lab icinde karsilastirilir. Import edilen temalar burada preview edilir; kullanici tercihi veya aktif tema otomatik degismez.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[var(--dl-radius-large)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-muted)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--dl-text-primary)]">
                <Sparkles size={16} className="text-[var(--dl-accent-warm)]" />
                Designer note
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--dl-text-secondary)]">{activeTheme.designerNote}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {activeTheme.sampleBadges.map(badge => (
                  <span
                    key={badge.label}
                    className="rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ backgroundColor: badge.background, color: badge.foreground }}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </header>

        <ThemeConceptSwitcher
          concepts={themeConcepts}
          activeId={activeTheme.id}
          onChange={changeThemeConcept}
        />

        {importedPreviewTheme && (
          <section className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-raised)] p-4" style={{ boxShadow: 'var(--dl-shadow-subtle)' }}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--dl-text-primary)]">
                  <Eye size={16} className="text-[var(--dl-accent-primary)]" />
                  Imported preview theme
                </div>
                <p className="mt-1 text-sm text-[var(--dl-text-secondary)]">
                  {importedPreviewTheme.displayName} preview olarak yuklendi. Bu secim global user preference yazmaz.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportedPreview(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-[var(--dl-radius-medium)] bg-[var(--dl-accent-primary)] px-3 text-sm font-semibold text-[var(--dl-surface-raised)]"
                >
                  <Eye size={15} /> Preview
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportedPreview(false)}
                  className="inline-flex h-9 items-center gap-2 rounded-[var(--dl-radius-medium)] border border-[var(--dl-border-subtle)] px-3 text-sm font-semibold text-[var(--dl-text-secondary)]"
                >
                  System themes
                </button>
              </div>
            </div>
          </section>
        )}

        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
            <DesignTokenPreview theme={activeTheme} />
            <EvaluationChecklist />
          </aside>
          <ComponentGallery theme={activeTheme} />
        </div>
      </div>
    </div>
  )
}

function EvaluationChecklist() {
  return (
    <section className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-raised)] p-4" style={{ boxShadow: 'var(--dl-shadow-subtle)' }}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-[var(--dl-radius-medium)] bg-[var(--dl-surface-muted)] text-[var(--dl-accent-primary)]">
          <CheckCircle2 size={16} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-[var(--dl-text-primary)]">Evaluation Checklist</h2>
          <p className="text-xs text-[var(--dl-text-muted)]">Konsept secimi icin gorsel kalite kriterleri.</p>
        </div>
      </div>
      <div className="grid gap-2">
        {evaluationCriteria.map(item => (
          <div key={item} className="flex items-start gap-2 rounded-[var(--dl-radius-medium)] bg-[var(--dl-surface-muted)] px-3 py-2 text-xs leading-5 text-[var(--dl-text-secondary)]">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[var(--dl-success)]" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
