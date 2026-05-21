import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createServiceClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/security/serverPermissions'
import { enforceRateLimit } from '@/lib/security/rateLimit'

export const runtime = 'nodejs'

const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const MAX_DIMENSION = 2048
const DEFAULT_PREVIEW_DIMENSION = 512
const DEFAULT_THUMBNAIL_DIMENSION = 96

export async function POST(request: NextRequest) {
  const supabase = createServiceClient()
  const permission = await requirePermission(request, supabase, 'documents.export')
  if (permission instanceof NextResponse) return permission

  const limited = enforceRateLimit(request, 'image-variants', permission.userId || 'system', {
    limit: 30,
    windowMs: 10 * 60 * 1000,
  })
  if (limited) return limited

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Gorsel bulunamadi', code: 'FILE_REQUIRED' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Dosya bir gorsel degil', code: 'INVALID_TYPE' }, { status: 400 })
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Gorsel cok buyuk', code: 'FILE_TOO_LARGE' }, { status: 413 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const previewDimension = parseDimension(formData.get('maxDimension'), DEFAULT_PREVIEW_DIMENSION)
  const thumbnailDimension = parseDimension(formData.get('thumbnailDimension'), DEFAULT_THUMBNAIL_DIMENSION)
  const previewQuality = parseQuality(formData.get('quality'), 78)
  const thumbnailQuality = parseQuality(formData.get('thumbnailQuality'), 72)

  try {
    const [preview, thumbnail] = await Promise.all([
      createWebpVariant(buffer, previewDimension, previewQuality),
      createWebpVariant(buffer, thumbnailDimension, thumbnailQuality),
    ])

    return NextResponse.json({
      previewUrl: toDataUrl(preview.buffer),
      thumbnailUrl: toDataUrl(thumbnail.buffer),
      previewSize: preview.buffer.length,
      thumbnailSize: thumbnail.buffer.length,
      width: preview.width,
      height: preview.height,
      thumbnailWidth: thumbnail.width,
      thumbnailHeight: thumbnail.height,
      type: 'image/webp',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gorsel islenemedi'
    return NextResponse.json({ error: message, code: 'IMAGE_PROCESSING_FAILED' }, { status: 422 })
  }
}

async function createWebpVariant(input: Buffer, dimension: number, quality: number) {
  const image = sharp(input, { animated: false, limitInputPixels: 50_000_000 })
    .rotate()
    .resize({
      width: dimension,
      height: dimension,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 4 })

  const { data, info } = await image.toBuffer({ resolveWithObject: true })
  return { buffer: data, width: info.width, height: info.height }
}

function toDataUrl(buffer: Buffer) {
  return `data:image/webp;base64,${buffer.toString('base64')}`
}

function parseDimension(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(24, Math.min(MAX_DIMENSION, Math.round(parsed)))
}

function parseQuality(value: FormDataEntryValue | null, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  const normalized = parsed <= 1 ? parsed * 100 : parsed
  return Math.max(1, Math.min(100, Math.round(normalized)))
}
