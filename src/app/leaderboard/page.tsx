'use client'

import { useState, useEffect } from 'react'
import { createClient, LeaderboardEntry, US_STATES } from '@/lib/supabase'
import CommunityMilestoneBanner from '@/components/CommunityMilestoneBanner'
import Navigation from '@/components/Navigation'
import Link from 'next/link'
import { canUseChat } from '@/lib/flags'

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'streak' | 'daily' | 'recruits'>('all')
  const [userId, setUserId] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)

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

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (filter === 'streak') return b.current_streak - a.current_streak
    if (filter === 'daily') return b.best_day - a.best_day
    if (filter === 'recruits') return (b.recruits || 0) - (a.recruits || 0)
    return b.total_pushups - a.total_pushups
  })

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-24 pb-12 px-4 app-surface">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="app-eyebrow mb-3">National board</div>
            <h1 className="app-title text-6xl sm:text-7xl">Leaderboard</h1>
            <p className="text-white/60 mt-3">The people putting in the work.</p>
          </div>

          {/* Nationwide count + milestone celebration */}
          <CommunityMilestoneBanner userId={userId} className="mb-8" />

          {/* Filter Tabs */}
          <div className="flex justify-center gap-2 mb-8">
            {[
              { key: 'all', label: 'Total Push-ups' },
              { key: 'streak', label: 'Best Streak' },
              { key: 'daily', label: 'Best Day' },
              { key: 'recruits', label: 'Top Recruiters' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as 'all' | 'streak' | 'daily' | 'recruits')}
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

          {/* Leaderboard Content */}
          {loading ? (
            <div className="text-center text-white/50 py-12">Loading leaderboard...</div>
          ) : leaderboard.length === 0 ? (
            <div className="card p-12 text-center">
              <h2 className="font-bebas text-3xl text-liberty-red mb-2">No one on the board yet.</h2>
              <p className="text-white/60">Be the first to log your push-ups and claim the top spot.</p>
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
                      {entry.display_name || 'Anonymous'}
                    </div>
                    <div className="text-sm text-white/50">
                      {entry.state_code ? US_STATES[entry.state_code] : 'No state'}
                      {entry.current_streak > 0 && ` / ${entry.current_streak} day streak`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bebas text-2xl text-white">
                      {filter === 'streak' ? entry.current_streak :
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
