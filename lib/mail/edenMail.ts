import 'server-only'

const MAIL_API_URL = 'https://apimail.edengrup.com/api/mail/send'

type SendMailParams = {
  to: string | string[]
  subject: string
  html: string
  cc?: string[]
  bcc?: string[]
}

export class EdenMailError extends Error {
  status?: number
  detail?: string

  constructor(message: string, status?: number, detail?: string) {
    super(message)
    this.name = 'EdenMailError'
    this.status = status
    this.detail = detail
  }
}

export async function sendEdenMail(params: SendMailParams) {
  const apiKey = process.env.EDEN_MAIL_API_KEY

  if (!apiKey) {
    throw new EdenMailError('EDEN_MAIL_API_KEY tanimli degil.')
  }

  const response = await fetch(MAIL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new EdenMailError('Mail API istegi basarisiz.', response.status, detail)
  }
}
