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

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const scope = params.get('scope')
  const id = params.get('id')
  const token = params.get('token')

  if ((scope !== 'profile' && scope !== 'subscriber') || !id || !token) {
    return htmlResponse('That unsubscribe link is invalid.', 400)
  }

  if (!verifyUnsubscribeToken(scope, id, token)) {
    return htmlResponse('That unsubscribe link is invalid or expired.', 400)
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return htmlResponse('Service unavailable. Please try again later.', 503)
  }

  if (scope === 'profile') {
    await supabase.from('profiles').update({ email_opt_out: true }).eq('id', id)
  } else {
    await supabase.from('email_subscribers').delete().eq('id', id)
  }

  return htmlResponse('You are unsubscribed. No more emails from us.')
}
