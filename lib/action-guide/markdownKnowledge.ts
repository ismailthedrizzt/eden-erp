import 'server-only'

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export type ActionGuideKnowledgeSnippet = {
  file: string
  title: string
  excerpt: string
  score: number
}

type MarkdownDocument = {
  file: string
  title: string
  content: string
  normalized: string
}

const KNOWLEDGE_ROOTS = ['docs', path.join('lib', 'domains')]
const MAX_MARKDOWN_FILES = 180
const MAX_FILE_CHARS = 16000
const MIN_TERM_LENGTH = 3

let markdownCorpusPromise: Promise<MarkdownDocument[]> | null = null

export async function findActionGuideKnowledge(query: string, limit = 5): Promise<ActionGuideKnowledgeSnippet[]> {
  const terms = searchTerms(query)
  if (!terms.length) return []

  const corpus = await loadMarkdownCorpus()
  return corpus
    .map(document => ({
      file: document.file,
      title: document.title,
      excerpt: excerptFor(document, terms),
      score: scoreDocument(document.normalized, terms),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

async function loadMarkdownCorpus() {
  if (!markdownCorpusPromise) {
    markdownCorpusPromise = loadMarkdownDocuments()
  }
  return markdownCorpusPromise
}

async function loadMarkdownDocuments() {
  const files: string[] = []
  for (const root of KNOWLEDGE_ROOTS) {
    const absoluteRoot = path.join(process.cwd(), root)
    files.push(...await collectMarkdownFiles(absoluteRoot, MAX_MARKDOWN_FILES - files.length))
    if (files.length >= MAX_MARKDOWN_FILES) break
  }

  const documents = await Promise.all(files.map(async file => {
    const raw = await readFile(file, 'utf8').catch(() => '')
    const content = raw.slice(0, MAX_FILE_CHARS)
    return {
      file: path.relative(process.cwd(), file).replace(/\\/g, '/'),
      title: titleFor(content, file),
      content,
      normalized: normalize(content),
    }
  }))

  return documents.filter(document => document.content.trim().length > 0)
}

async function collectMarkdownFiles(directory: string, remaining: number): Promise<string[]> {
  if (remaining <= 0) return []

  const entries = await readdir(directory, { withFileTypes: true }).catch(() => [])
  const files: string[] = []

  for (const entry of entries) {
    if (files.length >= remaining) break
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue
      files.push(...await collectMarkdownFiles(entryPath, remaining - files.length))
      continue
    }
    if (entry.isFile() && entry.name.toLocaleLowerCase('tr-TR').endsWith('.md')) {
      files.push(entryPath)
    }
  }

  return files
}

function scoreDocument(normalizedContent: string, terms: string[]) {
  return terms.reduce((score, term) => {
    if (!normalizedContent.includes(term)) return score
    const occurrences = normalizedContent.split(term).length - 1
    return score + Math.min(occurrences, 8) * (term.length > 6 ? 2 : 1)
  }, 0)
}

function excerptFor(document: MarkdownDocument, terms: string[]) {
  const normalizedContent = document.normalized
  const firstIndex = terms
    .map(term => normalizedContent.indexOf(term))
    .filter(index => index >= 0)
    .sort((a, b) => a - b)[0] ?? 0

  const start = Math.max(0, firstIndex - 320)
  const end = Math.min(document.content.length, firstIndex + 720)
  return cleanupMarkdown(document.content.slice(start, end))
}

function titleFor(content: string, file: string) {
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim()
  if (heading) return heading
  return path.basename(file, path.extname(file))
}

function searchTerms(query: string) {
  const normalized = normalize(query)
  const rawTerms = normalized
    .split(/[^a-z0-9]+/g)
    .filter(term => term.length >= MIN_TERM_LENGTH)

  return Array.from(new Set([
    ...rawTerms,
    ...businessSynonyms(normalized),
  ]))
}

function businessSynonyms(normalized: string) {
  const terms: string[] = []
  if (normalized.includes('master') || normalized.includes('kimlik')) {
    terms.push('stakeholder', 'person', 'central', 'master')
  }
  if (normalized.includes('lifecycle') || normalized.includes('yasam') || normalized.includes('resmi')) {
    terms.push('lifecycle', 'official', 'wizard', 'approval')
  }
  if (normalized.includes('ortak') || normalized.includes('pay')) {
    terms.push('ownership', 'partner', 'share')
  }
  if (normalized.includes('temsil') || normalized.includes('yetki')) {
    terms.push('representative', 'authority', 'scope')
  }
  if (normalized.includes('sube')) {
    terms.push('branch', 'opening', 'closing')
  }
  return terms
}

function cleanupMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+]\([^)]+\)/g, match => match.replace(/^\[|\]\([^)]+\)$/g, ''))
    .replace(/[#>*_`|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/\u0131/g, 'i')
    .replace(/\u011f/g, 'g')
    .replace(/\u00fc/g, 'u')
    .replace(/\u015f/g, 's')
    .replace(/\u00f6/g, 'o')
    .replace(/\u00e7/g, 'c')
}
