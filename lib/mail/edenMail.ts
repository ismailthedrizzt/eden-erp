import 'server-only'

const MAIL_API_URL = 'https://apimail.edengrup.com/api/mail/send'

type SendMailParams = {
  to: string | string[]
  subject: string
  html: string
  cc?: string[]
  bcc?: string[]
}

export async function sendEdenMail(params: SendMailParams) {
  const apiKey = process.env.EDEN_MAIL_API_KEY

  if (!apiKey) {
    throw new Error('EDEN_MAIL_API_KEY tanimli degil.')
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
    throw new Error(`Mail API hatasi: ${response.status}${detail ? ` - ${detail}` : ''}`)
  }
}
