// Server-only email helpers for the reminder cron and unsubscribe flow.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { siteUrl } from '@/lib/site'
import { CHARITY_DONATE_URLS } from '@/lib/charities'
import { CHALLENGE_TOTAL } from '@/lib/dates'
import { merchConfig, merchCost, merchTotal, formatUsd } from '@/lib/merch'

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
        <br/><br/><span style="color:#9A9AA5;font-size:13px;">House rules: reps must be dated July 31 and logged before the closing bell —
        midnight in Hawaii, the last time zone standing, which is 6:00am ET on August 1. Daily cap is 5,000. Pace
        yourself — form counts, ego doesn't.</span>`,
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

// One-time, manually triggered merch campaign for 2026 finishers. This is
// kept out of the reminder cron intentionally: the protected campaign
// endpoint requires an explicit confirmation phrase before it will send.
//
// Every date, price and claim below comes from src/lib/merch.ts — the same
// source the /merch page renders from, so the email and the page can never
// disagree about when ordering closes.
export type MerchCampaignVariant = 'final-call' | 'last-hours'

interface MerchCampaignArgs {
  profileId: string
  displayName?: string | null
  totalPushups?: number | null
  variant?: MerchCampaignVariant
}

const VARIANT_COPY = {
  'final-call': {
    subject: 'Final call: the finisher shirt disappears Friday',
    preheader: `Order by ${merchConfig.finalCall.ordersCloseLabel} — this shirt is never offered again.`,
    badge: 'FINAL CALL',
    headline: 'The finisher shirt disappears Friday.',
    opener: 'This is the last time you can claim it.',
  },
  'last-hours': {
    subject: 'Hours left: the finisher shirt comes down tonight',
    preheader: `Ordering closes ${merchConfig.finalCall.ordersCloseLabel}. After that it's gone for good.`,
    badge: 'HOURS LEFT',
    headline: 'Tonight the order page comes down.',
    opener: 'You earned this shirt. There are hours left to claim it.',
  },
} as const

// Inbox images must live on a public, stable origin. Preview deployments can
// be protected by Vercel, which leaves email clients showing a broken image.
const EMAIL_ASSET_ORIGIN = 'https://libertylift1776.com'

// Display names are user-chosen, so they never go into markup unescaped.
function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildMerchCampaignEmail({
  profileId,
  displayName,
  totalPushups,
  variant = 'final-call',
}: MerchCampaignArgs) {
  const copy = VARIANT_COPY[variant]
  const checkoutUrl = merchConfig.stripePaymentLink || `${siteUrl}/merch`
  const unsubscribe = unsubscribeUrl('profile', profileId)
  const { product, finalCall } = merchConfig
  const price = formatUsd(merchTotal)
  const margin = formatUsd(merchTotal - merchCost)
  const goal = CHALLENGE_TOTAL.toLocaleString()
  const name = displayName ? escapeHtml(displayName) : 'Patriot'
  const sizes = product.sizes.join(' · ')

  // Personal proof of work. Only finishers are ever in this audience, so the
  // fallback still asserts the threshold rather than softening it.
  const earnedLine =
    typeof totalPushups === 'number' && totalPushups > 0
      ? `${name} — you logged <strong style="color:#FFFFFF;">${totalPushups.toLocaleString()} push-ups</strong> in 31 days. This is the shirt for that.`
      : `${name} — you finished all ${goal}. This is the shirt for that.`

  const ctaButton = (label: string) =>
    `<a href="${checkoutUrl}" style="display:inline-block;background:#C9A227;color:#090D16;text-decoration:none;font-size:16px;font-weight:bold;padding:16px 30px;border-radius:3px;">${label}</a>`

  const text = [
    copy.subject,
    '',
    `${displayName || 'Patriot'} — you finished all ${goal} push-ups. This is the shirt for that.`,
    '',
    `The Reps for the Republic finisher tee is sold only to people who logged all ${goal} reps. It is not a store item and it will not be offered again.`,
    '',
    `Orders close: ${finalCall.ordersCloseLabel}`,
    `First batch arrives ${finalCall.firstBatchLabel}; orders in available sizes ship that week. If your size sells through, it goes into the final production run.`,
    '',
    `Price: ${price} all-in — shipping included, nothing added at checkout.`,
    `It costs us ${formatUsd(merchCost)} to make and ship. We keep ${margin}.`,
    `Sizes ${sizes}. Pick yours at checkout.`,
    '',
    `Order: ${checkoutUrl}`,
    '',
    'Already ordered? You are all set — thank you.',
    `Unsubscribe: ${unsubscribe}`,
  ].join('\n')

  return {
    subject: copy.subject,
    listUnsubscribeUrl: unsubscribe,
    text,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${copy.subject}</title>
  <style>
    @media only screen and (max-width:480px) {
      .merch-email-header { padding:24px 20px 12px !important; }
      .merch-email-headline { font-size:28px !important; line-height:1.12 !important; }
      .merch-email-image { padding:14px 16px 4px !important; }
      .merch-email-copy { padding-left:22px !important; padding-right:22px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#070B14;color:#F5F2E8;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${copy.preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#070B14;">
    <tr><td align="center" style="padding:28px 14px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#101725;border:1px solid #31394A;">
        <tr><td style="height:6px;background:#B22234;"></td></tr>
        <tr><td class="merch-email-header" align="center" style="padding:28px 28px 14px;">
          <div style="color:#C9A227;font-size:12px;letter-spacing:4px;font-weight:bold;">LIBERTY LIFT / 1776</div>
          <div style="margin-top:16px;color:#FFFFFF;font-size:12px;letter-spacing:3px;font-weight:bold;">${copy.badge}</div>
          <h1 class="merch-email-headline" style="margin:10px 0 0;color:#FFFFFF;font-size:34px;line-height:1.1;">${copy.headline}</h1>
        </td></tr>

        <tr><td class="merch-email-image" align="center" style="padding:16px 24px 4px;">
          <a href="${checkoutUrl}" style="text-decoration:none;">
            <img src="${EMAIL_ASSET_ORIGIN}/merch/reps-tee-both.jpg" alt="Front and back of the Reps for the Republic finisher tee" width="540" style="display:block;width:100%;max-width:540px;height:auto;border:1px solid #31394A;" />
          </a>
        </td></tr>

        <tr><td class="merch-email-copy" style="padding:18px 38px 6px;color:#E6E6EC;font-size:16px;line-height:1.65;">
          <p style="margin:0 0 16px;">${earnedLine} ${copy.opener}</p>
          <p style="margin:0 0 20px;">The <strong style="color:#FFFFFF;">Reps for the Republic</strong> tee is sold only to people who logged all ${goal}. It has never been on open sale, it will not become a store item, and <strong style="color:#FFFFFF;">it will not be offered again.</strong></p>
        </td></tr>

        <tr><td style="padding:0 38px 8px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #B22234;background:#0B101B;">
            <tr><td align="center" style="padding:20px 14px;">
              <div style="color:#C9A227;font-size:11px;letter-spacing:2px;font-weight:bold;">ORDERS CLOSE</div>
              <div style="margin-top:6px;color:#FFFFFF;font-size:23px;font-weight:bold;">${finalCall.ordersCloseLabel}</div>
            </td></tr>
          </table>
        </td></tr>

        <tr><td align="center" style="padding:22px 38px 6px;">
          ${ctaButton('ORDER NOW &amp; PICK YOUR SIZE →')}
          <div style="margin-top:10px;color:#9A9AA5;font-size:12px;">${price} all-in · shipping included · sizes ${sizes}</div>
        </td></tr>

        <tr><td style="padding:20px 38px 6px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #31394A;background:#0B101B;">
            <tr><td style="padding:18px 20px;color:#E6E6EC;font-size:14px;line-height:1.6;">
              <div style="color:#C9A227;font-size:11px;letter-spacing:2px;font-weight:bold;margin-bottom:8px;">WHERE YOUR ${price} GOES</div>
              ${merchConfig.pricing.breakdown
                .map(
                  (item) =>
                    `<div style="padding:3px 0;">${item.label} <span style="float:right;color:#FFFFFF;font-weight:bold;">${formatUsd(item.amount)}</span></div>`
                )
                .join('')}
              <div style="border-top:1px solid #31394A;margin-top:10px;padding-top:10px;color:#9A9AA5;">We keep ${margin} on a ${price} shirt. This isn't a fundraiser — it's a trophy at cost.</div>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:18px 38px 24px;color:#E6E6EC;font-size:16px;line-height:1.65;">
          <p style="margin:0 0 16px;">Our first batch arrives ${finalCall.firstBatchLabel}. Orders in available sizes ship that week. If your size sells through the first batch, we'll include it in the final production run and ship it as soon as it's ready.</p>
          <p style="margin:0;">After the deadline the order page comes down, and we produce only what was ordered.</p>
        </td></tr>

        <tr><td align="center" style="padding:0 38px 30px;">
          ${ctaButton(`CLAIM YOUR SHIRT — ${price} →`)}
        </td></tr>

        <tr><td align="center" style="padding:22px 32px;background:#0B101B;border-top:1px solid #31394A;">
          <div style="color:#FFFFFF;font-size:15px;font-weight:bold;">${goal} push-ups. One month. One shirt you had to earn.</div>
          <div style="margin-top:14px;color:#9A9AA5;font-size:12px;line-height:1.5;">Already ordered? You're all set. Thank you—and wear it with pride.</div>
          <div style="margin-top:14px;color:#9A9AA5;font-size:11px;"><a href="${unsubscribe}" style="color:#9A9AA5;">Unsubscribe from these emails</a></div>
        </td></tr>
        <tr><td style="height:6px;background:#244A86;"></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}

// Resend batch endpoint accepts up to 100 messages per call. Each message
// carries a caller-supplied key (profile/subscriber id); only keys from
// chunks Resend accepted are returned, so failed sends get retried on the
// next run instead of being marked as delivered.
export interface OutboundEmail {
  key: string
  to: string
  subject: string
  html: string
  text?: string
  // One-click unsubscribe target. Bulk senders need this in the headers, not
  // just in the body, to stay out of Gmail/Yahoo spam folders.
  listUnsubscribeUrl?: string
}

// Resend rejects an idempotency key when it is reused with a different
// payload. Hash the exact serialized request body so recipient filtering,
// unsubscribe changes, or chunk re-indexing can never create that collision.
// An identical retry within Resend's 24h window still produces the same key.
function idempotencyKeyFor(prefix: string, body: string) {
  const payloadHash = createHash('sha256').update(body).digest('hex')
  return `${prefix}/${payloadHash}`
}

export async function sendEmailBatch(
  messages: OutboundEmail[],
  options: { idempotencyKeyPrefix?: string } = {}
) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  const sentKeys: string[] = []
  const failedKeys: string[] = []
  if (!apiKey || !from || messages.length === 0) return { sentKeys, failedKeys }

  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100)
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }

    const body = JSON.stringify(
      chunk.map((m) => ({
        from,
        to: [m.to],
        subject: m.subject,
        html: m.html,
        ...(m.text ? { text: m.text } : {}),
        ...(m.listUnsubscribeUrl
          ? {
              headers: {
                'List-Unsubscribe': `<${m.listUnsubscribeUrl}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
              },
            }
          : {}),
      }))
    )

    if (options.idempotencyKeyPrefix) {
      headers['Idempotency-Key'] = idempotencyKeyFor(options.idempotencyKeyPrefix, body)
    }

    // Rate limits and transient 5xx would otherwise drop a whole 100-person
    // chunk. The idempotency key makes retrying the same chunk safe.
    let accepted = false
    for (let attempt = 0; attempt < 3 && !accepted; attempt++) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt))

      const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers,
        body,
      })

      if (response.ok) {
        accepted = true
        break
      }

      console.error('Resend batch failed:', response.status, await response.text())
      if (response.status !== 429 && response.status < 500) break
    }

    const chunkKeys = chunk.map((message) => message.key)
    if (accepted) sentKeys.push(...chunkKeys)
    else failedKeys.push(...chunkKeys)
  }

  return { sentKeys, failedKeys }
}
