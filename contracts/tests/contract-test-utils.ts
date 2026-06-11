import type { EdenListColumnContract } from '../core/list.contract'
import type { EdenPageContract } from '../core/page.contract'

type RenderedColumn = {
  key: string
  label?: unknown
}

export function assertListColumnsMatchContract(
  route: string,
  expectedColumns: readonly EdenListColumnContract[],
  renderedColumns: readonly RenderedColumn[]
) {
  const expectedKeys = expectedColumns.map((column) => column.key)
  const renderedKeys = renderedColumns.map((column) => String(column.key))
  const missing = expectedKeys.filter((key) => !renderedKeys.includes(key))
  const extra = renderedKeys.filter((key) => !expectedKeys.includes(key))

  if (missing.length || extra.length) {
    throw new Error(
      `List column contract mismatch for ${route}. Missing: ${missing.join(', ') || '-'}; Extra: ${extra.join(', ') || '-'}`
    )
  }
}

export function pagePrimaryActionLabel(contract: EdenPageContract) {
  return contract.list?.primaryActionLabel || 'Ekle'
}

export function requirePageContract(contract: EdenPageContract) {
  return contract
}
