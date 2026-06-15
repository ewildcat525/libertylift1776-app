'use client'

import { useState } from 'react'
import { createClient, Pledge } from '@/lib/supabase'

interface PledgeSetupProps {
  userId: string
  onComplete?: () => void
  existingPledge?: Pledge | null
}

// The challenge raises for a single cause with a single, easy-to-project
// pledge structure: donate a fixed rate for every push-up completed.
const CHARITY = 'wounded_warrior'
const PLEDGE_TYPE = 'per_completed'

const RATE_PRESETS = [
  { cents: 1, label: '$0.01' },
  { cents: 5, label: '$0.05' },
  { cents: 10, label: '$0.10' },
  { cents: 25, label: '$0.25' },
  { cents: 50, label: '$0.50' },
  { cents: 100, label: '$1.00' },
]

export default function PledgeSetup({ userId, onComplete, existingPledge }: PledgeSetupProps) {
  const [rateCents, setRateCents] = useState<number>(existingPledge?.rate_cents || 10)
  const [customRate, setCustomRate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const projectedMax = ((1776 * rateCents) / 100).toFixed(2)

  const handleRateChange = (cents: number) => {
    setRateCents(cents)
    setCustomRate('')
  }

  const handleCustomRateChange = (value: string) => {
    setCustomRate(value)
    const dollars = parseFloat(value)
    if (!isNaN(dollars) && dollars > 0 && dollars <= 100) {
      setRateCents(Math.round(dollars * 100))
    }
  }

  const savePledge = async () => {
    if (rateCents < 1) return

    setSaving(true)
    setError(null)

    try {
      if (existingPledge) {
        const { error } = await supabase
          .from('pledges')
          .update({
            charity: CHARITY,
            pledge_type: PLEDGE_TYPE,
            rate_cents: rateCents,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPledge.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('pledges')
          .insert({
            user_id: userId,
            charity: CHARITY,
            pledge_type: PLEDGE_TYPE,
            rate_cents: rateCents,
          })

        if (error) throw error
      }

      onComplete?.()
    } catch (err: any) {
      setError(err.message || 'Failed to save pledge')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Cause */}
      <div className="flex items-center gap-4 p-5 rounded-xl border border-white/10 bg-white/5">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-3xl">
          🎖️
        </div>
        <div>
          <h3 className="font-bold text-lg text-white">Wounded Warrior Project</h3>
          <p className="text-white/60 text-sm">
            You&apos;ll donate a fixed amount for every push-up you complete in July.
          </p>
        </div>
      </div>

      {/* Rate */}
      <div>
        <div className="text-center mb-5">
          <h2 className="font-bebas text-4xl text-liberty-gold mb-2">Set Your Rate</h2>
          <p className="text-white/60">How much per push-up completed?</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {RATE_PRESETS.map((r) => (
            <button
              key={r.cents}
              onClick={() => handleRateChange(r.cents)}
              className={`py-4 rounded-xl font-bold text-lg transition-all ${
                rateCents === r.cents && !customRate
                  ? 'bg-liberty-gold text-liberty-dark scale-105'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="relative mt-3">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-lg">$</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max="100"
            placeholder="Custom amount"
            value={customRate}
            onChange={(e) => handleCustomRateChange(e.target.value)}
            className="w-full py-4 pl-8 pr-4 rounded-xl bg-white/10 border border-white/20 text-white text-lg focus:border-liberty-gold focus:outline-none"
          />
        </div>
      </div>

      {/* Projected total */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-liberty-blue/20 to-liberty-red/20 border border-white/10 text-center">
        <div className="text-white/60 mb-1">If you complete all 1,776 push-ups</div>
        <div className="font-bebas text-6xl text-liberty-gold leading-none">${projectedMax}</div>
        <div className="text-white/50 text-sm mt-2">
          ${(rateCents / 100).toFixed(2)} × 1,776 push-ups → Wounded Warrior Project
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-center">
          {error}
        </div>
      )}

      <button
        onClick={savePledge}
        disabled={saving || rateCents < 1}
        className="w-full btn-gold py-4 text-lg disabled:opacity-50"
      >
        {saving ? 'Saving...' : existingPledge ? 'Update Pledge' : '🎖️ Make My Pledge'}
      </button>

      <p className="text-center text-white/40 text-sm">
        This is an honor-system pledge. At the end of July, we&apos;ll show you your total and link to donate directly.
      </p>
    </div>
  )
}
