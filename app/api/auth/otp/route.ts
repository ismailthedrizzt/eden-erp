import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/auth/otp  →  Verify OTP token
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const auth = supabase.auth as typeof supabase.auth & {
    verifyOtp: (params: unknown) => Promise<any>
  }
  const { type, identifier, token } = await request.json()

  if (!identifier || !token) {
    return NextResponse.json({ error: 'identifier ve token zorunludur.' }, { status: 400 })
  }

  try {
    let result
    if (type === 'email') {
      result = await auth.verifyOtp({ email: identifier, token, type: 'email' })
    } else {
      const phone = identifier.startsWith('+') ? identifier : `+90${identifier.replace(/^0/, '')}`
      result = await auth.verifyOtp({ phone, token, type: 'sms' })
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 401 })
    }

    return NextResponse.json({ user: result.data.user })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
