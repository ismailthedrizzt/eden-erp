import { NextRequest, NextResponse } from 'next/server'
import { exportThemeArtifact } from '@/lib/theme/themeExport'
import type { ThemeExportFormat } from '@/lib/theme/themeSchema'

export const runtime = 'nodejs'

const EXPORT_FORMATS = new Set<ThemeExportFormat>(['eden', 'figma', 'css', 'readme'])

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const themeKey = searchParams.get('themeKey') || 'hikmet'
  const format = (searchParams.get('format') || 'eden') as ThemeExportFormat

  if (!EXPORT_FORMATS.has(format)) {
    return NextResponse.json(
      { error: 'Desteklenmeyen tema export formati.', code: 'UNSUPPORTED_THEME_EXPORT_FORMAT' },
      { status: 400 }
    )
  }

  const artifact = exportThemeArtifact(themeKey, format)
  if (!artifact) {
    return NextResponse.json(
      { error: 'Tema bulunamadi.', code: 'THEME_NOT_FOUND' },
      { status: 404 }
    )
  }

  return new NextResponse(artifact.body, {
    headers: {
      'Content-Type': artifact.contentType,
      'Content-Disposition': `attachment; filename="${artifact.filename}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
