// Server-only email helpers for the reminder cron and unsubscribe flow.
import { createHmac, timingSafeEqual } from 'node:crypto'

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

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
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#11111A;border:1px solid rgba(255,255,255,0.12);">
        <tr><td style="border-top:4px solid #B22234;padding:32px 32px 8px;text-align:center;">
          <div style="color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:4px;">LIBERTY LIFT / 1776</div>
        </td></tr>
        <tr><td style="padding:16px 32px 0;text-align:center;">
          <h1 style="color:#FFFFFF;font-size:28px;margin:0 0 16px;">${heading}</h1>
        </td></tr>
        <tr><td style="padding:0 32px;text-align:center;color:rgba(255,255,255,0.75);font-size:15px;line-height:1.6;">
          ${body}
        </td></tr>
        <tr><td style="padding:28px 32px 36px;text-align:center;">
          <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(180deg,#FFD700,#B8860B);color:#0A0A0F;font-weight:bold;text-decoration:none;padding:14px 36px;font-size:15px;">${ctaLabel}</a>
        </td></tr>
        <tr><td style="padding:0 32px 28px;text-align:center;color:rgba(255,255,255,0.35);font-size:11px;line-height:1.6;">
          1,776 push-ups. 31 days. No spectators.<br/>
          <a href="${unsubscribe}" style="color:rgba(255,255,255,0.35);">Unsubscribe from these emails</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function buildLaunchEmail(subscriberId: string) {
  return {
    subject: 'It begins today: 1,776 push-ups. 31 days. 🇺🇸',
    html: emailShell({
      heading: 'The challenge is live.',
      body: `July 1 is here. 1,776 push-ups between now and July 31 — that's 58 a day.
        <br/><br/>Claim your handle, join your state, and get your first reps on the board today.`,
      ctaLabel: 'Join the challenge',
      ctaUrl: `${siteUrl}/signup`,
      unsubscribe: unsubscribeUrl('subscriber', subscriberId),
    }),
  }
}

interface ReminderArgs {
  profileId: string
  displayName: string | null
  totalPushups: number
  currentStreak: number
  dayOfJuly: number
}

export function buildReminderEmail({
  profileId,
  displayName,
  totalPushups,
  currentStreak,
  dayOfJuly,
}: ReminderArgs) {
  const name = displayName || 'Patriot'
  const expected = Math.round((dayOfJuly / 31) * 1776)
  const remaining = Math.max(0, 1776 - totalPushups)

  if (totalPushups >= 1776) {
    return {
      subject: 'You did it. 1,776 push-ups. 🎆',
      html: emailShell({
        heading: `Liberty achieved, ${name}.`,
        body: `All 1,776 push-ups are in the books. Your state thanks you.
          <br/><br/>One last mission: share your board and bring in reinforcements before July 31.`,
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
        <br/><br/>${streakLine}`,
      ctaLabel: 'Log today’s push-ups',
      ctaUrl: `${siteUrl}/dashboard`,
      unsubscribe: unsubscribeUrl('profile', profileId),
    }),
  }
}

// Resend batch endpoint accepts up to 100 messages per call.
export async function sendEmailBatch(
  messages: { to: string; subject: string; html: string }[]
) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from || messages.length === 0) return { sent: 0 }

  let sent = 0
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100).map((m) => ({
      from,
      to: [m.to],
      subject: m.subject,
      html: m.html,
    }))

    const response = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chunk),
    })

    if (response.ok) {
      sent += chunk.length
    } else {
      console.error('Resend batch failed:', response.status, await response.text())
    }
  }

  return { sent }
}
