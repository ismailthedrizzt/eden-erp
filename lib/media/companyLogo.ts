export type CompanyLogoOptions = {
  preferredSlotId?: string
  preferThumbnail?: boolean
}

export type CompanyLogoVariants = {
  logoUrl: string
  lightLogoUrl: string
  darkLogoUrl: string
}

const COMPANY_LOGO_SLOT_ORDER = [
  'light_mode_avatar',
  'dark_mode_avatar',
  'document_logo',
  'original_logo',
  'logo_primary',
]

export function extractCompanyLogoUrl(images: unknown, options: CompanyLogoOptions = {}) {
  const rows = Array.isArray(images) ? images : []
  if (!rows.length) return ''

  const preferred = options.preferredSlotId
    ? findImageBySlot(rows, options.preferredSlotId)
    : null
  const fallback = COMPANY_LOGO_SLOT_ORDER
    .map(slotId => findImageBySlot(rows, slotId))
    .find(Boolean)
  const image = preferred || fallback || rows[0]

  return getStoredImageUrl(image, options)
}

export function extractCompanyLogoVariants(
  images: unknown,
  options: CompanyLogoOptions & { fallbackUrl?: string | null } = {}
): CompanyLogoVariants {
  const fallbackUrl = cleanUrl(options.fallbackUrl)
  const lightLogoUrl = extractCompanyLogoUrl(images, {
    preferredSlotId: 'light_mode_avatar',
    preferThumbnail: options.preferThumbnail,
  }) || fallbackUrl
  const darkLogoUrl = extractCompanyLogoUrl(images, {
    preferredSlotId: 'dark_mode_avatar',
    preferThumbnail: options.preferThumbnail,
  }) || lightLogoUrl || fallbackUrl
  const logoUrl = lightLogoUrl || darkLogoUrl || fallbackUrl

  return {
    logoUrl,
    lightLogoUrl: lightLogoUrl || logoUrl,
    darkLogoUrl: darkLogoUrl || logoUrl,
  }
}

export function getStoredImageUrl(image: unknown, options: CompanyLogoOptions = {}) {
  if (!image || typeof image !== 'object') return ''
  const record = image as Record<string, any>
  const thumbnailUrl = cleanUrl(record.thumbnailUrl)
    || cleanUrl(record.thumbnail_url)
    || cleanUrl(record.preview_thumb_url)
    || cleanUrl(record.preview_image_url)
    || cleanUrl(record.variants?.thumbnail?.url)

  if (options.preferThumbnail && thumbnailUrl) return thumbnailUrl

  return cleanUrl(record.url)
    || cleanUrl(record.previewUrl)
    || cleanUrl(record.preview_url)
    || cleanUrl(record.signedUrl)
    || cleanUrl(record.signed_url)
    || thumbnailUrl
    || cleanUrl(record.variants?.preview?.url)
    || ''
}

function findImageBySlot(rows: unknown[], slotId: string) {
  return rows.find((image: any) => image?.slotId === slotId || image?.slot_id === slotId)
}

function cleanUrl(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}
