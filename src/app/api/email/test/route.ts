// Protected one-recipient delivery check for the Resend production configuration.
import { NextRequest, NextResponse } from 'next/server'
import { sendEmailBatch } from '@/lib/email'

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

  const { sentKeys } = await sendEmailBatch([
    {
      key: 'delivery-test',
      to: recipient,
      subject: 'Liberty Lift 1776 email delivery test',
      html: '<p>Your Liberty Lift 1776 email delivery test succeeded.</p>',
    },
  ])

  if (sentKeys.length !== 1) {
    return NextResponse.json({ error: 'Resend did not accept the test email' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, recipient })
}
