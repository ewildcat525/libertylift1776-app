'use client'

import { useState, useEffect } from 'react'
import { createClient, LeaderboardEntry, US_STATES } from '@/lib/supabase'
import {
  challengePhase,
  ChallengePhase,
  FINAL_PUSH_DATE,
  finalPushPhase,
  localDateString,
} from '@/lib/dates'
import CommunityMilestoneBanner from '@/components/CommunityMilestoneBanner'
import FinalPushBanner, { FinalPushRow } from '@/components/FinalPushBanner'
import Navigation from '@/components/Navigation'
import ClickableName from '@/components/UserPushupChartModal'
import Link from 'next/link'
import { canUseChat } from '@/lib/flags'

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'streak' | 'daily' | 'recruits' | 'finalpush'>('all')
  const [userId, setUserId] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
  // Resolved after mount so the prerendered HTML matches the first render.
  const [phase, setPhase] = useState<ChallengePhase | null>(null)
  const [today, setToday] = useState<string | null>(null)
  const [finalPushRows, setFinalPushRows] = useState<FinalPushRow[] | null>(null)

  useEffect(() => {
    setPhase(challengePhase())
    const t = localDateString()
    setToday(t)
    // While the blitz is running, the Final Push board is the main event.
    // Keyed to the phase, not the date, so it stays the default tab through
    // the small hours of August 1 — the bell is midnight in Hawaii.
    if (finalPushPhase() === 'live') setFilter('finalpush')
  }, [])

  // Fetched on every switch to the tab (not cached) so re-tabbing on the
  // 31st pulls fresh standings.
  useEffect(() => {
    if (filter !== 'finalpush') return
    const supabase = createClient()
    supabase
      .from('final_push_board')
      .select('*')
      .order('final_push_rank', { ascending: true })
      .limit(500)
      .then(({ data }) => setFinalPushRows((data as FinalPushRow[]) || []))
  }, [filter])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
      setShowChat(canUseChat(user?.email))
    })
  }, [])

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('leaderboard')
          .select('*')
          .limit(100)
        
        if (error) {
          console.error('Leaderboard error:', error)
        }
        setLeaderboard(data || [])
      } catch (err) {
        console.error('Leaderboard fetch failed:', err)
      } finally {
        setLoading(false)
      }
    }

    loadLeaderboard()
  }, [])

  // Once the contest ends every current streak has expired to 0 (the view
  // applies the live-streak rule), so the final board ranks longest streak.
  const ended = phase === 'ended'
  const streakOf = (e: LeaderboardEntry) => (ended ? e.longest_streak : e.current_streak)

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (filter === 'streak') return streakOf(b) - streakOf(a)
    if (filter === 'daily') return b.best_day - a.best_day
    if (filter === 'recruits') return (b.recruits || 0) - (a.recruits || 0)
    return b.total_pushups - a.total_pushups
  })

  return (
    <>
      <Navigation />
      <div className="native-standings-screen min-h-screen pt-24 pb-12 px-4 app-surface">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="app-eyebrow mb-3">National board</div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h1 className="app-title text-6xl sm:text-7xl">Standings</h1>
              {ended && (
                <span className="inline-flex items-center gap-1 px-3 py-1 border-2 border-liberty-gold text-liberty-gold text-xs font-extrabold uppercase tracking-[0.2em] -rotate-2">
                  🇺🇸 Final
                </span>
              )}
            </div>
            <p className="text-white/60 mt-3">
              {ended
                ? 'The 2026 books are closed. These standings are permanent.'
                : phase === 'grace'
                  ? 'Last call — standings are certified after tonight.'
                  : 'The people putting in the work.'}
            </p>
            {ended && (
              <Link href="/finale" className="inline-block mt-3 text-sm text-liberty-gold hover:underline">
                See the champions in the Hall of Honor →
              </Link>
            )}
          </div>

          <div className="native-board-extras">
            {/* Nationwide count + milestone celebration */}
            <CommunityMilestoneBanner userId={userId} className="mb-8" />

            {/* The Final Push: last-day blitz hype, live board, then results */}
            <FinalPushBanner userId={userId} className="mb-8" />
          </div>

          {/* Filter Tabs */}
          <div className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:justify-center sm:px-0" role="tablist" aria-label="Leaderboard category">
            {[
              { key: 'all', label: 'Total Push-ups' },
              { key: 'streak', label: 'Best Streak' },
              { key: 'daily', label: 'Best Day' },
              { key: 'recruits', label: 'Top Recruiters' },
              { key: 'finalpush', label: '🔥 Final Push' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as 'all' | 'streak' | 'daily' | 'recruits' | 'finalpush')}
                role="tab"
                aria-selected={filter === tab.key}
                className={`min-h-11 shrink-0 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.1em] transition-colors border ${
                  filter === tab.key
                    ? 'bg-liberty-red border-liberty-red text-white'
                    : 'bg-transparent border-white/20 text-white/70 hover:bg-white hover:text-liberty-dark'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Final Push tab: the full July 31 day board (the banner above
              shows the top 10; this is everyone). Teaser until the day. */}
          {filter === 'finalpush' ? (
            finalPushRows === null ? (
              <div className="text-center text-white/50 py-12">Loading the day board...</div>
            ) : finalPushRows.length === 0 ? (
              <div className="card p-12 text-center">
                {today !== null && today < FINAL_PUSH_DATE ? (
                  <>
                    <h2 className="font-bebas text-3xl text-liberty-red mb-2">
                      This board fills on July 31.
                    </h2>
                    <p className="text-white/60">
                      One final day to contribute at your own safe pace. The biggest verified
                      single-day total takes the crown, within the 500-rep safety cap.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="font-bebas text-3xl text-liberty-red mb-2">
                      The board is empty.
                    </h2>
                    <p className="text-white/60">
                      First set logged today leads the nation.
                    </p>
                  </>
                )}
                <Link href="/final-push" className="inline-block mt-4 text-sm text-liberty-gold hover:underline">
                  Go to the war room →
                </Link>
              </div>
            ) : (
              <>
              <div className="card overflow-hidden divide-y divide-white/10">
                {finalPushRows.map((row) => (
                  <div key={row.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                    <div className={`w-10 h-10 flex items-center justify-center font-bold text-lg ${
                      row.final_push_rank === 1 ? 'bg-liberty-red text-white' :
                      row.final_push_rank === 2 ? 'bg-white text-liberty-dark' :
                      row.final_push_rank === 3 ? 'bg-white/70 text-liberty-dark' :
                      'bg-white/10 text-white/70'
                    }`}>
                      {String(row.final_push_rank).padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate">
                        <ClickableName
                          userId={row.id}
                          displayName={row.display_name}
                          stateCode={row.state_code}
                          className="max-w-full truncate"
                        />
                      </div>
                      <div className="text-sm text-white/50">
                        {row.state_code ? US_STATES[row.state_code] : 'No state'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bebas text-2xl text-white">
                        {row.final_day_pushups.toLocaleString()}
                      </div>
                      <div className="text-xs text-white/50">on July 31</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center mt-4">
                <Link href="/final-push" className="text-sm text-liberty-gold hover:underline">
                  Watch the day live in the war room →
                </Link>
              </div>
              </>
            )
          ) : loading ? (
            <div className="native-board-loading text-center text-white/50 py-12" role="status"><span />Loading standings…</div>
          ) : leaderboard.length === 0 ? (
            <div className="card p-12 text-center">
              <h2 className="font-bebas text-3xl text-liberty-red mb-2">No one on the board yet.</h2>
              <p className="text-white/60">Be the first to log your push-ups and claim the top spot.</p>
            </div>
          ) : (
            <div className="native-leaderboard-list card overflow-hidden divide-y divide-white/10" role="list">
              {sortedLeaderboard.map((entry, index) => (
                <div key={entry.id} className={`native-leaderboard-row flex items-center gap-4 p-4 transition-colors ${entry.id === userId ? 'is-you' : ''}`} role="listitem">
                  <div className={`native-rank-badge w-10 h-10 flex items-center justify-center font-bold text-lg ${
                    index === 0 ? 'bg-liberty-red text-white' :
                    index === 1 ? 'bg-white text-liberty-dark' :
                    index === 2 ? 'bg-white/70 text-liberty-dark' :
                    'bg-white/10 text-white/70'
                  }`}>
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">
                      <ClickableName
                        userId={entry.id}
                        displayName={entry.display_name}
                        stateCode={entry.state_code}
                        className="max-w-full truncate"
                      />
                    </div>
                    <div className="text-sm text-white/50">
                      {entry.state_code ? US_STATES[entry.state_code] : 'No state'}
                      {ended
                        ? entry.longest_streak > 0 && ` / best streak ${entry.longest_streak} days`
                        : entry.current_streak > 0 && ` / ${entry.current_streak} day streak`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bebas text-2xl text-white">
                      {filter === 'streak' ? streakOf(entry) :
                       filter === 'daily' ? entry.best_day :
                       filter === 'recruits' ? (entry.recruits || 0) :
                       entry.total_pushups.toLocaleString()}
                    </div>
                    <div className="text-xs text-white/50">
                      {filter === 'streak' ? 'days' :
                       filter === 'daily' ? 'in one day' :
                       filter === 'recruits' ? 'recruited' : 'push-ups'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Trash Talk CTA */}
          {showChat && (
          <Link
            href="/chat"
            className="card mt-8 p-5 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors group"
          >
            <div>
              <div className="font-bebas text-2xl text-liberty-red">Got something to say? 🗣️</div>
              <p className="text-sm text-white/60">Take it to the nationwide chat.</p>
            </div>
            <span className="text-liberty-gold text-sm font-bold group-hover:translate-x-1 transition-transform">→</span>
          </Link>
          )}
        </div>
      </div>
    </>
  )
}
