// Email cron (see vercel.json). The cron runs daily year-round, but it only
// sends inside a season's email window, and only on these days (all dates
// come from the season row, see lib/email-schedule.ts):
// - The first day: launch announcement to every opted-in patriot
// - Each Monday of the challenge month: weekly pace/streak reminder to
//   participants who haven't logged that day
// - The day before the Final Push (day-of retry on the day itself): one-time
//   announcement of the last-day blitz
// - The day after the grace day (through two more days of retry headroom):
//   one-time finale blast with final stats and the Hall of Honor
//
// Every send is recorded in email_campaign_sends under a per-season key, so a
// re-run never mails anyone twice and next season starts with a clean slate.
// A season still in 'interest' has not been opened by an operator, so nothing
// is sent for it.
import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  buildFinaleEmail,
  buildFinalPushEmail,
  buildLaunchEmail,
  buildReminderEmail,
  sendEmailBatch,
  type OutboundEmail,
} from '@/lib/email'
import { liveStreak } from '@/lib/dates'
import { SEASONS } from '@/lib/seasons'
import { campaignKey, dayBounds, dayInTimeZone, emailDay } from '@/lib/email-schedule'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Recipients mailed per campaign per run. The cron re-runs daily and the
// ledger remembers who was mailed, so anyone past this picks up next run.
const MAX_SENDS_PER_RUN = 2000
// Profiles read per page while looking for recipients.
const PAGE_SIZE = 500
// IDs per .in() filter. Filters travel in the URL, so a 2,000-UUID list
// would overflow the request line; 100 UUIDs is about 4 KB.
const IN_CHUNK = 100

type Admin = SupabaseClient
type Recipient = { id: string; email: string; display_name: string | null }

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

// Run a query per chunk of ids and concatenate the rows.
async function selectIn<Row>(
  ids: string[],
  query: (chunk: string[]) => PromiseLike<{ data: Row[] | null; error: unknown }>
): Promise<Row[]> {
  const results = await Promise.all(chunks(ids, IN_CHUNK).map(query))
  const failed = results.find((result) => result.error)
  if (failed) throw failed.error
  return results.flatMap((result) => result.data ?? [])
}

// Opted-in profiles not yet in the ledger for `campaign`, walking the whole
// table in id order so nobody is starved by a fixed LIMIT.
async function pendingRecipients(supabase: Admin, campaign: string): Promise<Recipient[]> {
  const pending: Recipient[] = []
  let cursor: string | null = null

  while (pending.length < MAX_SENDS_PER_RUN) {
    let query = supabase
      .from('profiles')
      .select('id, email, display_name')
      .eq('email_opt_out', false)
      .not('email', 'is', null)
      .order('id')
      .limit(PAGE_SIZE)
    if (cursor) query = query.gt('id', cursor)

    const { data: page, error } = await query
    if (error) throw error
    if (!page || page.length === 0) break

    const ids = page.map((p) => p.id as string)
    const sent = await selectIn<{ user_id: string }>(ids, (chunk) =>
      supabase.from('email_campaign_sends').select('user_id').eq('campaign', campaign).in('user_id', chunk)
    )
    const alreadySent = new Set(sent.map((row) => row.user_id))
    for (const p of page) {
      if (!alreadySent.has(p.id)) pending.push(p as Recipient)
    }

    if (page.length < PAGE_SIZE) break
    cursor = ids[ids.length - 1]
  }

  return pending.slice(0, MAX_SENDS_PER_RUN)
}

async function recordSends(supabase: Admin, campaign: string, userIds: string[]) {
  for (const chunk of chunks(userIds, 500)) {
    const { error } = await supabase
      .from('email_campaign_sends')
      .upsert(chunk.map((user_id) => ({ campaign, user_id })), {
        onConflict: 'campaign,user_id',
        ignoreDuplicates: true,
      })
    if (error) console.error(`Could not record ${campaign} sends:`, error)
  }
}

async function sendCampaign(
  supabase: Admin,
  campaign: string,
  build: (recipients: Recipient[]) => Promise<OutboundEmail[]>
): Promise<number> {
  const recipients = await pendingRecipients(supabase, campaign)
  if (recipients.length === 0) return 0

  const messages = await build(recipients)
  if (messages.length === 0) return 0

  // The campaign key also makes Resend drop an identical batch retried
  // within its 24h idempotency window.
  const { sentKeys } = await sendEmailBatch(messages, { idempotencyKeyPrefix: campaign })
  if (sentKeys.length > 0) await recordSends(supabase, campaign, sentKeys)
  return sentKeys.length
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  if (!supabase || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ skipped: 'email pipeline not configured' })
  }

  // Every season so far runs on the same clock; pick the day with it, then
  // let the season that day belongs to drive everything else.
  const today = dayInTimeZone(new Date(), SEASONS[0].timeZone)
  const due = emailDay(today)
  if (!due) {
    return NextResponse.json({ skipped: 'outside challenge window', today })
  }
  const { season, dayOfChallenge } = due

  const { data: seasonRow, error: seasonError } = await supabase
    .from('challenge_seasons')
    .select('status')
    .eq('year', season.year)
    .maybeSingle()
  if (seasonError) {
    console.error('Season lookup failed:', seasonError)
    return NextResponse.json({ error: 'Could not load season' }, { status: 500 })
  }
  if (!seasonRow || seasonRow.status === 'interest') {
    return NextResponse.json({ skipped: 'season not opened', today, season: season.year })
  }

  const result: Record<string, number> = {
    launchEmails: 0,
    reminders: 0,
    finalPushEmails: 0,
    finaleEmails: 0,
  }

  try {
    // --- Launch-day blast ---
    if (due.launch) {
      result.launchEmails = await sendCampaign(
        supabase,
        campaignKey('launch', season, today),
        async (recipients) =>
          recipients.map((p) => ({ key: p.id, to: p.email, ...buildLaunchEmail(p.id) }))
      )
    }

    // --- Weekly reminders to participants who haven't logged today ---
    if (due.reminder) {
      result.reminders = await sendCampaign(
        supabase,
        campaignKey('reminder', season, today),
        async (recipients) => {
          const ids = recipients.map((p) => p.id)
          const { dayStart, dayEnd } = dayBounds(today, season.timeZone)

          const [stats, todayLogs, pledges] = await Promise.all([
            selectIn<{ user_id: string; total_pushups: number; current_streak: number; last_log_date: string | null }>(
              ids,
              (chunk) =>
                supabase
                  .from('user_stats')
                  .select('user_id, total_pushups, current_streak, last_log_date')
                  .in('user_id', chunk)
            ),
            selectIn<{ user_id: string }>(ids, (chunk) =>
              supabase
                .from('pushup_logs')
                .select('user_id')
                .gte('logged_at', dayStart)
                .lt('logged_at', dayEnd)
                .in('user_id', chunk)
            ),
            selectIn<{ user_id: string }>(ids, (chunk) =>
              supabase.from('pledges').select('user_id').eq('is_active', true).in('user_id', chunk)
            ),
          ])

          const loggedToday = new Set(todayLogs.map((l) => l.user_id))
          const statsByUser = new Map(stats.map((s) => [s.user_id, s]))
          const pledgedUsers = new Set(pledges.map((p) => p.user_id))

          return recipients
            .filter((p) => !loggedToday.has(p.id))
            .map((p) => {
              const s = statsByUser.get(p.id)
              return {
                key: p.id,
                to: p.email,
                ...buildReminderEmail({
                  profileId: p.id,
                  displayName: p.display_name,
                  totalPushups: s?.total_pushups || 0,
                  currentStreak: liveStreak(s?.current_streak, s?.last_log_date),
                  dayOfJuly: dayOfChallenge,
                  hasPledge: pledgedUsers.has(p.id),
                }),
              }
            })
        }
      )
    }

    // --- One-time Final Push announcement (the eve, retry on the day) ---
    // Anyone missed on the eve gets day-of copy (13:00 UTC = 9am ET).
    if (due.finalPush) {
      result.finalPushEmails = await sendCampaign(
        supabase,
        campaignKey('final-push', season, today),
        async (recipients) => {
          const stats = await selectIn<{ user_id: string; total_pushups: number }>(
            recipients.map((p) => p.id),
            (chunk) => supabase.from('user_stats').select('user_id, total_pushups').in('user_id', chunk)
          )
          const statsByUser = new Map(stats.map((s) => [s.user_id, s]))

          return recipients.map((p) => ({
            key: p.id,
            to: p.email,
            ...buildFinalPushEmail({
              profileId: p.id,
              displayName: p.display_name,
              totalPushups: statsByUser.get(p.id)?.total_pushups || 0,
              dayOfJuly: dayOfChallenge,
            }),
          }))
        }
      )
    }

    // --- One-time finale blast once the books are closed ---
    if (due.finale) {
      result.finaleEmails = await sendCampaign(
        supabase,
        campaignKey('finale', season, today),
        async (recipients) => {
          const ids = recipients.map((p) => p.id)
          const [stats, pledges, { data: community }] = await Promise.all([
            selectIn<{ user_id: string; total_pushups: number; best_day: number; longest_streak: number }>(
              ids,
              (chunk) =>
                supabase
                  .from('user_stats')
                  .select('user_id, total_pushups, best_day, longest_streak')
                  .in('user_id', chunk)
            ),
            selectIn<{ user_id: string }>(ids, (chunk) =>
              supabase.from('pledges').select('user_id').eq('is_active', true).in('user_id', chunk)
            ),
            supabase.rpc('get_community_progress'),
          ])

          const statsByUser = new Map(stats.map((s) => [s.user_id, s]))
          const pledgedUsers = new Set(pledges.map((p) => p.user_id))
          const communityTotal = (community as { total_pushups?: number } | null)?.total_pushups || 0

          return recipients.map((p) => {
            const s = statsByUser.get(p.id)
            return {
              key: p.id,
              to: p.email,
              ...buildFinaleEmail({
                profileId: p.id,
                displayName: p.display_name,
                totalPushups: s?.total_pushups || 0,
                bestDay: s?.best_day || 0,
                longestStreak: s?.longest_streak || 0,
                hasPledge: pledgedUsers.has(p.id),
                communityTotal,
              }),
            }
          })
        }
      )
    }
  } catch (error) {
    console.error('Email cron failed:', error)
    return NextResponse.json({ error: 'Email cron failed', today, ...result }, { status: 500 })
  }

  return NextResponse.json({ ok: true, today, season: season.year, ...result })
}
