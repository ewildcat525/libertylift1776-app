// One-click unsubscribe target used in every email we send.
// Links are HMAC-signed (see src/lib/email.ts) so they can't be forged.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { verifyUnsubscribeToken } from '@/lib/email'

export const dynamic = 'force-dynamic'

function htmlResponse(message: string, status = 200) {
  return new NextResponse(
    `<!DOCTYPE html><html><body style="background:#0A0A0F;color:#EBE7DC;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;">
      <div><div style="letter-spacing:4px;font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:16px;">LIBERTY LIFT / 1776</div>
      <h1 style="font-size:24px;">${message}</h1></div>
    </body></html>`,
    { status, headers: { 'Content-Type': 'text/html' } }
  )
}

type UnsubscribeOutcome =
  | { ok: true }
  | { ok: false; message: string; status: number }

async function unsubscribe(request: NextRequest): Promise<UnsubscribeOutcome> {
  const params = request.nextUrl.searchParams
  const scope = params.get('scope')
  const id = params.get('id')
  const token = params.get('token')

  if ((scope !== 'profile' && scope !== 'subscriber') || !id || !token) {
    return { ok: false, message: 'That unsubscribe link is invalid.', status: 400 }
  }

  if (!verifyUnsubscribeToken(scope, id, token)) {
    return { ok: false, message: 'That unsubscribe link is invalid or expired.', status: 400 }
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return { ok: false, message: 'Service unavailable. Please try again later.', status: 503 }
  }

  if (scope === 'profile') {
    await supabase.from('profiles').update({ email_opt_out: true }).eq('id', id)
  } else {
    await supabase.from('email_subscribers').delete().eq('id', id)
  }

  return { ok: true }
}

export async function GET(request: NextRequest) {
  const result = await unsubscribe(request)
  if (!result.ok) return htmlResponse(result.message, result.status)
  return htmlResponse('You are unsubscribed. No more emails from us.')
}

// RFC 8058 one-click unsubscribe. Gmail and Yahoo bulk-sender rules expect the
// List-Unsubscribe header to point at a URL that honours a POST with no user
// interaction, so this must stay a real mutation and not a confirmation page.
export async function POST(request: NextRequest) {
  const result = await unsubscribe(request)
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status })
  }
  return NextResponse.json({ ok: true })
}
