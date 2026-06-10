import type { Metadata } from 'next'
import JoinClient from './JoinClient'

const title = 'You have been challenged — Liberty Lift 1776'
const description =
  'A friend challenged you to 1,776 push-ups in July. Join their contest, log your reps, and put your state on the board.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description },
  twitter: { card: 'summary_large_image', title, description },
}

export default function ContestInvitePage() {
  return <JoinClient />
}
