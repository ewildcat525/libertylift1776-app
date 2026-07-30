// Server-only email helpers for the reminder cron and unsubscribe flow.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { siteUrl } from '@/lib/site'
import { CHARITY_DONATE_URLS } from '@/lib/charities'

export function getSiteUrl() {
  return siteUrl
}

// Unsubscribe links are signed with CRON_SECRET so they can't be forged.
export function unsubscribeToken(scope: 'profile' | 'subscriber', id: string) {
  const secret = process.env.CRON_SECRET
  if (!secret) return null
  return createHmac('sha256', secret).update(`${scope}:${id}`).digest('hex')
}

export function verifyUnsubscribeToken(
  scope: 'profile' | 'subscriber',
  id: string,
  token: string
) {
  const expected = unsubscribeToken(scope, id)
  if (!expected || token.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
}

export function unsubscribeUrl(scope: 'profile' | 'subscriber', id: string) {
  const token = unsubscribeToken(scope, id)
  if (!token) return siteUrl
  return `${siteUrl}/api/email/unsubscribe?scope=${scope}&id=${encodeURIComponent(id)}&token=${token}`
}

interface EmailShellOptions {
  heading: string
  body: string
  ctaLabel: string
  ctaUrl: string
  unsubscribe: string
}

function emailShell({ heading, body, ctaLabel, ctaUrl, unsubscribe }: EmailShellOptions) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#0A0A0F;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0F;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#181824;border:1px solid rgba(255,255,255,0.18);">
        <tr><td style="border-top:4px solid #B22234;padding:32px 32px 8px;text-align:center;">
          <div style="color:#C9A227;font-size:12px;letter-spacing:4px;font-weight:bold;">LIBERTY LIFT / 1776</div>
        </td></tr>
        <tr><td style="padding:16px 32px 0;text-align:center;">
          <h1 style="color:#FFFFFF;font-size:28px;margin:0 0 16px;">${heading}</h1>
        </td></tr>
        <tr><td style="padding:0 32px;text-align:center;color:#E6E6EC;font-size:15px;line-height:1.6;">
          ${body}
        </td></tr>
        <tr><td style="padding:28px 32px 36px;text-align:center;">
          <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(180deg,#FFD700,#B8860B);color:#0A0A0F;font-weight:bold;text-decoration:none;padding:14px 36px;font-size:15px;">${ctaLabel}</a>
        </td></tr>
        <tr><td style="padding:0 32px 28px;text-align:center;color:#9A9AA5;font-size:11px;line-height:1.6;">
          1,776 push-ups. 31 days. No spectators.<br/>
          <a href="${unsubscribe}" style="color:#9A9AA5;">Unsubscribe from these emails</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function buildLaunchEmail(profileId: string) {
  return {
    subject: 'It begins today — log in and start your 1,776. 🇺🇸',
    html: emailShell({
      heading: 'Day 1. Everyone starts at zero.',
      body: `July 1 is here and the challenge is live. Every counter is back to zero —
        any reps logged before today have been cleared, so it's a clean slate for all 50 states.
        <br/><br/>Log in and put your first push-ups on the board. 1,776 by July 31 — that's 58 a day.`,
      ctaLabel: 'Log in and start logging',
      ctaUrl: `${siteUrl}/login`,
      unsubscribe: unsubscribeUrl('profile', profileId),
    }),
  }
}

interface ReminderArgs {
  profileId: string
  displayName: string | null
  totalPushups: number
  currentStreak: number
  dayOfJuly: number
  hasPledge: boolean
}

// Secondary nudge shown only to participants who haven't set up a pledge yet.
function pledgeNudge(hasPledge: boolean) {
  if (hasPledge) return ''
  return `<br/><br/><span style="color:#9A9AA5;font-size:13px;">Make your reps count for more — pledge a few cents per push-up to the Wounded Warrior Project, donated at month's end. <a href="${siteUrl}/pledge" style="color:#C9A227;">Set up a pledge →</a></span>`
}

export function buildReminderEmail({
  profileId,
  displayName,
  totalPushups,
  currentStreak,
  dayOfJuly,
  hasPledge,
}: ReminderArgs) {
  const name = displayName || 'Patriot'
  const expected = Math.round((dayOfJuly / 31) * 1776)
  const remaining = Math.max(0, 1776 - totalPushups)
  const nudge = pledgeNudge(hasPledge)

  if (totalPushups >= 1776) {
    return {
      subject: 'You did it. 1,776 push-ups. 🎆',
      html: emailShell({
        heading: `Liberty achieved, ${name}.`,
        body: `All 1,776 push-ups are in the books. Your state thanks you.
          <br/><br/>One last mission: share your board and bring in reinforcements before July 31.${nudge}`,
        ctaLabel: 'Share your victory',
        ctaUrl: `${siteUrl}/dashboard`,
        unsubscribe: unsubscribeUrl('profile', profileId),
      }),
    }
  }

  const behind = totalPushups < expected
  const streakLine =
    currentStreak > 1
      ? `Your ${currentStreak}-day streak is on the line — one set today keeps it alive.`
      : 'Start a streak today. Even 10 reps count.'

  return {
    subject: behind
      ? `Day ${dayOfJuly}: ${remaining.toLocaleString()} push-ups to go — time to move`
      : `Day ${dayOfJuly}: you're ahead of pace. Keep it that way.`,
    html: emailShell({
      heading: behind ? `Your state needs you, ${name}.` : `Ahead of pace, ${name}.`,
      body: `You've logged <strong style="color:#FFD700;">${totalPushups.toLocaleString()}</strong> of 1,776.
        Pace target for day ${dayOfJuly} is ${expected.toLocaleString()}.
        <br/><br/>${streakLine}${nudge}`,
      ctaLabel: 'Log today’s push-ups',
      ctaUrl: `${siteUrl}/dashboard`,
      unsubscribe: unsubscribeUrl('profile', profileId),
    }),
  }
}

interface FinalPushArgs {
  profileId: string
  displayName: string | null
  totalPushups: number
  // 30 = eve-of announcement, 31 = day-of ("today") for stragglers.
  dayOfJuly: number
}

// One-time blast announcing the Final Push: a last-day blitz on July 31 —
// most reps logged that day crowns the Final Push Champion in the Hall of
// Honor. Sent July 30, with day-of copy for anyone a failed batch left to
// July 31.
export function buildFinalPushEmail({ profileId, displayName, totalPushups, dayOfJuly }: FinalPushArgs) {
  const name = displayName || 'Patriot'
  const isToday = dayOfJuly >= 31
  const remaining = Math.max(0, 1776 - totalPushups)

  const hook =
    totalPushups >= 1776
      ? `You've already pressed all 1,776 — now put an exclamation point on it and defend your state's total.`
      : remaining <= 5000
        ? `You're ${remaining.toLocaleString()} away from 1,776 — a monster final day gets you there and onto the finishers' roll.`
        : `Every rep still counts for your state and the national total — go out swinging.`

  return {
    subject: isToday
      ? 'TODAY: the Final Push — one day, as many as you can 🔥'
      : 'Tomorrow: the Final Push — one day, as many as you can 🔥',
    html: emailShell({
      heading: isToday ? `The Final Push is ON, ${name}.` : `One last battle, ${name}.`,
      body: `${isToday ? 'Today, July 31' : 'Tomorrow, July 31'} — the last day of the contest — is
        <strong>the Final Push</strong>: log as many push-ups as you can in one day.
        The biggest single-day total on the 31st crowns the
        <strong style="color:#FFD700;">Final Push Champion</strong>, honored forever in the
        Hall of Honor. The war room runs live all day: the national count, the board moving
        under you, every rep in the country landing on the tape, and a clock to the closing bell.
        <br/><br/>${hook}
        <br/><br/><span style="color:#9A9AA5;font-size:13px;">House rules: reps must be logged on July 31, daily cap is 5,000, and pace yourself — form counts, ego doesn't.</span>`,
      ctaLabel: isToday ? 'Enter the war room' : 'See the standard to beat',
      ctaUrl: `${siteUrl}/final-push`,
      unsubscribe: unsubscribeUrl('profile', profileId),
    }),
  }
}

interface FinaleArgs {
  profileId: string
  displayName: string | null
  totalPushups: number
  bestDay: number
  longestStreak: number
  hasPledge: boolean
  // Final nationwide count, shared by every message in the blast.
  communityTotal: number
}

// One-time blast on August 2, once the books are closed: personal after-action
// stats, the final national count, and the Hall of Honor. Finishers get the
// merch call to action; pledgers get the fulfillment nudge.
export function buildFinaleEmail({
  profileId,
  displayName,
  totalPushups,
  bestDay,
  longestStreak,
  hasPledge,
  communityTotal,
}: FinaleArgs) {
  const name = displayName || 'Patriot'
  const finisher = totalPushups >= 1776

  const statsLine =
    totalPushups > 0
      ? `Your campaign: <strong style="color:#FFD700;">${totalPushups.toLocaleString()}</strong> push-ups,
        best day ${bestDay.toLocaleString()}, longest streak ${longestStreak} ${longestStreak === 1 ? 'day' : 'days'}.
        Every rep is in that number above.`
      : `You enlisted, and the door's open for 2027 — same month, same 1,776.`

  const shirtLine = finisher
    ? `<br/><br/>You finished all 1,776, which means the <strong>Reps for the Republic tee</strong> is
      unlocked for you — made in USA, screen printed, $44 all-in.
      <a href="${siteUrl}/merch" style="color:#C9A227;">Claim your tee →</a>`
    : ''

  const pledgeLine = hasPledge
    ? `<br/><br/>One mission left: you made an honor-system pledge to the Wounded Warrior Project.
      Now's the time to make good.
      <a href="${CHARITY_DONATE_URLS.wounded_warrior}" style="color:#C9A227;">Fulfill your pledge →</a>`
    : ''

  return {
    subject: finisher
      ? 'The books are closed — and you finished all 1,776. 🇺🇸'
      : `The books are closed: ${communityTotal.toLocaleString()} push-ups, together 🎆`,
    html: emailShell({
      heading: finisher ? `Liberty achieved, ${name}.` : `It's in the books, ${name}.`,
      body: `America pressed <strong style="color:#FFD700;">${communityTotal.toLocaleString()}</strong> push-ups
        in 31 days. The Hall of Honor is open: champions, the state battle, and the
        one-of-a-kind moments — replayable any time.
        <br/><br/>${statsLine}${shirtLine}${pledgeLine}
        <br/><br/>Thank you for answering the call. See you in July 2027.`,
      ctaLabel: 'Enter the Hall of Honor',
      ctaUrl: `${siteUrl}/finale`,
      unsubscribe: unsubscribeUrl('profile', profileId),
    }),
  }
}

// Resend batch endpoint accepts up to 100 messages per call. Each message
// carries a caller-supplied key (profile/subscriber id); only keys from
// chunks Resend accepted are returned, so failed sends get retried on the
// next run instead of being marked as delivered.
export async function sendEmailBatch(
  messages: { key: string; to: string; subject: string; html: string }[]
) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  const sentKeys: string[] = []
  if (!apiKey || !from || messages.length === 0) return { sentKeys }

  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100)

    const response = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        chunk.map((m) => ({ from, to: [m.to], subject: m.subject, html: m.html }))
      ),
    })

    if (response.ok) {
      sentKeys.push(...chunk.map((m) => m.key))
    } else {
      console.error('Resend batch failed:', response.status, await response.text())
    }
  }

  return { sentKeys }
}
