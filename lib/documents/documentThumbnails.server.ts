import 'server-only'

import { createHash } from 'crypto'
import { join } from 'path'
import { pathToFileURL } from 'url'
import sharp from 'sharp'
import type { createServiceClient } from '@/lib/supabase/server'
import { DOCUMENT_BUCKET, DOCUMENT_THUMBNAIL_PREFIX } from '@/lib/documents/documentStorage'

export { DOCUMENT_BUCKET, DOCUMENT_THUMBNAIL_PREFIX }

const THUMBNAIL_DIMENSION = 420
const THUMBNAIL_QUALITY = 78

type Supabase = ReturnType<typeof createServiceClient>

type ThumbnailInput = {
  buffer: Buffer
  mimeType: string
  sourceStoragePath: string
  tenantId: string
  fileName?: string
}

type ThumbnailResult = {
  storagePath: string
  signedUrl?: string
  size: number
  width?: number
  height?: number
  type: 'image/webp'
}

export function isSupportedDocumentThumbnailType(mimeType: string) {
  return mimeType.startsWith('image/') || mimeType === 'application/pdf'
}

export function isFallbackThumbnailUrl(value: unknown) {
  return typeof value === 'string' && value.startsWith('data:image/svg+xml')
}

export async function createAndUploadDocumentThumbnail(
  supabase: Supabase,
  input: ThumbnailInput
): Promise<ThumbnailResult | null> {
  if (!input.tenantId || !input.sourceStoragePath || !isSupportedDocumentThumbnailType(input.mimeType)) {
    return null
  }

  const thumbnail = await createDocumentThumbnail(input.buffer, input.mimeType)
  if (!thumbnail) return null

  const storagePath = buildThumbnailStoragePath(input.tenantId, input.sourceStoragePath, input.fileName)
  const { error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, thumbnail.buffer, {
      contentType: 'image/webp',
      upsert: true,
    })

  if (error) throw error

  const { data } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24)

  return {
    storagePath,
    signedUrl: data?.signedUrl,
    size: thumbnail.buffer.length,
    width: thumbnail.width,
    height: thumbnail.height,
    type: 'image/webp',
  }
}

async function createDocumentThumbnail(buffer: Buffer, mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return createWebpThumbnail(buffer)
  }

  if (mimeType === 'application/pdf') {
    const preview = await renderFirstPdfPage(buffer)
    if (!preview) return null
    return createWebpThumbnail(preview)
  }

  return null
}

async function createWebpThumbnail(buffer: Buffer) {
  const { data, info } = await sharp(buffer, { animated: false, limitInputPixels: 50_000_000 })
    .rotate()
    .flatten({ background: '#ffffff' })
    .resize({
      width: THUMBNAIL_DIMENSION,
      height: THUMBNAIL_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: THUMBNAIL_QUALITY, effort: 4 })
    .toBuffer({ resolveWithObject: true })

  return { buffer: data, width: info.width, height: info.height }
}

async function renderFirstPdfPage(buffer: Buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const { createCanvas } = await import('@napi-rs/canvas')
  const standardFontDataUrl = pathToFileURL(join(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/')).href
  const wasmUrl = pathToFileURL(join(process.cwd(), 'node_modules/pdfjs-dist/wasm/')).href
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    standardFontDataUrl,
    wasmUrl,
  } as any)
  const pdf = await loadingTask.promise
  const page = await pdf.getPage(1)
  const baseViewport = page.getViewport({ scale: 1 })
  const scale = Math.min(1, THUMBNAIL_DIMENSION / Math.max(baseViewport.width, baseViewport.height))
  const viewport = page.getViewport({ scale })
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  const context = canvas.getContext('2d')

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvas: canvas as any, canvasContext: context as any, viewport } as any).promise

  return canvas.toBuffer('image/png')
}

function buildThumbnailStoragePath(tenantId: string, sourceStoragePath: string, fileName?: string) {
  const hash = createHash('sha256').update(sourceStoragePath).digest('hex').slice(0, 20)
  const baseName = safeFileName(fileName || sourceStoragePath.split('/').pop() || 'document').replace(/\.[a-z0-9]+$/i, '')
  return `${DOCUMENT_THUMBNAIL_PREFIX}/${tenantId}/${hash}-${baseName || 'document'}.webp`
}

function safeFileName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 90)
}
