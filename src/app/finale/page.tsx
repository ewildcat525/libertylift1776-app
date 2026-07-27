import type { Metadata } from 'next'
import FinaleClient from './FinaleClient'
import { siteUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: 'The Hall of Honor — Liberty Lift 1776',
  description:
    'The 2026 Liberty Lift is in the books. Final standings, champions, one-of-a-kind moments, and a thank-you to every patriot who put reps on the board.',
  alternates: { canonical: `${siteUrl}/finale` },
  openGraph: {
    title: 'The Hall of Honor — Liberty Lift 1776',
    description:
      'The 2026 Liberty Lift is in the books. See the final count, the champions, and the moments that made history.',
    url: `${siteUrl}/finale`,
  },
}

export default function FinalePage() {
  return <FinaleClient />
}
