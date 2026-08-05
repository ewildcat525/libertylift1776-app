// Manual, protected campaign endpoint for the one-time 2026 merch sends.
// A request without the exact confirmation phrase is always a dry run.
//
// Audience is finishers only, always: the shirt is unlocked by logging all
// 1,776 push-ups, so the campaign never widens past people who did.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { buildMerchCampaignEmail, sendEmailBatch, type MerchCampaignVariant } from '@/lib/email'
import { CHALLENGE_TOTAL } from '@/lib/dates'
import { merchConfig, ordersOpen } from '@/lib/merch'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Each touch is its own campaign key so the ledger keeps them apart and a
// second send needs no migration — only a different `campaign` parameter.
const CAMPAIGNS: Record<string, { confirm: string; variant: MerchCampaignVariant }> = {
  'merch-final-call-2026': { confirm: 'SEND_MERCH_FINAL_CALL_2026', variant: 'final-call' },
  'merch-last-hours-2026': { confirm: 'SEND_MERCH_LAST_HOURS_2026', variant: 'last-hours' },
}
const DEFAULT_CAMPAIGN = 'merch-final-call-2026'
const MAX_RECIPIENTS = 2000

interface FinisherRow {
  id: string
  email: string | null
  display_name: string | null
  user_stats: { total_pushups: number } | { total_pushups: number }[] | null
}

function totalPushupsOf(row: FinisherRow) {
  const stats = Array.isArray(row.user_stats) ? row.user_stats[0] : row.user_stats
  return stats?.total_pushups ?? null
}

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const campaignId = request.nextUrl.searchParams.get('campaign') || DEFAULT_CAMPAIGN
  const campaign = CAMPAIGNS[campaignId]
  if (!campaign) {
    return NextResponse.json(
      { error: 'Unknown campaign', known: Object.keys(CAMPAIGNS) },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase admin client is not configured' }, { status: 503 })
  }

  // One query: finishers who can still be emailed. The inner join keeps the
  // threshold in the database instead of shipping thousands of ids back as a
  // second `in(...)` filter.
  const { data: finishers, error: finisherError } = await supabase
    .from('profiles')
    .select('id, email, display_name, user_stats!inner(total_pushups)')
    .eq('email_opt_out', false)
    .not('email', 'is', null)
    .gte('user_stats.total_pushups', CHALLENGE_TOTAL)
    .order('id')
    .limit(MAX_RECIPIENTS + 1)

  if (finisherError) {
    console.error('Merch campaign finisher query failed:', finisherError)
    return NextResponse.json({ error: 'Could not load campaign recipients' }, { status: 500 })
  }

  const rows = (finishers || []) as FinisherRow[]
  const truncated = rows.length > MAX_RECIPIENTS

  const { data: alreadySent, error: ledgerError } = await supabase
    .from('email_campaign_sends')
    .select('user_id')
    .eq('campaign', campaignId)

  if (ledgerError) {
    console.error('Merch campaign ledger query failed:', ledgerError)
    return NextResponse.json({ error: 'Could not load campaign recipients' }, { status: 500 })
  }

  const sentAlready = new Set((alreadySent || []).map((row) => row.user_id as string))
  const eligible = rows.slice(0, MAX_RECIPIENTS).filter((row) => !sentAlready.has(row.id))

  const body = (await request.json().catch(() => ({}))) as { confirm?: string }
  const open = ordersOpen()

  if (body.confirm !== campaign.confirm) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      campaign: campaignId,
      eligibleRecipients: eligible.length,
      alreadyEmailed: sentAlready.size,
      finishersFound: rows.slice(0, MAX_RECIPIENTS).length,
      truncated,
      ordersOpen: open,
      ordersCloseAt: merchConfig.finalCall.ordersCloseAt,
      confirmationRequired: campaign.confirm,
    })
  }

  // Never mail a deadline that has already passed — the copy promises a
  // window that the buy button no longer honours.
  if (!open) {
    return NextResponse.json(
      {
        error: 'Ordering has closed; refusing to send a campaign advertising a passed deadline',
        ordersCloseAt: merchConfig.finalCall.ordersCloseAt,
      },
      { status: 409 }
    )
  }

  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ error: 'Email delivery is not configured' }, { status: 503 })
  }

  const { sentKeys } = await sendEmailBatch(
    eligible.map((recipient) => ({
      key: recipient.id,
      to: recipient.email as string,
      ...buildMerchCampaignEmail({
        profileId: recipient.id,
        displayName: recipient.display_name,
        totalPushups: totalPushupsOf(recipient),
        variant: campaign.variant,
      }),
    })),
    { idempotencyKeyPrefix: campaignId }
  )

  if (sentKeys.length > 0) {
    const { error: ledgerWriteError } = await supabase
      .from('email_campaign_sends')
      .upsert(
        sentKeys.map((userId) => ({ campaign: campaignId, user_id: userId })),
        { onConflict: 'campaign,user_id', ignoreDuplicates: true }
      )

    if (ledgerWriteError) {
      console.error('Merch campaign ledger write failed:', ledgerWriteError)
      return NextResponse.json(
        {
          error: 'Emails were accepted but delivery markers could not be saved',
          sent: sentKeys.length,
          // Retrying is safe: Resend replays the same idempotency key for 24h
          // instead of sending again.
          retrySafe: true,
        },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun: false,
    campaign: campaignId,
    eligibleRecipients: eligible.length,
    sent: sentKeys.length,
    truncated,
  })
}
