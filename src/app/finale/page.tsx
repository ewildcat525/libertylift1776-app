import type { Metadata } from 'next'
import FinaleClient from './FinaleClient'
import { loadHallData, type HallData } from './hallData'
import { isHallOpen, seasonForDisplay } from '@/lib/dates'
import { createPublicClient } from '@/lib/supabase-public'
import { siteUrl } from '@/lib/site'

// The standings are frozen once the Hall opens, so a minute-old copy is as
// good as a live one and the page arrives already rendered.
export const revalidate = 60

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

async function hallData(): Promise<HallData | null> {
  if (!isHallOpen()) return null
  const supabase = createPublicClient(revalidate)
  if (!supabase) return null
  try {
    return await loadHallData(supabase, seasonForDisplay().goal)
  } catch (error) {
    // The client fetches for itself when the server could not.
    console.error('Hall of Honor prefetch failed:', error)
    return null
  }
}

export default async function FinalePage() {
  return <FinaleClient initialData={await hallData()} />
}
