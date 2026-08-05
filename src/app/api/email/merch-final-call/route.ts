// Manual, protected campaign endpoint for the one-time 2026 merch final call.
// A request without the exact confirmation phrase is always a dry run.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { buildMerchFinalCallEmail, sendEmailBatch } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CAMPAIGN_ID = 'merch-final-call-2026'
const SEND_CONFIRMATION = 'SEND_MERCH_FINAL_CALL_2026'
const MAX_RECIPIENTS = 2000

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase admin client is not configured' }, { status: 503 })
  }

  const { data: finishers, error: finisherError } = await supabase
    .from('user_stats')
    .select('user_id')
    .gte('total_pushups', 1776)
    .order('user_id')
    .limit(MAX_RECIPIENTS)

  if (finisherError) {
    console.error('Merch final call finisher query failed:', finisherError)
    return NextResponse.json({ error: 'Could not load campaign recipients' }, { status: 500 })
  }

  const finisherIds = (finishers || []).map((finisher) => finisher.user_id)
  if (finisherIds.length === 0) {
    return NextResponse.json({ ok: true, dryRun: true, eligibleRecipients: 0 })
  }

  const { data: recipients, error: recipientError } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', finisherIds)
    .eq('email_opt_out', false)
    .not('email', 'is', null)
    .is('merch_final_call_emailed_at', null)
    .order('id')
    .limit(MAX_RECIPIENTS)

  if (recipientError) {
    console.error('Merch final call recipient query failed:', recipientError)
    return NextResponse.json({ error: 'Could not load campaign recipients' }, { status: 500 })
  }

  const eligible = recipients || []
  const body = (await request.json().catch(() => ({}))) as { confirm?: string }

  if (body.confirm !== SEND_CONFIRMATION) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      campaign: CAMPAIGN_ID,
      eligibleRecipients: eligible.length,
      confirmationRequired: SEND_CONFIRMATION,
    })
  }

  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ error: 'Email delivery is not configured' }, { status: 503 })
  }

  const { sentKeys } = await sendEmailBatch(
    eligible.map((recipient) => ({
      key: recipient.id,
      to: recipient.email as string,
      ...buildMerchFinalCallEmail(recipient.id),
    })),
    { idempotencyKeyPrefix: CAMPAIGN_ID }
  )

  if (sentKeys.length > 0) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ merch_final_call_emailed_at: new Date().toISOString() })
      .in('id', sentKeys)

    if (updateError) {
      console.error('Merch final call delivery marker update failed:', updateError)
      return NextResponse.json(
        { error: 'Emails were accepted but delivery markers could not be saved', sent: sentKeys.length },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun: false,
    campaign: CAMPAIGN_ID,
    eligibleRecipients: eligible.length,
    sent: sentKeys.length,
  })
}
