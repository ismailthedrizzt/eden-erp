import type { ThemeAppearance, ThemeContrastIssue, ThemeModeTokens } from './themeSchema'

type Rgb = { r: number; g: number; b: number }

export function checkThemeContrast(tokens: { light: ThemeModeTokens; dark: ThemeModeTokens }) {
  return {
    light: checkModeContrast('light', tokens.light),
    dark: checkModeContrast('dark', tokens.dark),
  }
}

export function checkModeContrast(mode: ThemeAppearance, tokens: ThemeModeTokens): ThemeContrastIssue[] {
  const issues: ThemeContrastIssue[] = []
  const pairs = [
    ['color.text.primary on color.background', tokens.color.text.primary, tokens.color.background, 4.5],
    ['color.text.primary on color.surface', tokens.color.text.primary, tokens.color.surface, 4.5],
    ['color.text.secondary on color.surface', tokens.color.text.secondary, tokens.color.surface, 4.5],
    ['color.text.muted on color.surface', tokens.color.text.muted, tokens.color.surface, 3],
    ['color.danger on color.surface', tokens.color.danger, tokens.color.surface, 3],
    ['color.warning on color.surface', tokens.color.warning, tokens.color.surface, 3],
    ['color.success on color.surface', tokens.color.success, tokens.color.surface, 3],
    ['button text on color.accent.primary', bestTextColor(tokens.color.accent.primary), tokens.color.accent.primary, 4.5],
    ['input text on color.surface', tokens.color.text.primary, tokens.color.surface, 4.5],
    ['badge text on color.accent.soft', tokens.color.text.primary, tokens.color.accent.soft, 3],
  ] as const

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

function bestTextColor(background: string) {
  const whiteRatio = contrastRatio('#ffffff', background) || 0
  const darkRatio = contrastRatio('#111827', background) || 0
  return whiteRatio >= darkRatio ? '#ffffff' : '#111827'
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
  const match = color.match(/^hsla?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})%\s*,\s*([0-9]{1,3})%(?:\s*,\s*(0|0?\.\d+|1))?\s*\)$/i)
  if (!match) return null

  const h = Number(match[1])
  const s = Number(match[2]) / 100
  const l = Number(match[3]) / 100
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
