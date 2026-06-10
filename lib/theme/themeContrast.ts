import type { ThemeAppearance, ThemeColorTokens, ThemeContrastIssue, ThemeModeTokens } from './themeSchema'

type Rgb = { r: number; g: number; b: number }

export function checkThemeContrast(modes: { light: ThemeModeTokens; dark: ThemeModeTokens }) {
  return {
    light: checkModeContrast('light', modes.light),
    dark: checkModeContrast('dark', modes.dark),
  }
}

export function checkModeContrast(mode: ThemeAppearance, tokens: ThemeModeTokens): ThemeContrastIssue[] {
  const colors = tokens.colors
  const pairs = contrastPairs(colors)
  const issues: ThemeContrastIssue[] = []

  for (const [path, foreground, background, minimum] of pairs) {
    const ratio = contrastRatio(foreground, background)
    if (ratio === null) continue
    if (ratio < minimum) {
      issues.push({
        mode,
        path,
        foreground,
        background,
        ratio: roundRatio(ratio),
        minimum,
        severity: minimum >= 4.5 ? 'critical' : 'warning',
        message: `${path} kontrast orani ${roundRatio(ratio)}; minimum ${minimum}.`,
      })
    }
  }

  return issues
}

function contrastPairs(colors: ThemeColorTokens) {
  return [
    ['foreground on background', colors.foreground, colors.background, 4.5],
    ['foreground on surface', colors.foreground, colors.surface, 4.5],
    ['mutedForeground on surface', colors.mutedForeground, colors.surface, 4.5],
    ['cardForeground on card', colors.cardForeground, colors.card, 4.5],
    ['primaryForeground on primary', colors.primaryForeground, colors.primary, 4.5],
    ['accentForeground on accent', colors.accentForeground, colors.accent, 4.5],
    ['danger on surface', colors.danger, colors.surface, 3],
    ['warning on surface', colors.warning, colors.surface, 3],
    ['success on surface', colors.success, colors.surface, 3],
    ['info on surface', colors.info, colors.surface, 3],
    ['inputForeground on input', colors.inputForeground, colors.input, 4.5],
  ] as const
}

export function contrastRatio(foreground: string, background: string) {
  const fg = parseColor(foreground)
  const bg = parseColor(background)
  if (!fg || !bg) return null

  const foregroundLum = relativeLuminance(fg)
  const backgroundLum = relativeLuminance(bg)
  const lighter = Math.max(foregroundLum, backgroundLum)
  const darker = Math.min(foregroundLum, backgroundLum)
  return (lighter + 0.05) / (darker + 0.05)
}

export function parseColor(value: string): Rgb | null {
  const color = value.trim()
  const hex = parseHexColor(color)
  if (hex) return hex
  const rgb = parseRgbColor(color)
  if (rgb) return rgb
  return parseHslColor(color)
}

function parseHexColor(color: string): Rgb | null {
  const match = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!match) return null

  const raw = match[1]
  const full = raw.length === 3
    ? raw.split('').map(char => `${char}${char}`).join('')
    : raw

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

function parseRgbColor(color: string): Rgb | null {
  const match = color.match(/^rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})(?:\s*,\s*(0|0?\.\d+|1))?\s*\)$/i)
  if (!match) return null

  const rgb = {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
  }

  if ([rgb.r, rgb.g, rgb.b].some(channel => channel < 0 || channel > 255)) return null
  return rgb
}

function parseHslColor(color: string): Rgb | null {
  const normalized = color.match(/^hsla?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})%\s*,\s*([0-9]{1,3})%(?:\s*,\s*(0|0?\.\d+|1))?\s*\)$/i)
  if (!normalized) return null

  const h = Number(normalized[1])
  const s = Number(normalized[2]) / 100
  const l = Number(normalized[3]) / 100
  if (h < 0 || h > 360 || s < 0 || s > 1 || l < 0 || l > 1) return null

  const chroma = (1 - Math.abs(2 * l - 1)) * s
  const x = chroma * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - chroma / 2
  const [rp, gp, bp] = h < 60
    ? [chroma, x, 0]
    : h < 120
      ? [x, chroma, 0]
      : h < 180
        ? [0, chroma, x]
        : h < 240
          ? [0, x, chroma]
          : h < 300
            ? [x, 0, chroma]
            : [chroma, 0, x]

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  }
}

function relativeLuminance({ r, g, b }: Rgb) {
  const [rs, gs, bs] = [r, g, b].map(channel => {
    const normalized = channel / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4)
  })

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function roundRatio(value: number) {
  return Math.round(value * 100) / 100
}
