'use client'

import ShareProgress from '@/components/ShareProgress'
import { liveStreak } from '@/lib/dates'
import type { UserStats } from '@/lib/supabase'

interface RecruitCardProps {
  handle: string
  stateCode: string | null
  stats: UserStats | null
  recruitCount: number
}

// Share links credit the sharer as recruiter (see lib/referral.ts).
export default function RecruitCard({ handle, stateCode, stats, recruitCount }: RecruitCardProps) {
  return (
    <div className="web-dashboard-detail card p-8 mb-8 text-center">
      <h2 className="font-bebas text-3xl text-liberty-red mb-2">
        BRING YOUR PEOPLE
      </h2>
      <p className="text-white/60 mb-2">
        Every rep counts twice — once for you, once for your state. Share
        your board and recruit your crew.
      </p>
      <p className="text-white/50 text-sm mb-5">
        Patriots recruited so far:{' '}
        <span className="text-liberty-gold font-bold">{recruitCount}</span>
      </p>
      <ShareProgress
        handle={handle}
        totalPushups={stats?.total_pushups || 0}
        currentStreak={liveStreak(stats?.current_streak, stats?.last_log_date)}
        stateCode={stateCode}
        context="dashboard"
        showInviteLink
      />
      <a href="/spread-the-word" className="inline-block mt-4 text-sm text-white/50 hover:text-white">
        Need ammo? Grab ready-made captions →
      </a>
    </div>
  )
}
