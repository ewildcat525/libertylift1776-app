// Reconciles queued sends against Resend's record of what actually happened.
//
// sendEmailBatch can only observe that Resend *queued* a message. This route
// closes the loop: it asks Resend for each message's final event, marks the
// ledger row delivered or failed, and clears the matching profiles column for
// failures so the reminder cron picks those recipients back up on its next
// run. Nothing here sends email.
//
// Modes:
//   POST /api/email/reconcile              resolve ledger rows that have a
//                                          resend_id (the normal path)
//   POST /api/email/reconcile?mode=backfill  discover ids for sends made
//                                          before the ledger existed, by
//                                          listing recent Resend messages and
//                                          matching on recipient address
//
// Both accept ?dry=1 to report what would change without writing, and
// ?limit=N to bound a run. Safe to call repeatedly — `remaining` in the
// response says whether more work is left.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { EMAIL_TYPE_COLUMNS, type EmailType } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Resend's default rate limit is modest, so requests are spaced rather than
// fired in parallel. A run stops cleanly on 429 and leaves the rest queued.
const REQUEST_SPACING_MS = 250
const DEFAULT_LIMIT = 120

// Terminal failure events. Anything not listed here and not 'delivered' is
// still in flight, so the row stays queued for a later run.
const FAILURE_EVENTS = new Set(['bounced', 'failed', 'canceled', 'cancelled', 'complained'])

interface ResendEmail {
  id?: string
  to?: string | string[]
  created_at?: string
  last_event?: string
  status?: string
}

function eventOf(email: ResendEmail) {
  return (email.last_event || email.status || '').toLowerCase()
}

function classify(event: string): 'delivered' | 'failed' | 'queued' {
  if (event === 'delivered') return 'delivered'
  if (FAILURE_EVENTS.has(event)) return 'failed'
  return 'queued'
}

function firstRecipient(to: ResendEmail['to']) {
  const value = Array.isArray(to) ? to[0] : to
  return (value || '').toLowerCase()
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const supabase = createAdminClient()
  if (!apiKey || !supabase) {
    return NextResponse.json({ error: 'Email pipeline not configured' }, { status: 503 })
  }

  const dryRun = request.nextUrl.searchParams.get('dry') === '1'
  const limit = Math.min(
    Math.max(parseInt(request.nextUrl.searchParams.get('limit') || '', 10) || DEFAULT_LIMIT, 1),
    500
  )
  const mode = request.nextUrl.searchParams.get('mode') === 'backfill' ? 'backfill' : 'resolve'

  const authHeader = { Authorization: `Bearer ${apiKey}` }

  // --- Backfill: recover ids for sends that predate the ledger ---
  // Walks GET /emails newest-first and writes a ledger row for every message
  // whose recipient matches a profile, so the resolve path can act on them.
  if (mode === 'backfill') {
    const discovered: ResendEmail[] = []
    let cursor: string | undefined
    let rateLimited = false

    while (discovered.length < limit) {
      const url = new URL('https://api.resend.com/emails')
      url.searchParams.set('limit', String(Math.min(100, limit - discovered.length)))
      if (cursor) url.searchParams.set('after', cursor)

      const response = await fetch(url, { headers: authHeader })
      if (response.status === 429) {
        rateLimited = true
        break
      }
      if (!response.ok) {
        return NextResponse.json(
          { error: 'Resend list failed', status: response.status, body: (await response.text()).slice(0, 300) },
          { status: 502 }
        )
      }

      const page = (await response.json()) as { data?: ResendEmail[] }
      const rows = page.data || []
      if (rows.length === 0) break

      discovered.push(...rows)
      cursor = rows[rows.length - 1]?.id
      if (!cursor) break
      await sleep(REQUEST_SPACING_MS)
    }

    // Map recipients back to profiles so the ledger carries the profile id.
    const addresses = Array.from(
      new Set(discovered.map((e) => firstRecipient(e.to)).filter(Boolean))
    )
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('email', addresses)
    const profileByEmail = new Map(
      (profiles || []).map((p) => [String(p.email).toLowerCase(), p.id as string])
    )

    const emailType = (request.nextUrl.searchParams.get('type') || 'final_push') as EmailType
    const rows = discovered
      .filter((e) => e.id && profileByEmail.has(firstRecipient(e.to)))
      .map((e) => {
        const event = eventOf(e)
        return {
          email_type: emailType,
          recipient_key: profileByEmail.get(firstRecipient(e.to)) as string,
          recipient_email: firstRecipient(e.to),
          resend_id: e.id as string,
          status: classify(event),
          last_event: event || null,
          reconciled_at: classify(event) === 'queued' ? null : new Date().toISOString(),
        }
      })

    const summary = {
      mode,
      dryRun,
      listed: discovered.length,
      matchedProfiles: rows.length,
      delivered: rows.filter((r) => r.status === 'delivered').length,
      failed: rows.filter((r) => r.status === 'failed').length,
      stillQueued: rows.filter((r) => r.status === 'queued').length,
      rateLimited,
    }

    if (dryRun || rows.length === 0) return NextResponse.json({ ok: true, ...summary })

    // resend_id is uniquely indexed, so re-running backfill is idempotent.
    const { error } = await supabase
      .from('email_sends')
      .upsert(rows, { onConflict: 'resend_id', ignoreDuplicates: false })
    if (error) {
      return NextResponse.json({ error: 'Ledger upsert failed', detail: error.message }, { status: 500 })
    }

    const cleared = await clearFailedFlags(supabase, rows)
    return NextResponse.json({ ok: true, ...summary, flagsCleared: cleared })
  }

  // --- Resolve: ask Resend for the final event on each queued message ---
  const { data: pending, error: pendingError } = await supabase
    .from('email_sends')
    .select('id, email_type, recipient_key, recipient_email, resend_id')
    .eq('status', 'queued')
    .not('resend_id', 'is', null)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (pendingError) {
    return NextResponse.json({ error: pendingError.message }, { status: 500 })
  }
  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, mode, checked: 0, remaining: 0 })
  }

  const resolved: {
    email_type: EmailType
    recipient_key: string
    recipient_email: string
    status: 'delivered' | 'failed'
    last_event: string
    ledgerId: string
  }[] = []
  let checked = 0
  let rateLimited = false

  for (const row of pending) {
    const response = await fetch(`https://api.resend.com/emails/${row.resend_id}`, {
      headers: authHeader,
    })
    if (response.status === 429) {
      rateLimited = true
      break
    }
    checked += 1

    if (!response.ok) {
      console.error('Resend retrieve failed:', row.resend_id, response.status)
      await sleep(REQUEST_SPACING_MS)
      continue
    }

    const email = (await response.json()) as ResendEmail
    const event = eventOf(email)
    const status = classify(event)
    if (status !== 'queued') {
      resolved.push({
        email_type: row.email_type as EmailType,
        recipient_key: row.recipient_key as string,
        recipient_email: row.recipient_email as string,
        status,
        last_event: event,
        ledgerId: row.id as string,
      })
    }
    await sleep(REQUEST_SPACING_MS)
  }

  const summary = {
    mode,
    dryRun,
    checked,
    delivered: resolved.filter((r) => r.status === 'delivered').length,
    failed: resolved.filter((r) => r.status === 'failed').length,
    stillInFlight: checked - resolved.length,
    rateLimited,
  }

  if (dryRun || resolved.length === 0) return NextResponse.json({ ok: true, ...summary })

  const reconciledAt = new Date().toISOString()
  for (const row of resolved) {
    await supabase
      .from('email_sends')
      .update({ status: row.status, last_event: row.last_event, reconciled_at: reconciledAt })
      .eq('id', row.ledgerId)
  }

  const cleared = await clearFailedFlags(supabase, resolved)

  const { count } = await supabase
    .from('email_sends')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'queued')
    .not('resend_id', 'is', null)

  return NextResponse.json({ ok: true, ...summary, flagsCleared: cleared, remaining: count ?? 0 })
}

// Clearing the blast's profiles column is what actually re-opens a failed
// recipient: the cron selects on `<column> is null`, so nulling it puts them
// back in the next run's pool. Grouped by column to keep this to one update
// per blast type.
async function clearFailedFlags(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  rows: { email_type: string; recipient_key: string; status: string }[]
) {
  const byColumn = new Map<string, string[]>()
  for (const row of rows) {
    if (row.status !== 'failed') continue
    const column = EMAIL_TYPE_COLUMNS[row.email_type as EmailType]
    if (!column) continue
    byColumn.set(column, [...(byColumn.get(column) || []), row.recipient_key])
  }

  const cleared: Record<string, number> = {}
  for (const [column, ids] of Array.from(byColumn.entries())) {
    const { error } = await supabase
      .from('profiles')
      .update({ [column]: null })
      .in('id', ids)
    if (error) {
      console.error(`Failed clearing ${column}:`, error.message)
      continue
    }
    cleared[column] = ids.length
  }
  return cleared
}
