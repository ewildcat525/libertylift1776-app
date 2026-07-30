'use client'

// The Final Push: a one-day blitz on July 31 — most reps logged on the last
// day of the contest takes the crown and a permanent spot in the Hall of
// Honor. Three looks, keyed to the viewer's local calendar day:
// - hype (during July, before the 31st): announce the blitz with a countdown
// - live (July 31): the day's board, refreshed as the viewer logs
// - results (August 1, the grace day): final-day podium while books close
// From August 2 the finale page owns the story, so the banner retires.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, US_STATES } from '@/lib/supabase'
import { FINAL_PUSH_DATE, FinalPushPhase, finalPushPhase, localDateString } from '@/lib/dates'

export interface FinalPushRow {
  id: string
  display_name: string | null
  state_code: string | null
  final_day_pushups: number
  final_push_rank: number
}

interface FinalPushBannerProps {
  userId?: string | null
  // Bump to refetch (e.g. the user's total after logging) so the board moves
  // the moment their reps land.
  refreshKey?: number
  className?: string
}

type Mode = 'hype' | 'live' | 'results'

export default function FinalPushBanner({ userId, refreshKey, className = '' }: FinalPushBannerProps) {
  // Resolved after mount so the prerendered HTML (no clock) matches the
  // first client render.
  const [today, setToday] = useState<string | null>(null)
  const [phase, setPhase] = useState<FinalPushPhase | null>(null)
  const [board, setBoard] = useState<FinalPushRow[]>([])
  const [myRow, setMyRow] = useState<FinalPushRow | null>(null)
  const supabase = createClient()

  useEffect(() => {
    setToday(localDateString())
    setPhase(finalPushPhase())
  }, [])

  // Keyed to the same phase the war room uses, so the two never disagree —
  // the bell is a national instant, not the viewer's local midnight, which
  // leaves a stateside patriot still live in the small hours of August 1.
  const mode: Mode | null =
    phase === null || today === null
      ? null
      : phase === 'before'
        ? today >= '2026-07-01'
          ? 'hype'
          : null
        : phase === 'live'
          ? 'live'
          : phase === 'results'
            ? 'results'
            : null

  useEffect(() => {
    if (mode !== 'live' && mode !== 'results') return
    supabase
      .from('final_push_board')
      .select('*')
      .order('final_push_rank', { ascending: true })
      .limit(10)
      .then(({ data }) => {
        const rows = (data as FinalPushRow[]) || []
        setBoard(rows)
        setMyRow(userId ? rows.find((r) => r.id === userId) ?? null : null)
      })

    // The viewer may be outside the top 10 — fetch their own line too.
    if (userId) {
      supabase
        .from('final_push_board')
        .select('*')
        .eq('id', userId)
        .limit(1)
        .then(({ data }) => {
          const row = (data as FinalPushRow[])?.[0]
          if (row) setMyRow(row)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, refreshKey, userId])

  if (mode === null) return null

  if (mode === 'hype') {
    const daysLeft =
      Math.max(1, parseInt(FINAL_PUSH_DATE.split('-')[2], 10) - parseInt((today as string).split('-')[2], 10))
    return (
      <div className={`card p-6 sm:p-8 border-liberty-red/50 text-center ${className}`}>
        <div className="text-[10px] text-liberty-red font-bold uppercase tracking-[0.25em] mb-2">
          {daysLeft === 1 ? 'Tomorrow' : `In ${daysLeft} days`} · July 31
        </div>
        <div className="font-bebas text-4xl sm:text-5xl text-white leading-none">
          🔥 THE FINAL PUSH 🔥
        </div>
        <p className="text-white/70 text-sm mt-3 max-w-xl mx-auto">
          One day. As many as you can. The biggest single-day total logged on July 31 crowns
          the <span className="text-liberty-gold font-bold">Final Push Champion</span> — a
          permanent spot in the Hall of Honor. Every rep still counts for your state, your
          1,776, and the national total.
        </p>
        <Link href="/final-push" className="btn-primary mt-5">
          {daysLeft === 1 ? 'See the standard to beat' : 'Inside the Final Push'}
        </Link>
      </div>
    )
  }

  return (
    <div className={`card p-6 sm:p-8 border-liberty-red/50 ${className}`}>
      <div className="text-center">
        <div className="text-[10px] text-liberty-red font-bold uppercase tracking-[0.25em] mb-2">
          {mode === 'live' ? 'Today only · July 31' : 'July 31 — final results'}
        </div>
        <div className="font-bebas text-4xl sm:text-5xl text-white leading-none">
          {mode === 'live' ? '🔥 THE FINAL PUSH IS ON 🔥' : '🏁 THE FINAL PUSH 🏁'}
        </div>
        <p className="text-white/70 text-sm mt-2 max-w-xl mx-auto">
          {mode === 'live'
            ? 'Most reps logged today takes the crown. Log every set as it happens — the board moves with you.'
            : 'The last day of the 2026 Liberty Lift, and the patriots who emptied the tank.'}
        </p>
      </div>

      {board.length > 0 ? (
        <div className="mt-5 max-w-xl mx-auto divide-y divide-white/10 border border-white/10">
          {board.map((row) => (
            <div
              key={row.id}
              className={`flex items-center gap-3 px-4 py-2.5 ${
                userId && row.id === userId ? 'bg-liberty-gold/10' : ''
              }`}
            >
              <span
                className={`w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 ${
                  row.final_push_rank === 1
                    ? 'bg-liberty-red text-white'
                    : row.final_push_rank === 2
                      ? 'bg-white text-liberty-dark'
                      : row.final_push_rank === 3
                        ? 'bg-white/70 text-liberty-dark'
                        : 'bg-white/10 text-white/70'
                }`}
              >
                {row.final_push_rank}
              </span>
              <span className="flex-1 min-w-0 truncate text-white text-sm font-semibold">
                {row.display_name || 'A patriot'}
                {row.state_code && (
                  <span className="text-white/40 font-normal"> · {US_STATES[row.state_code]}</span>
                )}
              </span>
              <span className="font-bebas text-2xl text-liberty-gold shrink-0">
                {row.final_day_pushups.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        mode === 'live' && (
          <p className="text-center text-white/50 text-sm mt-5">
            The board is empty. First set logged today leads the nation.
          </p>
        )
      )}

      {myRow && myRow.final_push_rank > 10 && (
        <p className="text-center text-white/70 text-sm mt-3">
          You: <span className="text-liberty-gold font-bold">{myRow.final_day_pushups.toLocaleString()}</span>{' '}
          today — #{myRow.final_push_rank} in the nation.
        </p>
      )}

      {/* The banner is the teaser; the war room is where the day is lived. */}
      {mode === 'live' && (
        <div className="text-center mt-5">
          <Link href="/final-push" className="btn-primary">
            Enter the war room
          </Link>
          <p className="text-white/40 text-xs mt-2">
            The live national count, the tape, and the clock to the closing bell.
          </p>
        </div>
      )}

      {mode === 'results' && (
        <div className="text-center mt-4 flex flex-col gap-2">
          <Link href="/final-push" className="text-sm text-liberty-gold hover:underline">
            Replay the last day →
          </Link>
          <Link href="/finale" className="text-sm text-liberty-gold hover:underline">
            The champion takes their place in the Hall of Honor →
          </Link>
        </div>
      )}
    </div>
  )
}
