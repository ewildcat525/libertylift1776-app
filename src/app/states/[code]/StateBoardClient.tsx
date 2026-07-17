'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { track } from '@vercel/analytics'
import Navigation from '@/components/Navigation'
import ClickableName from '@/components/UserPushupChartModal'
import { createClient, isValidStateCode, LeaderboardEntry, US_STATES } from '@/lib/supabase'

interface StateStats {
  state_code: string
  participants: number
  total_pushups: number
  avg_pushups: number
  state_rank: number
}

type Filter = 'all' | 'streak' | 'daily'

export default function StateBoardClient() {
  const params = useParams()
  const router = useRouter()
  const stateCode = String(params.code || '').toUpperCase()
  const stateName = US_STATES[stateCode]
  const [stats, setStats] = useState<StateStats | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [copied, setCopied] = useState(false)

  const shareState = async () => {
    const url = `${window.location.origin}/states/${stateCode}`
    const text = stats?.total_pushups
      ? `${stateName} has ${stats.total_pushups.toLocaleString()} push-ups on the Liberty Lift 1776 board (#${stats.state_rank} nationally). Add yours:`
      : `Put ${stateName} on the Liberty Lift 1776 board. 1,776 push-ups in July:`

    if (typeof navigator.share === 'function') {
      track('share_clicked', { channel: 'native', context: 'state_board' })
      try {
        await navigator.share({ title: `Liberty Lift 1776 — ${stateName}`, text, url })
      } catch {
        // user dismissed the share sheet
      }
      return
    }

    track('share_clicked', { channel: 'copy', context: 'state_board' })
    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // clipboard unavailable
    }
  }

  useEffect(() => {
    if (!isValidStateCode(stateCode)) {
      router.push('/states')
      return
    }

    const loadState = async () => {
      try {
        const supabase = createClient()
        const [{ data: stateData, error: stateError }, { data: leaderboardData, error: leaderboardError }] = await Promise.all([
          supabase
            .from('state_leaderboard')
            .select('*')
            .eq('state_code', stateCode)
            .maybeSingle(),
          supabase
            .from('leaderboard')
            .select('*')
            .eq('state_code', stateCode)
            .limit(100),
        ])

        if (stateError) console.error('State stats error:', stateError)
        if (leaderboardError) console.error('State leaderboard error:', leaderboardError)

        setStats(stateData || null)
        setLeaderboard(leaderboardData || [])
      } catch (err) {
        console.error('State page fetch failed:', err)
      } finally {
        setLoading(false)
      }
    }

    loadState()
  }, [router, stateCode])

  const sortedLeaderboard = useMemo(() => {
    return [...leaderboard].sort((a, b) => {
      if (filter === 'streak') return b.current_streak - a.current_streak
      if (filter === 'daily') return b.best_day - a.best_day
      return b.total_pushups - a.total_pushups
    })
  }, [filter, leaderboard])

  const totalPushups = stats?.total_pushups || 0
  const participants = stats?.participants || 0
  const avgPushups = stats?.avg_pushups || 0
  const stateRank = stats?.state_rank || null

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-24 pb-12 px-4 app-surface">
        <div className="max-w-4xl mx-auto">
          <Link href="/states" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
            ← Back to states
          </Link>

          <div className="mb-8">
            <div className="app-eyebrow mb-3">State board</div>
            <h1 className="app-title text-6xl sm:text-7xl">{stateName || stateCode}</h1>
            <p className="text-white/60 mt-3">
              {stateName || stateCode} lifters putting reps on the national board.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="card p-4 text-center">
              <div className="font-bebas text-3xl text-liberty-red">
                {stateRank ? `#${stateRank}` : '-'}
              </div>
              <div className="text-xs text-white/50 uppercase">National Rank</div>
            </div>
            <div className="card p-4 text-center">
              <div className="font-bebas text-3xl text-white">{participants}</div>
              <div className="text-xs text-white/50 uppercase">Patriots</div>
            </div>
            <div className="card p-4 text-center">
              <div className="font-bebas text-3xl text-white">{totalPushups.toLocaleString()}</div>
              <div className="text-xs text-white/50 uppercase">Push-ups</div>
            </div>
            <div className="card p-4 text-center">
              <div className="font-bebas text-3xl text-white">{avgPushups}</div>
              <div className="text-xs text-white/50 uppercase">Avg Per Patriot</div>
            </div>
          </div>

          <div className="flex justify-center gap-2 mb-8">
            {[
              { key: 'all', label: 'Total Push-ups' },
              { key: 'streak', label: 'Best Streak' },
              { key: 'daily', label: 'Best Day' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as Filter)}
                className={`px-4 py-2 text-xs font-extrabold uppercase tracking-[0.1em] transition-colors border ${
                  filter === tab.key
                    ? 'bg-liberty-red border-liberty-red text-white'
                    : 'bg-transparent border-white/20 text-white/70 hover:bg-white hover:text-liberty-dark'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center text-white/50 py-12">Loading {stateName || stateCode}...</div>
          ) : sortedLeaderboard.length === 0 ? (
            <div className="card p-12 text-center">
              <h2 className="font-bebas text-3xl text-liberty-red mb-2">No reps logged here yet.</h2>
              <p className="text-white/60 mb-6">
                Be the first to put {stateName || stateCode} on the board.
              </p>
              <Link href="/signup" className="btn-gold inline-flex">
                Join your state
              </Link>
            </div>
          ) : (
            <div className="card overflow-hidden divide-y divide-white/10">
              {sortedLeaderboard.map((entry, index) => (
                <div key={entry.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                  <div className={`w-10 h-10 flex items-center justify-center font-bold text-lg ${
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
                      {entry.current_streak > 0 ? `${entry.current_streak} day streak` : stateName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bebas text-2xl text-white">
                      {filter === 'streak' ? entry.current_streak :
                       filter === 'daily' ? entry.best_day :
                       entry.total_pushups.toLocaleString()}
                    </div>
                    <div className="text-xs text-white/50">
                      {filter === 'streak' ? 'days' : filter === 'daily' ? 'in one day' : 'push-ups'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-white/60 mb-4">
              Share this state board with people from {stateName || stateCode} and move the ranking.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={shareState} className="btn-gold px-6 py-3">
                {copied ? 'Link copied!' : `Share the ${stateName || stateCode} board`}
              </button>
              <Link href="/states" className="campaign-button campaign-button-light">
                View all states <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
