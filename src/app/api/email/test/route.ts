// Protected one-recipient delivery check for the Resend production configuration.
import { NextRequest, NextResponse } from 'next/server'
import {
  buildFinaleEmail,
  buildFinalPushEmail,
  buildMerchCampaignEmail,
  sendEmailBatch,
  type OutboundEmail,
} from '@/lib/email'

export const dynamic = 'force-dynamic'

// Deliberately strict: this endpoint can put a real send in front of a real
// inbox, so an override has to look like a single ordinary address.
const EMAIL_PATTERN = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // `to` lets an operator preview a template somewhere other than the
  // configured test inbox; EMAIL_TEST_RECIPIENT stays the default.
  const override = request.nextUrl.searchParams.get('to')
  if (override && !EMAIL_PATTERN.test(override)) {
    return NextResponse.json({ error: 'Invalid `to` address' }, { status: 400 })
  }

  const recipient = override || process.env.EMAIL_TEST_RECIPIENT
  if (!recipient || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ error: 'Email test is not configured' }, { status: 503 })
  }

  const type = request.nextUrl.searchParams.get('type')
  const testProfileId = '00000000-0000-0000-0000-000000000000'
  let message: Omit<OutboundEmail, 'key' | 'to'>

  switch (type) {
    case 'merch-final-call':
    case 'merch-last-hours':
      message = buildMerchCampaignEmail({
        profileId: testProfileId,
        displayName: 'Kevin',
        totalPushups: 1842,
        variant: type === 'merch-last-hours' ? 'last-hours' : 'final-call',
      })
      break
    case 'final-push':
      message = buildFinalPushEmail({
        profileId: testProfileId,
        displayName: 'Kevin',
        totalPushups: 1100,
        dayOfJuly: 30,
      })
      break
    case 'finale':
      message = buildFinaleEmail({
        profileId: testProfileId,
        displayName: 'Kevin',
        totalPushups: 1776,
        bestDay: 140,
        longestStreak: 21,
        hasPledge: true,
        communityTotal: 252757,
      })
      break
    default:
      message = {
        subject: 'Liberty Lift 1776 email delivery test',
        html: '<p>Your Liberty Lift 1776 email delivery test succeeded.</p>',
      }
  }

  const { sentKeys } = await sendEmailBatch([
    {
      key: 'delivery-test',
      to: recipient,
      ...message,
    },
  ])

  if (sentKeys.length !== 1) {
    return NextResponse.json({ error: 'Resend did not accept the test email' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, recipient, type: type || 'delivery-test' })
}
