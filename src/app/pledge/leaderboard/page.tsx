'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Navigation from '@/components/Navigation'
import Link from 'next/link'

interface PledgeLeaderEntry {
  user_id: string
  display_name: string
  state_code: string | null
  charity: 'wounded_warrior' | 'save_the_children'
  pledge_type: 'per_completed' | 'per_short'
  rate_cents: number
  total_pushups: number
  pledged_amount: number
}

const CHARITY_INFO = {
  wounded_warrior: { name: 'Wounded Warrior Project', logo: '🎖️', shortName: 'WWP' },
  save_the_children: { name: 'Save the Children', logo: '🌍', shortName: 'STC' },
}

const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'Washington D.C.',
}

export default function PledgeLeaderboardPage() {
  const [entries, setEntries] = useState<PledgeLeaderEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'wounded_warrior' | 'save_the_children'>('all')
  const [totalPledged, setTotalPledged] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const loadLeaderboard = async () => {
      // Get all active pledges with user info and stats
      const { data: pledges } = await supabase
        .from('pledges')
        .select('user_id, charity, pledge_type, rate_cents')
        .eq('is_active', true)

      if (!pledges || pledges.length === 0) {
        setLoading(false)
        return
      }

      // Get profiles and stats for these users
      const userIds = pledges.map(p => p.user_id)
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, state_code')
        .in('id', userIds)

      const { data: stats } = await supabase
        .from('user_stats')
        .select('user_id, total_pushups')
        .in('user_id', userIds)

      // Combine data
      const combined: PledgeLeaderEntry[] = pledges.map(pledge => {
        const profile = profiles?.find(p => p.id === pledge.user_id)
        const userStats = stats?.find(s => s.user_id === pledge.user_id)
        const totalPushups = userStats?.total_pushups || 0

        let pledgedAmount: number
        if (pledge.pledge_type === 'per_completed') {
          pledgedAmount = (totalPushups * pledge.rate_cents) / 100
        } else {
          const short = Math.max(0, 1776 - totalPushups)
          pledgedAmount = (short * pledge.rate_cents) / 100
        }

        return {
          user_id: pledge.user_id,
          display_name: profile?.display_name || 'Anonymous Patriot',
          state_code: profile?.state_code,
          charity: pledge.charity,
          pledge_type: pledge.pledge_type,
          rate_cents: pledge.rate_cents,
          total_pushups: totalPushups,
          pledged_amount: pledgedAmount,
        }
      })

      // Sort by pledged amount
      combined.sort((a, b) => b.pledged_amount - a.pledged_amount)
      
      setEntries(combined)
      setTotalPledged(combined.reduce((sum, e) => sum + e.pledged_amount, 0))
      setLoading(false)
    }

    loadLeaderboard()
  }, [])

  const filteredEntries = filter === 'all' 
    ? entries 
    : entries.filter(e => e.charity === filter)

  const filteredTotal = filteredEntries.reduce((sum, e) => sum + e.pledged_amount, 0)

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-bebas text-5xl text-liberty-gold mb-2">
              🎗️ PLEDGE LEADERBOARD
            </h1>
            <p className="text-white/60">Patriots putting their push-ups where their mouth is</p>
          </div>

          {/* Total Pledged Banner */}
          <div className="card p-8 mb-8 text-center bg-gradient-to-br from-liberty-blue/20 to-liberty-red/20">
            <div className="text-white/60 mb-2">Total Pledged by Patriots</div>
            <div className="font-bebas text-7xl text-liberty-gold mb-2">
              ${totalPledged.toFixed(2)}
            </div>
            <div className="flex justify-center gap-8 text-sm text-white/50">
              <div className="flex items-center gap-2">
                <span>🎖️</span>
                <span>${entries.filter(e => e.charity === 'wounded_warrior').reduce((s, e) => s + e.pledged_amount, 0).toFixed(2)} to WWP</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🌍</span>
                <span>${entries.filter(e => e.charity === 'save_the_children').reduce((s, e) => s + e.pledged_amount, 0).toFixed(2)} to STC</span>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex justify-center gap-2 mb-8">
            {[
              { key: 'all', label: 'All Pledges', icon: '🎗️' },
              { key: 'wounded_warrior', label: 'Wounded Warrior', icon: '🎖️' },
              { key: 'save_the_children', label: 'Save the Children', icon: '🌍' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  filter === tab.key
                    ? 'bg-liberty-gold text-liberty-dark'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Leaderboard */}
          {loading ? (
            <div className="text-center text-white/50 py-12">Loading pledges...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-5xl mb-4">🎗️</div>
              <h2 className="font-bebas text-2xl text-liberty-gold mb-2">No Pledges Yet!</h2>
              <p className="text-white/60 mb-6">Be the first to make a pledge and support a great cause.</p>
              <Link href="/pledge" className="btn-gold px-6 py-3 inline-block">
                Make a Pledge
              </Link>
            </div>
          ) : (
            <div className="card overflow-hidden divide-y divide-white/10">
              {filteredEntries.map((entry, index) => {
                const charityInfo = CHARITY_INFO[entry.charity]
                return (
                  <div key={entry.user_id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                    {/* Rank */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-liberty-dark' :
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-liberty-dark' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-liberty-dark' :
                      'bg-white/10 text-white/70'
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate">
                        {entry.display_name}
                      </div>
                      <div className="text-sm text-white/50 flex items-center gap-2">
                        <span>{charityInfo.logo} {charityInfo.shortName}</span>
                        <span>•</span>
                        <span>{entry.pledge_type === 'per_completed' ? '🥕' : '🔥'} ${(entry.rate_cents / 100).toFixed(2)}/push-up</span>
                        {entry.state_code && (
                          <>
                            <span>•</span>
                            <span>{US_STATES[entry.state_code] || entry.state_code}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <div className="font-bebas text-2xl text-liberty-gold">
                        ${entry.pledged_amount.toFixed(2)}
                      </div>
                      <div className="text-xs text-white/50">
                        {entry.total_pushups.toLocaleString()} push-ups
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* CTA */}
          <div className="mt-8 text-center">
            <Link href="/pledge" className="text-liberty-gold hover:underline">
              Make your pledge →
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
