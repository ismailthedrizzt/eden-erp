import { NextResponse } from 'next/server'
import mammoth from 'mammoth'
import * as pdfParse from 'pdf-parse'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

type ExtractedProfile = {
  fullname?: string
  nationality?: string
  idNumber?: string
  gender?: string
  birthPlace?: string
  birthDate?: string
  address?: string
  city?: string
  district?: string
  iban?: string
  note?: string
}

function stripMarkdownCodeFence(text: string) {
  const trimmed = text.trim()
  if (!trimmed.startsWith('```')) return trimmed
  return trimmed.replace(/^```[a-zA-Z]*\s*/, '').replace(/```$/, '').trim()
}

function normalizeDate(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const v = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const dot = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (dot) return `${dot[3]}-${dot[2]}-${dot[1]}`
  const slash = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (slash) return `${slash[3]}-${slash[2]}-${slash[1]}`
  return undefined
}

function normalizeNationality(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim().toLowerCase()
  if (!v) return undefined
  if (v.includes('türk') || v === 'tr' || v === 'turkiye' || v === 'türkiye') return 'TR'
  return undefined
}

function normalizeGender(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim().toLowerCase()
  if (['erkek', 'male', 'man'].includes(v)) return 'erkek'
  if (['kadın', 'kadin', 'female', 'woman'].includes(v)) return 'kadin'
  return undefined
}

function parseLlmJson(content: string): Record<string, unknown> | null {
  const raw = stripMarkdownCodeFence(content)
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    return null
  } catch {
    return null
  }
}

async function extractTextFromFile(file: File) {
  const mime = file.type
  const buffer = Buffer.from(await file.arrayBuffer())

  if (mime === 'application/pdf') {
    const parsed = await pdfParse(buffer)
    return parsed.text
  }

  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword'
  ) {
    const parsed = await mammoth.extractRawText({ buffer })
    return parsed.value
  }

  throw new Error('Desteklenmeyen dosya türü')
}

function toProfile(data: Record<string, unknown>): ExtractedProfile {
  return {
    fullname: typeof data.fullname === 'string' ? data.fullname.trim() : undefined,
    nationality: normalizeNationality(data.nationality),
    idNumber: typeof data.idNumber === 'string' ? data.idNumber.trim() : undefined,
    gender: normalizeGender(data.gender),
    birthPlace: typeof data.birthPlace === 'string' ? data.birthPlace.trim() : undefined,
    birthDate: normalizeDate(data.birthDate),
    address: typeof data.address === 'string' ? data.address.trim() : undefined,
    city: typeof data.city === 'string' ? data.city.trim() : undefined,
    district: typeof data.district === 'string' ? data.district.trim() : undefined,
    iban: typeof data.iban === 'string' ? data.iban.replace(/\s+/g, '').toUpperCase() : undefined,
    note: typeof data.note === 'string' ? data.note.trim() : undefined,
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY ayarı bulunamadı.' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'CV dosyası bulunamadı.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Dosya boyutu 10MB üzerinde olamaz.' }, { status: 400 })
    }

    const text = await extractTextFromFile(file)
    if (!text.trim()) {
      return NextResponse.json({ error: 'Dosyadan metin çıkarılamadı.' }, { status: 400 })
    }

    const baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'
    const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

    const prompt = `
Verilen CV metninden sadece aşağıdaki JSON şemasına uygun çıktı üret:
{
  "fullname": "string | boş",
  "nationality": "string | boş",
  "idNumber": "string | boş",
  "gender": "erkek|kadin|boş",
  "birthPlace": "string | boş",
  "birthDate": "YYYY-MM-DD | DD.MM.YYYY | boş",
  "address": "string | boş",
  "city": "string | boş",
  "district": "string | boş",
  "iban": "string | boş",
  "note": "string | boş"
}
Sadece JSON döndür, açıklama ekleme.
CV METNİ:
${text.slice(0, 20000)}
`.trim()

    const llmRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          { role: 'system', content: 'You extract HR profile data from CV text and return strict JSON.' },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!llmRes.ok) {
      const errText = await llmRes.text()
      return NextResponse.json(
        { error: 'LLM servisi hatası', details: errText.slice(0, 500) },
        { status: 502 }
      )
    }

    const completion = await llmRes.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = completion.choices?.[0]?.message?.content ?? ''
    const parsed = parseLlmJson(content)

    if (!parsed) {
      return NextResponse.json({ error: 'LLM çıktısı JSON formatında değil.' }, { status: 422 })
    }

    return NextResponse.json({ data: toProfile(parsed) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bilinmeyen hata'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
