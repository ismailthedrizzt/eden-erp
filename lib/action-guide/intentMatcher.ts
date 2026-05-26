import { actionRegistry } from './actionRegistry'
import type { ActionGuideContext, ActionGuideDefinition, ActionIntentMatch } from './actionGuide.types'

const PAGE_MODULE_BOOST: Array<{ contains: string; moduleKey: string }> = [
  { contains: '/companies/partners', moduleKey: 'partners' },
  { contains: '/companies/representatives', moduleKey: 'representatives' },
  { contains: '/companies/branches', moduleKey: 'branches' },
  { contains: '/sirket/teskilat', moduleKey: 'organization' },
  { contains: '/sirket/tesisler', moduleKey: 'facilities' },
  { contains: '/sirket/companies', moduleKey: 'companies' },
]

const FIELD_LOCK_HINTS: Array<{ terms: string[]; actionKey: string; reason: string }> = [
  { terms: ['sermaye', 'kapali', 'kilitli'], actionKey: 'capital_increase', reason: 'Sermaye alani resmi islem kontrollu.' },
  { terms: ['adres', 'kapali'], actionKey: 'address_change', reason: 'Adres alani resmi islem kontrollu.' },
  { terms: ['unvan', 'kapali'], actionKey: 'title_change', reason: 'Unvan alani resmi islem kontrollu.' },
  { terms: ['yetki', 'degistiremiyorum'], actionKey: 'representative_authority_scope_change', reason: 'Temsil yetkisi karttan degil yetki islemiyle degisir.' },
  { terms: ['sube', 'belge', 'kapali'], actionKey: 'branch_document_update', reason: 'Sube belgeleri ayri resmi islemle guncellenir.' },
]

export function matchActionIntent(query: string, context: ActionGuideContext = {}): ActionIntentMatch[] {
  const normalized = normalizeText(query)
  if (!normalized) return []

  const matches = actionRegistry
    .map(action => scoreActionIntent(action, normalized, context))
    .filter(match => match.confidence > 0.18)
    .sort((left, right) => right.confidence - left.confidence)

  const fieldHint = matchFieldLockHint(normalized)
  if (fieldHint) {
    const existing = matches.find(match => match.actionKey === fieldHint.actionKey)
    if (existing) {
      existing.confidence = Math.min(0.99, existing.confidence + 0.18)
      existing.reason = fieldHint.reason
    } else {
      matches.unshift({
        actionKey: fieldHint.actionKey,
        confidence: 0.88,
        matchedTerms: fieldHint.terms,
        reason: fieldHint.reason,
      })
    }
  }

  return dedupeMatches(matches)
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 5)
}

export function normalizeActionGuideText(value: string) {
  return normalizeText(value)
}

function scoreActionIntent(action: ActionGuideDefinition, normalizedQuery: string, context: ActionGuideContext): ActionIntentMatch {
  const matchedTerms = new Set<string>()
  let score = 0
  let reason = 'Anahtar kelime eslesmesi'

  for (const example of action.intentExamples) {
    const normalizedExample = normalizeText(example)
    if (normalizedExample && normalizedQuery.includes(normalizedExample)) {
      score += 0.55
      matchedTerms.add(example)
      reason = 'Ornek niyet ifadesi eslesti'
    } else {
      const overlap = tokenOverlap(normalizedQuery, normalizedExample)
      if (overlap.score > 0.55) {
        score += 0.2 + overlap.score * 0.18
        overlap.terms.forEach(term => matchedTerms.add(term))
      }
    }
  }

  for (const keyword of action.keywords) {
    const normalizedKeyword = normalizeText(keyword)
    if (normalizedKeyword && normalizedQuery.includes(normalizedKeyword)) {
      score += 0.12
      matchedTerms.add(keyword)
    }
  }

  const labelOverlap = tokenOverlap(normalizedQuery, normalizeText(action.label))
  if (labelOverlap.score > 0) {
    score += labelOverlap.score * 0.16
    labelOverlap.terms.forEach(term => matchedTerms.add(term))
  }

  const pageBoost = PAGE_MODULE_BOOST.find(item => (context.currentPage || context.route || '').includes(item.contains))
  if (pageBoost?.moduleKey === action.moduleKey) score += 0.08
  if (context.selectedRecordType && context.selectedRecordType === action.requiredRecordType) score += 0.06
  if (context.selectedRecordStatus && action.requiredRecordStatuses?.includes(normalizeRecordStatus(context.selectedRecordStatus))) score += 0.04

  return {
    actionKey: action.key,
    confidence: Math.max(0, Math.min(0.99, score)),
    matchedTerms: Array.from(matchedTerms),
    reason,
  }
}

function tokenOverlap(query: string, target: string) {
  const queryTokens = new Set(query.split(/\s+/).filter(token => token.length > 2))
  const targetTokens = target.split(/\s+/).filter(token => token.length > 2)
  if (!queryTokens.size || !targetTokens.length) return { score: 0, terms: [] as string[] }
  const terms = targetTokens.filter(token => queryTokens.has(token))
  return { score: terms.length / targetTokens.length, terms }
}

function matchFieldLockHint(normalizedQuery: string) {
  const lockTerms = ['kapali', 'kilitli', 'degistiremiyorum', 'neden', 'readonly', 'read only']
  if (!lockTerms.some(term => normalizedQuery.includes(term))) return null
  return FIELD_LOCK_HINTS.find(hint => hint.terms.every(term => normalizedQuery.includes(normalizeText(term)))) || null
}

function dedupeMatches(matches: ActionIntentMatch[]) {
  const byKey = new Map<string, ActionIntentMatch>()
  for (const match of matches) {
    const existing = byKey.get(match.actionKey)
    if (!existing || match.confidence > existing.confidence) byKey.set(match.actionKey, match)
  }
  return Array.from(byKey.values())
}

function normalizeRecordStatus(value: unknown) {
  const status = normalizeText(String(value || ''))
  if (['aktif', 'active'].includes(status)) return 'active'
  if (['taslak', 'draft'].includes(status)) return 'draft'
  if (['kapali', 'closed', 'terkin', 'deregistered'].includes(status)) return 'closed'
  if (['tasfiye', 'liquidation'].includes(status)) return 'liquidation'
  return status
}

function normalizeText(value: string) {
  return (value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
