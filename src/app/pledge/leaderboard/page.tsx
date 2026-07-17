'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Navigation from '@/components/Navigation'
import ClickableName from '@/components/UserPushupChartModal'
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

const LEADERBOARD_LIMIT = 100

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
  const [totalPledged, setTotalPledged] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const loadLeaderboard = async () => {
      const { data: leaders } = await supabase
        .from('pledge_leaderboard')
        .select('user_id, display_name, state_code, charity, pledge_type, rate_cents, total_pushups, pledged_amount')
        .order('pledged_amount', { ascending: false })
        .limit(LEADERBOARD_LIMIT)

      if (!leaders || leaders.length === 0) {
        setLoading(false)
        return
      }

      const combined = leaders.map((leader) => ({
        ...leader,
        pledged_amount: Number(leader.pledged_amount),
      })) as PledgeLeaderEntry[]
      
      setEntries(combined)
      setTotalPledged(combined.reduce((sum, e) => sum + e.pledged_amount, 0))
      setLoading(false)
    }

    loadLeaderboard()
  }, [])

  const filteredEntries = entries

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-24 pb-12 px-4 app-surface">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="app-eyebrow mb-3">Pledge board</div>
            <h1 className="app-title text-6xl sm:text-7xl">Pledge Leaderboard</h1>
            <p className="text-white/60 mt-3">Top {LEADERBOARD_LIMIT} active pledges, ranked by current amount.</p>
          </div>

          {/* Total Pledged Banner */}
          <div className="card p-8 mb-8 text-center">
            <div className="text-white/60 mb-2">Top {LEADERBOARD_LIMIT} pledged to Wounded Warrior Project</div>
            <div className="font-bebas text-7xl text-liberty-red mb-2">
              ${totalPledged.toFixed(2)}
            </div>
            <div className="flex justify-center items-center gap-2 text-sm text-white/50">
              <span>🎖️</span>
              <span>Honor-system pledges, 5¢–$1 per push-up completed</span>
            </div>
          </div>

          {/* Leaderboard */}
          {loading ? (
            <div className="text-center text-white/50 py-12">Loading pledges...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="card p-12 text-center">
              <h2 className="font-bebas text-3xl text-liberty-red mb-2">No pledges yet.</h2>
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
                    <div className={`w-10 h-10 flex items-center justify-center font-bold text-lg ${
                      index === 0 ? 'bg-liberty-red text-white' :
                      index === 1 ? 'bg-white text-liberty-dark' :
                      index === 2 ? 'bg-white/70 text-liberty-dark' :
                      'bg-white/10 text-white/70'
                    }`}>
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate">
                        <ClickableName
                          userId={entry.user_id}
                          displayName={entry.display_name}
                          stateCode={entry.state_code}
                          className="max-w-full truncate"
                        />
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
