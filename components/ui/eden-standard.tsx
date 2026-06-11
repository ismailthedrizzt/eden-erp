'use client'

import { type ReactNode } from 'react'
import { ImageSlotUploader, type ImageSlot, type SlotImage } from './ImageSlotUploader'
import { DocumentSlotUploader, type DocumentSlot, type SlotDocument } from './DocumentSlotUploader'
import { cn } from '@/lib/utils'

type StandardProps = {
  children: ReactNode
  className?: string
}

export function EdenPageShell({ children, className }: StandardProps) {
  return (
    <div data-eden-standard="page-shell" className={cn('space-y-5', className)}>
      {children}
    </div>
  )
}

export function EdenListPageShell({ children, className }: StandardProps) {
  return (
    <div data-eden-standard="list-page-shell" className={cn('space-y-5', className)}>
      {children}
    </div>
  )
}

export function EdenSmartList({ children, className }: StandardProps) {
  return (
    <section data-eden-standard="smart-list" className={cn('min-w-0', className)}>
      {children}
    </section>
  )
}

export function EdenFormShell({ children, className }: StandardProps) {
  return (
    <div data-eden-standard="form-shell" className={cn('space-y-5', className)}>
      {children}
    </div>
  )
}

export function EdenFormHeader({
  title,
  breadcrumb,
  chips,
  actions,
  children,
  className,
}: {
  title: ReactNode
  breadcrumb?: ReactNode
  chips?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  className?: string
}) {
  if (children) {
    return (
      <section data-eden-standard="form-header" className={cn('rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface)] px-4 py-3 shadow-sm', className)}>
        {children}
      </section>
    )
  }

  return (
    <section data-eden-standard="form-header" className={cn('rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface)] px-4 py-3 shadow-sm', className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {breadcrumb && <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-[var(--eden-text-muted)]">{breadcrumb}</div>}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="mr-2 truncate text-xl font-semibold text-[var(--eden-text)]">{title}</h1>
            {chips}
          </div>
        </div>
        {actions && <div data-eden-standard="form-actions" className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </section>
  )
}

export function EdenFormHero({ children, className }: StandardProps) {
  return (
    <section data-eden-standard="form-hero" className={cn('rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface)] p-4 shadow-sm', className)}>
      {children}
    </section>
  )
}

export function EdenHeroImageUploader({
  title = 'Resim Uploader',
  slots,
  images,
  onChange,
  readOnly,
  mode,
}: {
  title?: string
  slots: ImageSlot[]
  images: SlotImage[]
  onChange: (images: SlotImage[]) => void
  readOnly?: boolean
  mode?: 'insert' | 'update' | 'view'
}) {
  return (
    <div data-eden-standard="hero-image-uploader" className="rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface-raised)] p-3">
      <div className="mb-2 text-sm font-semibold text-[var(--eden-text)]">{title}</div>
      <ImageSlotUploader slots={slots} images={images} onChange={onChange} allowExtraSlots={false} readOnly={readOnly} mode={mode} />
    </div>
  )
}

export function EdenHeroDocumentUploader({
  title = 'Belge Uploader',
  slots,
  documents,
  onChange,
  readOnly,
  mode,
}: {
  title?: string
  slots: DocumentSlot[]
  documents: SlotDocument[]
  onChange: (documents: SlotDocument[]) => void
  readOnly?: boolean
  mode?: 'insert' | 'update' | 'view'
}) {
  return (
    <div data-eden-standard="hero-document-uploader" className="rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface-raised)] p-3">
      <div className="mb-2 text-sm font-semibold text-[var(--eden-text)]">{title}</div>
      <DocumentSlotUploader slots={slots} documents={documents} onChange={onChange} allowExtraSlots={false} readOnly={readOnly} mode={mode} defaultTab="documents" />
    </div>
  )
}

export function EdenFormTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  children,
  className,
}: {
  tabs: Array<{ id: T; label: string }>
  activeTab: T
  onChange: (tab: T) => void
  children: ReactNode
  className?: string
}) {
  return (
    <section data-eden-standard="form-tabs" className={cn('rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface)] shadow-sm', className)}>
      <div className="flex gap-2 overflow-x-auto border-b border-[var(--eden-border)] px-4 py-3" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onChange(tab.id)}
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
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

export function EdenFormActionBar({ children, className }: StandardProps) {
  return (
    <div data-eden-standard="form-action-bar" className={cn('flex flex-wrap justify-end gap-2 border-t border-[var(--eden-border)] pt-4', className)}>
      {children}
    </div>
  )
}

export function EdenStatusActionButton({
  children,
  onClick,
  disabled,
  variant = 'primary',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary'
}) {
  return (
    <button
      type="button"
      data-eden-standard="status-action-button"
      onClick={onClick}
      disabled={disabled}
      className={variant === 'primary'
        ? 'inline-flex items-center gap-2 rounded-lg bg-[var(--eden-accent)] px-4 py-2 text-sm font-semibold text-[var(--eden-accent-text)] shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
        : 'inline-flex items-center gap-2 rounded-lg border border-[var(--eden-border)] bg-[var(--eden-surface)] px-4 py-2 text-sm font-semibold text-[var(--eden-text)] transition hover:bg-[var(--eden-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50'}
    >
      {children}
    </button>
  )
}

export function EdenCompactFieldGrid({ children, className }: StandardProps) {
  return (
    <div data-eden-standard="compact-field-grid" className={cn('grid gap-4 lg:grid-cols-2', className)}>
      {children}
    </div>
  )
}

export function EdenTokenTable({ children, className }: StandardProps) {
  return (
    <div data-eden-standard="token-table" className={cn('overflow-x-auto rounded-lg border border-[var(--eden-border)]', className)}>
      {children}
    </div>
  )
}

export function EdenWizardShell({ children, className }: StandardProps) {
  return (
    <div data-eden-standard="wizard-shell" className={cn('space-y-5 rounded-xl border border-[var(--eden-border)] bg-[var(--eden-surface)] p-4 shadow-sm', className)}>
      {children}
    </div>
  )
}
