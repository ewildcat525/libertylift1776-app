// Email cron (see vercel.json). The cron runs daily during July 2026, but it
// only actually sends on these days:
// - July 1: launch announcement to the pre-launch email list
// - Each Monday (Jul 6, 13, 20, 27): weekly pace/streak reminder to
//   participants who haven't logged that day
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { buildLaunchEmail, buildReminderEmail, sendEmailBatch } from '@/lib/email'
import { liveStreak } from '@/lib/dates'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CHALLENGE_TZ = 'America/New_York'
const MAX_REMINDERS_PER_RUN = 2000
// Reminders go out weekly, on this weekday (0 = Sunday, 1 = Monday).
const REMINDER_WEEKDAY = 1

function todayInChallengeTz() {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: CHALLENGE_TZ }).format(new Date())
}

// Weekday (0-6) for a YYYY-MM-DD challenge date. Noon UTC keeps the calendar
// date stable regardless of offset.
function weekdayOf(today: string) {
  return new Date(`${today}T12:00:00Z`).getUTCDay()
}

// July 2026 is EDT (UTC-4) for the entire challenge window, so the
// challenge-timezone day [00:00, 24:00) maps to fixed -04:00 offsets.
function challengeDayBounds(today: string) {
  const nextDay = new Date(Date.parse(`${today}T12:00:00Z`) + 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]
  return { dayStart: `${today}T00:00:00-04:00`, dayEnd: `${nextDay}T00:00:00-04:00` }
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

  const today = todayInChallengeTz()
  if (today < '2026-07-01' || today > '2026-07-31') {
    return NextResponse.json({ skipped: 'outside challenge window', today })
  }

  const dayOfJuly = parseInt(today.split('-')[2], 10)
  const result: Record<string, number> = { launchEmails: 0, reminders: 0 }

  // --- Launch-day blast to registered participants ---
  if (today === '2026-07-01') {
    const { data: recipients } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email_opt_out', false)
      .not('email', 'is', null)
      .is('launch_emailed_at', null)
      .limit(MAX_REMINDERS_PER_RUN)

    if (recipients && recipients.length > 0) {
      const { sentKeys } = await sendEmailBatch(
        recipients.map((p) => ({ key: p.id, to: p.email as string, ...buildLaunchEmail(p.id) }))
      )
      result.launchEmails = sentKeys.length

      if (sentKeys.length > 0) {
        await supabase
          .from('profiles')
          .update({ launch_emailed_at: new Date().toISOString() })
          .in('id', sentKeys)
      }
    }
  }

  // --- Weekly reminders to participants who haven't logged today ---
  // Only send on the configured weekday so participants get one nudge a week.
  if (weekdayOf(today) === REMINDER_WEEKDAY) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, display_name, email_opt_out, last_reminder_at')
      .eq('email_opt_out', false)
      .not('email', 'is', null)
      .limit(MAX_REMINDERS_PER_RUN)

    if (profiles && profiles.length > 0) {
      // Skip anyone already reminded today (idempotent across re-runs).
      const eligible = profiles.filter((p) => {
        if (!p.last_reminder_at) return true
        const lastDate = new Intl.DateTimeFormat('en-CA', { timeZone: CHALLENGE_TZ }).format(
          new Date(p.last_reminder_at)
        )
        return lastDate < today
      })

      const ids = eligible.map((p) => p.id)
      const { dayStart, dayEnd } = challengeDayBounds(today)

      const [{ data: stats }, { data: todayLogs }, { data: pledges }] = await Promise.all([
        supabase.from('user_stats').select('user_id, total_pushups, current_streak, last_log_date').in('user_id', ids),
        supabase
          .from('pushup_logs')
          .select('user_id')
          .gte('logged_at', dayStart)
          .lt('logged_at', dayEnd)
          .in('user_id', ids),
        supabase.from('pledges').select('user_id').eq('is_active', true).in('user_id', ids),
      ])

      const loggedToday = new Set((todayLogs || []).map((l) => l.user_id))
      const statsByUser = new Map((stats || []).map((s) => [s.user_id, s]))
      const pledgedUsers = new Set((pledges || []).map((p) => p.user_id))

      const messages = eligible
        .filter((p) => !loggedToday.has(p.id))
        .map((p) => {
          const s = statsByUser.get(p.id)
          return {
            key: p.id,
            to: p.email as string,
            ...buildReminderEmail({
              profileId: p.id,
              displayName: p.display_name,
              totalPushups: s?.total_pushups || 0,
              currentStreak: liveStreak(s?.current_streak, s?.last_log_date),
              dayOfJuly,
              hasPledge: pledgedUsers.has(p.id),
            }),
          }
        })

      if (messages.length > 0) {
        const { sentKeys } = await sendEmailBatch(messages)
        result.reminders = sentKeys.length

        if (sentKeys.length > 0) {
          await supabase
            .from('profiles')
            .update({ last_reminder_at: new Date().toISOString() })
            .in('id', sentKeys)
        }
      }
    }
  }

  return NextResponse.json({ ok: true, today, ...result })
}
