'use client'

import { useState, useEffect } from 'react'
import { createClient, US_STATES } from '@/lib/supabase'
import Navigation from '@/components/Navigation'

interface StateStats {
  state_code: string
  participants: number
  total_pushups: number
  avg_pushups: number
  state_rank: number
}

export default function StatesPage() {
  const [stateStats, setStateStats] = useState<StateStats[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadStats = async () => {
      const { data } = await supabase
        .from('state_leaderboard')
        .select('*')
        .order('total_pushups', { ascending: false })
      
      setStateStats(data || [])
      setLoading(false)
    }

    loadStats()
  }, [])

  const getStateEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return ''
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-bebas text-5xl text-liberty-gold mb-2">
              🗺️ STATE BATTLE
            </h1>
            <p className="text-white/60">50 states compete for push-up supremacy</p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="card p-4 text-center">
              <div className="font-bebas text-3xl text-liberty-gold">
                {stateStats.length}
              </div>
              <div className="text-xs text-white/50 uppercase">States Active</div>
            </div>
            <div className="card p-4 text-center">
              <div className="font-bebas text-3xl text-white">
                {stateStats.reduce((sum, s) => sum + s.participants, 0)}
              </div>
              <div className="text-xs text-white/50 uppercase">Total Patriots</div>
            </div>
            <div className="card p-4 text-center">
              <div className="font-bebas text-3xl text-white">
                {stateStats.reduce((sum, s) => sum + s.total_pushups, 0).toLocaleString()}
              </div>
              <div className="text-xs text-white/50 uppercase">Total Push-ups</div>
            </div>
            <div className="card p-4 text-center">
              <div className="font-bebas text-3xl text-white">
                {stateStats.length > 0 ? Math.round(stateStats.reduce((sum, s) => sum + s.avg_pushups, 0) / stateStats.length) : 0}
              </div>
              <div className="text-xs text-white/50 uppercase">Avg Per Patriot</div>
            </div>
          </div>

          {/* State Leaderboard */}
          {loading ? (
            <div className="text-center text-white/50 py-12">Loading state rankings...</div>
          ) : stateStats.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-5xl mb-4">🏛️</div>
              <h2 className="font-bebas text-2xl text-liberty-gold mb-2">No States Yet!</h2>
              <p className="text-white/60">Be the first to represent your state in the push-up challenge.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="divide-y divide-white/10">
                {stateStats.map((state, index) => (
                  <div key={state.state_code} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-liberty-dark' :
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-liberty-dark' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-liberty-dark' :
                      'bg-white/10 text-white/70'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white flex items-center gap-2">
                        {US_STATES[state.state_code] || state.state_code}
                        {getStateEmoji(index + 1)}
                      </div>
                      <div className="text-sm text-white/50">
                        {state.participants} patriot{state.participants !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bebas text-2xl text-white">
                        {state.total_pushups.toLocaleString()}
                      </div>
                      <div className="text-xs text-white/50">
                        avg {state.avg_pushups}/person
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Call to Action */}
          <div className="mt-8 text-center">
            <p className="text-white/60 mb-4">
              Rep your state! Set your state in your profile to contribute to your state's ranking.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
