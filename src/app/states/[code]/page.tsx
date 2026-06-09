import type { Metadata } from 'next'
import { fetchStateStats } from '@/lib/public-data'
import { US_STATES } from '@/lib/supabase'
import StateBoardClient from './StateBoardClient'

export const revalidate = 60

interface PageProps {
  params: { code: string }
}

export function generateStaticParams() {
  return Object.keys(US_STATES).map((code) => ({ code }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const stateCode = params.code.toUpperCase()
  const stateName = US_STATES[stateCode]

  if (!stateName) {
    return { title: 'State boards — Liberty Lift 1776' }
  }

  const stats = await fetchStateStats(stateCode)
  const title = `${stateName} Push-Up Challenge — Liberty Lift 1776`
  const description = stats?.total_pushups
    ? `${stateName} has ${stats.total_pushups.toLocaleString()} push-ups from ${stats.participants} patriots (#${stats.state_rank} nationally). Add yours — 1,776 push-ups in July.`
    : `Put ${stateName} on the national board. 1,776 push-ups in July 2026. Every rep counts for you and your state.`

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default function StateDetailPage() {
  return <StateBoardClient />
}
