import { NextRequest, NextResponse } from 'next/server'
import { isReleaseEnvironment } from '@/lib/release/environment'
import { createThemeImportPreview } from '@/lib/theme/themeImport'
import { MAX_THEME_JSON_BYTES } from '@/lib/theme/themeSchema'

export const runtime = 'nodejs'
const THEME_CONTRACT_TARGET = 'local-only:/api/theme/import'

export async function POST(request: NextRequest) {
  if (!isThemeImportAllowed()) {
    return NextResponse.json(
      {
        error: 'Tema importu yalniz development/internal veya yetkilendirilmis admin ortaminda aciktir.',
        code: 'THEME_IMPORT_DISABLED',
      },
      { status: 403 }
    )
  }

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return NextResponse.json(
      { error: 'Tema importu sadece application/json kabul eder.', code: 'JSON_ONLY' },
      { status: 415 }
    )
  }

  const bodyText = await request.text()
  if (new TextEncoder().encode(bodyText).length > MAX_THEME_JSON_BYTES) {
    return NextResponse.json(
      { error: 'Tema JSON dosyasi cok buyuk.', code: 'THEME_JSON_TOO_LARGE' },
      { status: 413 }
    )
  }

  const preview = createThemeImportPreview(bodyText)
  const status = preview.status === 'rejected' ? 400 : 200

  return NextResponse.json(
    {
      data: preview,
      message: preview.status === 'review'
        ? 'Tema inceleme durumunda dogrulandi. Lifecycle aktivasyonu olmadan aktif olmaz.'
        : 'Tema paketi validation veya guvenlik kontrollerinden gecemedi.',
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Backend-Contract-Target': THEME_CONTRACT_TARGET,
      },
    }
  )
}

function isThemeImportAllowed() {
  if (process.env.EDEN_THEME_IMPORT_ENABLED === 'true') return true
  if (process.env.EDEN_LOGIN_DISABLED === 'true') return true
  return !isReleaseEnvironment()
}
