import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'

export const runtime = 'nodejs'

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const EMPLOYEE_SCHEMA = {
  type: 'object',
  properties: {
    ad: { type: 'string' },
    soyad: { type: 'string' },
    uyruk: { type: 'string', enum: ['tc', 'yabanci', ''] },
    tc_kimlik: { type: 'string' },
    pasaport_no: { type: 'string' },
    cinsiyet: { type: 'string', enum: ['erkek', 'kadin', ''] },
    dogum_tarihi: { type: 'string' },
    dogum_yeri: { type: 'string' },
    cep_telefonu: { type: 'string' },
    email: { type: 'string' },
    adres: { type: 'string' },
    il: { type: 'string' },
    ilce: { type: 'string' },
    pozisyon: { type: 'string' },
    medeni_durum: { type: 'string', enum: ['bekar', 'evli', ''] },
    egitim_okullari: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          okul_adi: { type: 'string' },
          derece: { type: 'string' },
          bolum: { type: 'string' },
          mezuniyet_tarihi: { type: 'string' },
        },
      },
    },
    yabanci_diller: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dil: { type: 'string' },
          seviye: { type: 'string' },
        },
      },
    },
    sertifikalar: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kurs_adi: { type: 'string' },
          konusu: { type: 'string' },
          veren_kurulus: { type: 'string' },
          belge_tarihi: { type: 'string' },
        },
      },
    },
  },
}

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY tanımlı değil. Ücretsiz Google AI Studio anahtarını Vercel Environment Variables içine ekleyin.' },
        { status: 503 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'CV dosyası bulunamadı.' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'CV çözümleme yalnızca PDF ve DOCX dosyaları için desteklenir.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const text = await extractText(buffer, file.type)

    if (text.trim().length < 40) {
      return NextResponse.json({ error: 'CV metni okunamadı veya çok kısa.' }, { status: 422 })
    }

    const extracted = await extractEmployeeDataWithGemini(text)

    return NextResponse.json({
      data: sanitizeExtractedData(extracted),
      sourceTextLength: text.length,
      model: GEMINI_MODEL,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'CV çözümleme başarısız' },
      { status: 500 }
    )
  }
}

async function extractText(buffer: Buffer, mimeType: string) {
  if (mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    return result.text
  }

  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

async function extractEmployeeDataWithGemini(text: string) {
  const prompt = `
Sen bir IK veri giris yardimcisisin. Asagidaki CV metninden Eden ERP calisan formu alanlarini cikar.

Kurallar:
- Sadece CV metninde acikca bulunan bilgileri doldur.
- Tahmin etme; emin degilsen alani bos string veya bos dizi yap.
- Tarihleri YYYY-MM-DD formatinda yaz. Ay/yil varsa gunu bos birakmak yerine ilgili alani bos birak.
- Telefonu Turkiye icin 0 5xx xxx xx xx formatina yaklastir.
- E-posta adresini kucuk harfle yaz.
- Ad ve soyadi ayir. Tek isimden emin degilsen ad alanina yaz, soyad bos kalsin.
- Cinsiyet sadece metinde acikca geciyorsa erkek/kadin.
- Uyruk TC kimlik veya Turk/Turkiye ibaresiyle acikca anlasiliyorsa tc, aksi halde yabanci veya bos.

CV:
${text.slice(0, 30000)}
`

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(process.env.GEMINI_API_KEY || '')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseJsonSchema: EMPLOYEE_SCHEMA,
      },
    }),
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const message = body.error?.message || `Gemini API hata kodu: ${response.status}`
    throw new Error(message)
  }

  const body = await response.json()
  const textResponse = body.candidates?.[0]?.content?.parts?.[0]?.text

  if (!textResponse) {
    throw new Error('Gemini yanıtı boş döndü.')
  }

  return JSON.parse(textResponse)
}

function sanitizeExtractedData(value: unknown) {
  if (!value || typeof value !== 'object') return {}

  const data = value as Record<string, unknown>
  const clean: Record<string, unknown> = {}

  Object.entries(data).forEach(([key, item]) => {
    if (Array.isArray(item)) {
      const rows = item.filter(row => row && typeof row === 'object')
      if (rows.length > 0) clean[key] = rows
      return
    }

    if (typeof item === 'string' && item.trim()) {
      clean[key] = item.trim()
    }
  })

  if (clean.email && typeof clean.email === 'string') {
    clean.email = clean.email.toLowerCase()
  }

  if (clean.tc_kimlik && typeof clean.tc_kimlik === 'string') {
    clean.tc_kimlik = clean.tc_kimlik.replace(/\D/g, '').slice(0, 11)
  }

  return clean
}
