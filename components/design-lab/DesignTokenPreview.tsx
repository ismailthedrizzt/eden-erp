import { Box, Layers3, PenLine, Radius, ScanLine, Type } from 'lucide-react'
import type { ThemeConcept } from './themeConcepts'

interface DesignTokenPreviewProps {
  theme: ThemeConcept
}

export function DesignTokenPreview({ theme }: DesignTokenPreviewProps) {
  const colorTokens = Object.entries(theme.colors)
  const shapeTokens = Object.entries(theme.radius)
  const shadowTokens = Object.entries(theme.shadows)
  const typographyTokens = Object.entries(theme.typography)

  return (
    <section className="rounded-[var(--dl-card-radius)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-raised)] p-4" style={{ boxShadow: 'var(--dl-shadow-card)' }}>
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-[var(--dl-radius-medium)] bg-[var(--dl-surface-muted)] text-[var(--dl-accent-primary)]">
          <Layers3 size={16} />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-[var(--dl-text-primary)]">Design Token Preview</h2>
          <p className="text-xs text-[var(--dl-text-muted)]">Global Tailwind theme degil, sandbox concept token.</p>
        </div>
      </div>

      <TokenGroup title="Color tokens" icon={<ScanLine size={14} />}>
        <div className="grid grid-cols-2 gap-2">
          {colorTokens.map(([name, value]) => (
            <div key={name} className="rounded-[var(--dl-radius-medium)] border border-[var(--dl-border-subtle)] bg-[var(--dl-surface-base)] p-2">
              <div className="mb-2 h-7 rounded-[var(--dl-radius-small)] border border-[var(--dl-border-subtle)]" style={{ backgroundColor: value }} />
              <div className="truncate text-[11px] font-semibold text-[var(--dl-text-secondary)]">{name}</div>
              <div className="font-mono text-[10px] text-[var(--dl-text-muted)]">{value}</div>
            </div>
          ))}
        </div>
      </TokenGroup>

      <TokenGroup title="Shape" icon={<Radius size={14} />}>
        <div className="grid gap-2">
          {shapeTokens.map(([name, value]) => (
            <TokenLine key={name} name={name} value={value} />
          ))}
        </div>
      </TokenGroup>

      <TokenGroup title="Shadow" icon={<Box size={14} />}>
        <div className="grid gap-2">
          {shadowTokens.map(([name, value]) => (
            <TokenLine key={name} name={name} value={value} />
          ))}
        </div>
      </TokenGroup>

      <TokenGroup title="Typography" icon={<Type size={14} />}>
        <div className="grid gap-2">
          {typographyTokens.map(([name, value]) => (
            <TokenLine key={name} name={name} value={value} />
          ))}
        </div>
      </TokenGroup>

      <TokenGroup title="Icon + density" icon={<PenLine size={14} />}>
        <div className="grid gap-2">
          <TokenLine name="strokeWidth" value={String(theme.iconStyle.strokeWidth)} />
          <TokenLine name="iconContainer" value={theme.iconStyle.iconContainer} />
          <TokenLine name="moduleIconBackground" value={theme.iconStyle.moduleIconBackground} />
          <TokenLine name="statusIconStyle" value={theme.iconStyle.statusIconStyle} />
          <TokenLine name="density" value={theme.density} />
        </div>
      </TokenGroup>
    </section>
  )
}

function TokenGroup({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--dl-text-secondary)]">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  )
}

function TokenLine({ name, value }: { name: string; value: string }) {
  return (
    <div className="rounded-[var(--dl-radius-medium)] bg-[var(--dl-surface-muted)] px-3 py-2">
      <div className="text-[11px] font-semibold text-[var(--dl-text-secondary)]">{name}</div>
      <div className="mt-1 text-[11px] leading-4 text-[var(--dl-text-muted)]">{value}</div>
    </div>
  )
}
