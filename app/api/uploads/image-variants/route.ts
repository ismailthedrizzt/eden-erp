// BACKEND_MIGRATION_STATUS: keep_upload_adapter
// TARGET_BACKEND_MODULE: media
// TARGET_FASTAPI_ENDPOINT: n/a
// NOTES: Image variant adapter is UI/media infrastructure, not ERP domain backend logic.

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
  const transparentBackground = parseBoolean(formData.get('transparentBackground'))

  try {
    const [preview, thumbnail] = await Promise.all([
      createWebpVariant(buffer, previewDimension, previewQuality, transparentBackground),
      createWebpVariant(buffer, thumbnailDimension, thumbnailQuality, transparentBackground),
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

async function createWebpVariant(input: Buffer, dimension: number, quality: number, transparentBackground: boolean) {
  const image = sharp(input, { animated: false, limitInputPixels: 50_000_000 })
    .rotate()
    .resize({
      width: dimension,
      height: dimension,
      fit: 'inside',
      withoutEnlargement: true,
    })

  if (transparentBackground) {
    const transparent = await makeBackgroundTransparent(image)
    const { data, info } = await sharp(transparent.data, {
      raw: {
        width: transparent.width,
        height: transparent.height,
        channels: 4,
      },
    })
      .webp({ quality, effort: 4 })
      .toBuffer({ resolveWithObject: true })

    return { buffer: data, width: info.width, height: info.height }
  }

  const { data, info } = await image.webp({ quality, effort: 4 }).toBuffer({ resolveWithObject: true })
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

function parseBoolean(value: FormDataEntryValue | null) {
  return value === 'true' || value === '1' || value === 'yes'
}

async function makeBackgroundTransparent(image: sharp.Sharp) {
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  if (info.channels !== 4 || info.width <= 0 || info.height <= 0) {
    return { data, width: info.width, height: info.height }
  }

  const background = sampleCornerBackground(data, info.width, info.height)
  if (!background) return { data, width: info.width, height: info.height }

  applyBackgroundTransparency(data, background)
  return { data, width: info.width, height: info.height }
}

function sampleCornerBackground(data: Buffer, width: number, height: number) {
  const sampleSize = Math.max(1, Math.min(10, Math.floor(Math.min(width, height) / 6) || 1))
  const corners = [
    [0, 0],
    [Math.max(0, width - sampleSize), 0],
    [0, Math.max(0, height - sampleSize)],
    [Math.max(0, width - sampleSize), Math.max(0, height - sampleSize)],
  ] as const
  let red = 0
  let green = 0
  let blue = 0
  let count = 0

  corners.forEach(([startX, startY]) => {
    for (let y = startY; y < Math.min(height, startY + sampleSize); y += 1) {
      for (let x = startX; x < Math.min(width, startX + sampleSize); x += 1) {
        const index = (y * width + x) * 4
        const alpha = data[index + 3]
        if (alpha < 220) continue
        red += data[index]
        green += data[index + 1]
        blue += data[index + 2]
        count += 1
      }
    }
  })

  if (count < sampleSize * sampleSize) return null
  return {
    red: red / count,
    green: green / count,
    blue: blue / count,
  }
}

function applyBackgroundTransparency(data: Buffer, background: { red: number; green: number; blue: number }) {
  const hardThreshold = 18
  const softThreshold = 58

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3]
    if (alpha === 0) continue

    const distance = Math.sqrt(
      ((data[index] - background.red) ** 2)
      + ((data[index + 1] - background.green) ** 2)
      + ((data[index + 2] - background.blue) ** 2)
    )

    if (distance <= hardThreshold) {
      data[index + 3] = 0
      continue
    }

    if (distance < softThreshold) {
      const opacity = (distance - hardThreshold) / (softThreshold - hardThreshold)
      data[index + 3] = Math.max(0, Math.min(255, Math.round(alpha * opacity)))
    }
  }
}
