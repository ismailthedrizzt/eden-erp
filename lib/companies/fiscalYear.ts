export const DEFAULT_FISCAL_YEAR_START = 101

const MONTH_DAY_COUNTS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export type FiscalYearStartParts = {
  month: number
  day: number
}

export function daysInFiscalYearMonth(month: number) {
  return MONTH_DAY_COUNTS[month - 1] || 31
}

export function buildFiscalYearStartValue(month: number, day: number) {
  const safeMonth = clampInteger(month, 1, 12)
  const safeDay = clampInteger(day, 1, daysInFiscalYearMonth(safeMonth))
  return safeMonth * 100 + safeDay
}

export function parseFiscalYearStartStorage(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'string' && /[./-]/.test(value)) {
    const parts = value
      .trim()
      .split(/[./-]/)
      .map(part => Number(part))
      .filter(part => Number.isInteger(part))

    if (parts.length >= 2) {
      const [first, second] = parts
      const dayFirst = first > 12 || second <= 12
      const month = dayFirst ? second : first
      const day = dayFirst ? first : second
      return isValidFiscalYearStartParts(month, day) ? month * 100 + day : null
    }
  }

  const numeric = Number(value)
  if (!Number.isInteger(numeric)) return null

  if (numeric >= 1 && numeric <= 12) return numeric * 100 + 1
  const month = Math.floor(numeric / 100)
  const day = numeric % 100
  return isValidFiscalYearStartParts(month, day) ? numeric : null
}

export function normalizeFiscalYearStartStorage(
  value: unknown,
  fallback = DEFAULT_FISCAL_YEAR_START
) {
  return parseFiscalYearStartStorage(value) ?? fallback
}

export function normalizeFiscalYearStartParts(value: unknown): FiscalYearStartParts {
  const normalized = normalizeFiscalYearStartStorage(value)
  return {
    month: Math.floor(normalized / 100),
    day: normalized % 100,
  }
}

export function isValidFiscalYearStart(value: unknown) {
  return parseFiscalYearStartStorage(value) !== null
}

export function formatFiscalYearStart(value: unknown) {
  const { month, day } = normalizeFiscalYearStartParts(value)
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}`
}

function isValidFiscalYearStartParts(month: number, day: number) {
  return Number.isInteger(month)
    && Number.isInteger(day)
    && month >= 1
    && month <= 12
    && day >= 1
    && day <= daysInFiscalYearMonth(month)
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.trunc(value)))
}
