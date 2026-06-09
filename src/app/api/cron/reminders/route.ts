// Daily reminder cron (see vercel.json). Runs once a day during July 2026:
// - July 1: launch announcement to the pre-launch email list
// - July 1-31: pace/streak reminder to participants who haven't logged today
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { buildLaunchEmail, buildReminderEmail, sendEmailBatch } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CHALLENGE_TZ = 'America/New_York'
const MAX_REMINDERS_PER_RUN = 2000

function todayInChallengeTz() {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: CHALLENGE_TZ }).format(new Date())
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

  // --- Launch-day blast to the pre-launch email list ---
  if (today === '2026-07-01') {
    const { data: subscribers } = await supabase
      .from('email_subscribers')
      .select('id, email')
      .is('notified_at', null)
      .limit(MAX_REMINDERS_PER_RUN)

    if (subscribers && subscribers.length > 0) {
      const { sent } = await sendEmailBatch(
        subscribers.map((s) => ({ to: s.email, ...buildLaunchEmail(s.id) }))
      )
      result.launchEmails = sent

      await supabase
        .from('email_subscribers')
        .update({ notified_at: new Date().toISOString() })
        .in('id', subscribers.map((s) => s.id))
    }
  }

  // --- Daily reminders to participants who haven't logged today ---
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

    const [{ data: stats }, { data: todayLogs }] = await Promise.all([
      supabase.from('user_stats').select('user_id, total_pushups, current_streak').in('user_id', ids),
      supabase
        .from('pushup_logs')
        .select('user_id')
        .gte('logged_at', `${today}T00:00:00`)
        .in('user_id', ids),
    ])

    const loggedToday = new Set((todayLogs || []).map((l) => l.user_id))
    const statsByUser = new Map((stats || []).map((s) => [s.user_id, s]))

    const messages = eligible
      .filter((p) => !loggedToday.has(p.id))
      .map((p) => {
        const s = statsByUser.get(p.id)
        return {
          to: p.email as string,
          profileId: p.id,
          ...buildReminderEmail({
            profileId: p.id,
            displayName: p.display_name,
            totalPushups: s?.total_pushups || 0,
            currentStreak: s?.current_streak || 0,
            dayOfJuly,
          }),
        }
      })

    if (messages.length > 0) {
      const { sent } = await sendEmailBatch(messages)
      result.reminders = sent

      await supabase
        .from('profiles')
        .update({ last_reminder_at: new Date().toISOString() })
        .in('id', messages.map((m) => m.profileId))
    }
  }

  return NextResponse.json({ ok: true, today, ...result })
}
