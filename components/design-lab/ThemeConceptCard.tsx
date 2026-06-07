import { CheckCircle2 } from 'lucide-react'
import { ThemeCornerMotif } from './DecorativeMotif'
import type { ThemeConcept, ThemeConceptId } from './themeConcepts'

interface ThemeConceptCardProps {
  theme: ThemeConcept
  active: boolean
  onSelect: (id: ThemeConceptId) => void
}

export function ThemeConceptCard({ theme, active, onSelect }: ThemeConceptCardProps) {
  const swatches = [
    theme.colors.background,
    theme.colors.surfaceRaised,
    theme.colors.accentPrimary,
    theme.colors.accentWarm,
    theme.colors.success,
  ]

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(theme.id)}
      className="group relative flex min-h-[230px] w-full flex-col justify-between overflow-hidden rounded-[var(--dl-card-radius)] border bg-[var(--dl-surface-base)] p-4 text-left transition hover:-translate-y-0.5 focus:outline-none"
      style={{
        borderColor: active ? theme.colors.accentPrimary : 'var(--dl-border-subtle)',
        boxShadow: active ? theme.shadows.shadowFocus : 'var(--dl-shadow-subtle)',
      }}
    >
      <ThemeCornerMotif theme={theme} compact tone="theme" />
      <span className="relative z-10">
        <span className="mb-4 flex items-center justify-between gap-3">
          <span className="flex gap-1.5">
            {swatches.map(color => (
              <span key={color} className="h-5 w-5 rounded-full border border-white/60" style={{ backgroundColor: color }} />
            ))}
          </span>
          {active && <CheckCircle2 size={18} className="text-[var(--dl-success)]" />}
        </span>
        <span className="block text-sm font-semibold text-[var(--dl-text-primary)]">{theme.name}</span>
        <span className="mt-2 block text-xs leading-5 text-[var(--dl-text-secondary)]">{theme.description}</span>
      </span>
      <span className="relative z-10 mt-4 flex flex-wrap gap-1.5">
        {theme.personality.slice(0, 3).map(item => (
          <span key={item} className="rounded-full bg-[var(--dl-surface-muted)] px-2 py-1 text-[11px] font-semibold text-[var(--dl-text-secondary)]">
            {item}
          </span>
        ))}
      </span>
    </button>
  )
}
