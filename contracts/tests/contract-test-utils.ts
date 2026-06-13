import type { EdenListColumnContract } from '../core/list.contract'
import type { EdenPageContract } from '../core/page.contract'

type RenderedColumn = {
  key: string
  label?: unknown
}

type RenderedField = {
  name: string
}

type RenderedTab = {
  fields?: readonly RenderedField[]
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

export function assertFormFieldsMatchContract(
  route: string,
  expectedFields: readonly { name: string; hidden?: boolean }[],
  renderedFields: readonly RenderedField[],
  renderedTabs: readonly RenderedTab[] = []
) {
  const expectedNames = expectedFields.filter((field) => !field.hidden).map((field) => field.name)
  const renderedNames = [
    ...renderedFields.map((field) => field.name),
    ...renderedTabs.flatMap((tab) => (tab.fields || []).map((field) => field.name)),
  ]

  const missing = expectedNames.filter((name) => !renderedNames.includes(name))

  if (missing.length) {
    throw new Error(
      `Form field contract mismatch for ${route}. Missing: ${missing.join(', ') || '-'}`
    )
  }
}
