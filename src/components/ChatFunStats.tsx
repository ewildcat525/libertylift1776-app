'use client'

import { useEffect, useState } from 'react'
import { createClient, CommunityProgress, US_STATES } from '@/lib/supabase'

interface ChatFunStatsProps {
  // Drop a plain-text summary into the chat composer so the patriot who asked
  // can actually post the stats to the feed. Optional: without it we hide the
  // "Drop in chat" button.
  onDropInChat?: (text: string) => void
}

interface FunStats {
  totalPushups: number
  patriots: number
  statesRepped: number
  topState: string | null
  topStatePushups: number
  messages: number
  salutes: number
  longestStreak: number
  longestStreakName: string | null
  bestDay: number
  bestDayName: string | null
}

// Playful, clearly-approximate conversions. These are "just for fun" framings,
// not precise physiology — labelled as such in the UI so nobody mistakes them
// for exact figures.
const CALORIES_PER_PUSHUP = 0.5 // rough burn per rep
const CALORIES_PER_BURGER = 300 // a respectable cheeseburger
// Average push-up hoists ~64% of bodyweight; at ~170 lb that's ~110 lb/rep.
const POUNDS_PER_PUSHUP = 110
// Statue of Liberty: ~225 tons of copper and steel = 450,000 lb.
const STATUE_OF_LIBERTY_LB = 450000

function StatTile({
  emoji,
  value,
  label,
  sub,
}: {
  emoji: string
  value: string
  label: string
  sub?: string
}) {
  return (
    <div className="bg-white/[0.04] border border-white/10 p-3 text-center">
      <div className="text-xl leading-none mb-1" aria-hidden="true">{emoji}</div>
      <div className="font-bebas text-2xl sm:text-3xl text-white leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-white/50 mt-1">{label}</div>
      {sub && <div className="text-[11px] text-liberty-gold/90 mt-1 leading-tight">{sub}</div>}
    </div>
  )
}

export default function ChatFunStats({ onDropInChat }: ChatFunStatsProps) {
  const [stats, setStats] = useState<FunStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const load = async () => {
      try {
        const [progress, patriots, states, messages, salutes, streakRow, dayRow] =
          await Promise.all([
            supabase.rpc('get_community_progress'),
            supabase.rpc('participant_count'),
            supabase
              .from('state_leaderboard')
              .select('state_code, total_pushups')
              .order('total_pushups', { ascending: false }),
            supabase.from('chat_messages').select('*', { count: 'exact', head: true }),
            supabase
              .from('chat_message_reactions')
              .select('*', { count: 'exact', head: true }),
            supabase
              .from('leaderboard')
              .select('display_name, current_streak')
              .order('current_streak', { ascending: false })
              .limit(1),
            supabase
              .from('leaderboard')
              .select('display_name, best_day')
              .order('best_day', { ascending: false })
              .limit(1),
          ])

        if (cancelled) return

        const community = progress.data as CommunityProgress | null
        const stateRows = (states.data || []) as { state_code: string; total_pushups: number }[]
        const topStreak = (streakRow.data || [])[0] as
          | { display_name: string | null; current_streak: number }
          | undefined
        const topDay = (dayRow.data || [])[0] as
          | { display_name: string | null; best_day: number }
          | undefined

        setStats({
          totalPushups: community?.total_pushups ?? 0,
          patriots: typeof patriots.data === 'number' ? patriots.data : 0,
          statesRepped: stateRows.length,
          topState: stateRows[0]?.state_code ?? null,
          topStatePushups: stateRows[0]?.total_pushups ?? 0,
          messages: messages.count ?? 0,
          salutes: salutes.count ?? 0,
          longestStreak: topStreak?.current_streak ?? 0,
          longestStreakName: topStreak?.display_name ?? null,
          bestDay: topDay?.best_day ?? 0,
          bestDayName: topDay?.display_name ?? null,
        })
      } catch {
        if (!cancelled) setFailed(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="bg-liberty-dark border border-white/15 p-4 mb-3 text-center text-white/40 text-sm">
        Counting the reps...
      </div>
    )
  }

  if (failed || !stats) {
    return (
      <div className="bg-liberty-dark border border-white/15 p-4 mb-3 text-center text-white/40 text-sm">
        Couldn&apos;t tally the stats right now. Try again in a bit.
      </div>
    )
  }

  const burgers = Math.round((stats.totalPushups * CALORIES_PER_PUSHUP) / CALORIES_PER_BURGER)
  const libertyLifts = Math.floor((stats.totalPushups * POUNDS_PER_PUSHUP) / STATUE_OF_LIBERTY_LB)
  const topStateName = stats.topState ? US_STATES[stats.topState] ?? stats.topState : null

  // A compact, feed-ready summary the asker can post. Kept well under the
  // chat's 280-char cap so it always sends.
  const summary =
    `📊 Fun stats: ${stats.totalPushups.toLocaleString()} push-ups pressed by ` +
    `${stats.patriots.toLocaleString()} patriots across ${stats.statesRepped} states. ` +
    `That's ~${burgers.toLocaleString()} cheeseburgers torched 🍔 and Lady Liberty ` +
    `hoisted ${libertyLifts.toLocaleString()}x 🗽. Keep pressing! 🇺🇸`

  return (
    <div className="bg-liberty-dark border border-white/15 p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="font-bebas text-xl text-liberty-gold tracking-wide">
          📊 Fun Stats
        </div>
        <span className="text-[10px] uppercase tracking-[0.12em] text-white/30">
          Live from the front
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <StatTile
          emoji="💪"
          value={stats.totalPushups.toLocaleString()}
          label="Push-ups, together"
        />
        <StatTile
          emoji="🗽"
          value={`${libertyLifts.toLocaleString()}x`}
          label="Statue of Liberty lifts"
          sub="just for fun"
        />
        <StatTile
          emoji="🔥"
          value={burgers.toLocaleString()}
          label="Cheeseburgers torched"
          sub="just for fun"
        />
        <StatTile
          emoji="🎖️"
          value={stats.patriots.toLocaleString()}
          label="Patriots enlisted"
        />
        <StatTile
          emoji="🇺🇸"
          value={String(stats.statesRepped)}
          label="States in the fight"
          sub={topStateName ? `Loudest: ${topStateName}` : undefined}
        />
        <StatTile
          emoji="💬"
          value={stats.messages.toLocaleString()}
          label="Messages fired"
          sub={`${stats.salutes.toLocaleString()} 👍 thrown`}
        />
        {stats.longestStreak > 0 && (
          <StatTile
            emoji="⚡"
            value={`${stats.longestStreak}d`}
            label="Longest streak"
            sub={stats.longestStreakName ? `@${stats.longestStreakName}` : undefined}
          />
        )}
        {stats.bestDay > 0 && (
          <StatTile
            emoji="🏋️"
            value={stats.bestDay.toLocaleString()}
            label="Biggest single day"
            sub={stats.bestDayName ? `@${stats.bestDayName}` : undefined}
          />
        )}
      </div>

      {onDropInChat && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => onDropInChat(summary)}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            Drop in chat →
          </button>
        </div>
      )}
    </div>
  )
}
