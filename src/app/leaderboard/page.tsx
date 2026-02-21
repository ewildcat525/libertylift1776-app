'use client'

import { useState, useEffect } from 'react'
import { createClient, LeaderboardEntry, US_STATES } from '@/lib/supabase'
import Navigation from '@/components/Navigation'

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'streak' | 'daily'>('all')
  const supabase = createClient()

  useEffect(() => {
    const loadLeaderboard = async () => {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .limit(100)
      
      if (error) {
        console.error('Leaderboard error:', error)
      }
      console.log('Leaderboard data:', data)
      setLeaderboard(data || [])
      setLoading(false)
    }

    loadLeaderboard()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('leaderboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_stats' }, () => {
        loadLeaderboard()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (filter === 'streak') return b.current_streak - a.current_streak
    if (filter === 'daily') return b.best_day - a.best_day
    return b.total_pushups - a.total_pushups
  })

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'rank-1'
    if (rank === 2) return 'rank-2'
    if (rank === 3) return 'rank-3'
    return 'rank-default'
  }

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return rank.toString()
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-bebas text-5xl text-liberty-gold mb-2">
              🏆 LEADERBOARD
            </h1>
            <p className="text-white/60">The most dedicated patriots</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex justify-center gap-2 mb-8">
            {[
              { key: 'all', label: 'Total Push-ups' },
              { key: 'streak', label: 'Best Streak' },
              { key: 'daily', label: 'Best Day' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-liberty-gold text-liberty-dark'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Leaderboard */}
          {loading ? (
            <div className="text-center text-white/50 py-12">Loading leaderboard...</div>
          ) : leaderboard.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-5xl mb-4">🦅</div>
              <h2 className="font-bebas text-2xl text-liberty-gold mb-2">No Patriots Yet!</h2>
              <p className="text-white/60">Be the first to log your push-ups and claim the top spot.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              {/* Top 3 Podium */}
              {sortedLeaderboard.length >= 3 && (
                <div className="bg-gradient-to-b from-liberty-gold/10 to-transparent p-8">
                  <div className="flex items-end justify-center gap-4">
                    {/* 2nd Place */}
                    <div className="text-center flex-1 max-w-[150px]">
                      <div className="text-4xl mb-2">🥈</div>
                      <div className="font-semibold text-white truncate">
                        {sortedLeaderboard[1].display_name || 'Anonymous'}
                      </div>
                      <div className="text-sm text-white/50">
                        {sortedLeaderboard[1].state_code && US_STATES[sortedLeaderboard[1].state_code]}
                      </div>
                      <div className="font-bebas text-2xl text-white mt-1">
                        {filter === 'streak' ? sortedLeaderboard[1].current_streak :
                         filter === 'daily' ? sortedLeaderboard[1].best_day :
                         sortedLeaderboard[1].total_pushups.toLocaleString()}
                      </div>
                    </div>

                    {/* 1st Place */}
                    <div className="text-center flex-1 max-w-[180px] -mt-4">
                      <div className="text-5xl mb-2">🥇</div>
                      <div className="font-bold text-liberty-gold text-lg truncate">
                        {sortedLeaderboard[0].display_name || 'Anonymous'}
                      </div>
                      <div className="text-sm text-white/50">
                        {sortedLeaderboard[0].state_code && US_STATES[sortedLeaderboard[0].state_code]}
                      </div>
                      <div className="font-bebas text-4xl text-liberty-gold mt-1">
                        {filter === 'streak' ? sortedLeaderboard[0].current_streak :
                         filter === 'daily' ? sortedLeaderboard[0].best_day :
                         sortedLeaderboard[0].total_pushups.toLocaleString()}
                      </div>
                    </div>

                    {/* 3rd Place */}
                    <div className="text-center flex-1 max-w-[150px]">
                      <div className="text-4xl mb-2">🥉</div>
                      <div className="font-semibold text-white truncate">
                        {sortedLeaderboard[2].display_name || 'Anonymous'}
                      </div>
                      <div className="text-sm text-white/50">
                        {sortedLeaderboard[2].state_code && US_STATES[sortedLeaderboard[2].state_code]}
                      </div>
                      <div className="font-bebas text-2xl text-white mt-1">
                        {filter === 'streak' ? sortedLeaderboard[2].current_streak :
                         filter === 'daily' ? sortedLeaderboard[2].best_day :
                         sortedLeaderboard[2].total_pushups.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Rest of leaderboard */}
              <div className="divide-y divide-white/10">
                {sortedLeaderboard.slice(3).map((entry, index) => (
                  <div key={entry.id} className="leaderboard-row">
                    <div className={`rank-badge ${getRankStyle(index + 4)}`}>
                      {index + 4}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate">
                        {entry.display_name || 'Anonymous'}
                      </div>
                      <div className="text-sm text-white/50">
                        {entry.state_code ? US_STATES[entry.state_code] : 'No state'}
                        {entry.current_streak > 0 && ` • 🔥 ${entry.current_streak} day streak`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bebas text-2xl text-white">
                        {filter === 'streak' ? entry.current_streak :
                         filter === 'daily' ? entry.best_day :
                         entry.total_pushups.toLocaleString()}
                      </div>
                      <div className="text-xs text-white/50">
                        {filter === 'streak' ? 'days' :
                         filter === 'daily' ? 'in one day' :
                         'push-ups'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
