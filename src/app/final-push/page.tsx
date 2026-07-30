import type { Metadata } from 'next'
import WarRoomClient from './WarRoomClient'
import { siteUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: 'The Final Push — Liberty Lift 1776',
  description:
    'July 31: one day, as many as you can. The live war room for the last day of the 2026 Liberty Lift — the national count, the board, and the clock to the closing bell.',
  alternates: { canonical: `${siteUrl}/final-push` },
  openGraph: {
    title: 'The Final Push — Liberty Lift 1776',
    description:
      'One day. As many as you can. The biggest single-day total on July 31 crowns the Final Push Champion.',
    url: `${siteUrl}/final-push`,
  },
}

export default function FinalPushPage() {
  return <WarRoomClient />
}
