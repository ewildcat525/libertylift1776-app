// Protected one-recipient delivery check for the Resend production configuration.
import { NextRequest, NextResponse } from 'next/server'
import {
  buildFinaleEmail,
  buildFinalPushEmail,
  buildMerchFinalCallEmail,
  sendEmailBatch,
} from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const recipient = process.env.EMAIL_TEST_RECIPIENT
  if (!recipient || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ error: 'Email test is not configured' }, { status: 503 })
  }

  const type = request.nextUrl.searchParams.get('type')
  const testProfileId = '00000000-0000-0000-0000-000000000000'
  let message

  switch (type) {
    case 'merch-final-call':
      message = buildMerchFinalCallEmail(testProfileId)
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

  return NextResponse.json({ ok: true, recipient })
}
