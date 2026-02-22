'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface Pledge {
  id: string
  user_id: string
  charity: 'wounded_warrior' | 'save_the_children'
  pledge_type: 'per_completed' | 'per_short'
  rate_cents: number
  is_active: boolean
}

interface PledgeSetupProps {
  userId: string
  onComplete?: () => void
  existingPledge?: Pledge | null
}

const CHARITIES = [
  {
    id: 'wounded_warrior',
    name: 'Wounded Warrior Project',
    description: 'Supporting veterans who incurred physical or mental injuries',
    logo: '🎖️',
    color: 'from-amber-600 to-amber-800',
    url: 'https://www.woundedwarriorproject.org/',
  },
  {
    id: 'save_the_children',
    name: 'Save the Children',
    description: 'Helping children in need around the world',
    logo: '🌍',
    color: 'from-red-500 to-red-700',
    url: 'https://www.savethechildren.org/',
  },
]

const PLEDGE_TYPES = [
  {
    id: 'per_completed',
    name: 'Per Push-up Completed',
    emoji: '🥕',
    description: 'Donate for every push-up you complete',
    example: '1,776 push-ups × $0.10 = $177.60',
    vibe: 'Reward your effort',
  },
  {
    id: 'per_short',
    name: 'Per Push-up Short',
    emoji: '🔥',
    description: 'Donate for every push-up you fall short of 1,776',
    example: 'Fall 500 short × $0.10 = $50.00',
    vibe: 'Stakes to finish strong',
  },
]

const RATE_PRESETS = [
  { cents: 1, label: '$0.01' },
  { cents: 5, label: '$0.05' },
  { cents: 10, label: '$0.10' },
  { cents: 25, label: '$0.25' },
  { cents: 50, label: '$0.50' },
  { cents: 100, label: '$1.00' },
]

export default function PledgeSetup({ userId, onComplete, existingPledge }: PledgeSetupProps) {
  const [step, setStep] = useState(1)
  const [charity, setCharity] = useState<string>(existingPledge?.charity || '')
  const [pledgeType, setPledgeType] = useState<string>(existingPledge?.pledge_type || '')
  const [rateCents, setRateCents] = useState<number>(existingPledge?.rate_cents || 10)
  const [customRate, setCustomRate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const selectedCharity = CHARITIES.find(c => c.id === charity)
  const selectedPledgeType = PLEDGE_TYPES.find(p => p.id === pledgeType)

  // Calculate example amounts
  const exampleCompleted = (1776 * rateCents / 100).toFixed(2)
  const exampleShort = (500 * rateCents / 100).toFixed(2)

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
    if (!charity || !pledgeType || rateCents < 1) return

    setSaving(true)
    setError(null)

    try {
      if (existingPledge) {
        // Update existing
        const { error } = await supabase
          .from('pledges')
          .update({
            charity,
            pledge_type: pledgeType,
            rate_cents: rateCents,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPledge.id)

        if (error) throw error
      } else {
        // Insert new
        const { error } = await supabase
          .from('pledges')
          .insert({
            user_id: userId,
            charity,
            pledge_type: pledgeType,
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
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                step >= s
                  ? 'bg-liberty-gold text-liberty-dark'
                  : 'bg-white/10 text-white/40'
              }`}
            >
              {step > s ? '✓' : s}
            </div>
            {s < 3 && (
              <div className={`w-12 h-1 mx-1 rounded ${step > s ? 'bg-liberty-gold' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Charity */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="font-bebas text-4xl text-liberty-gold mb-2">Choose Your Cause</h2>
            <p className="text-white/60">Your push-ups will support one of these amazing organizations</p>
          </div>

          <div className="grid gap-4">
            {CHARITIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCharity(c.id)}
                className={`p-6 rounded-xl border-2 text-left transition-all ${
                  charity === c.id
                    ? 'border-liberty-gold bg-liberty-gold/10 scale-[1.02]'
                    : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-3xl`}>
                    {c.logo}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xl text-white">{c.name}</h3>
                      {charity === c.id && <span className="text-liberty-gold">✓</span>}
                    </div>
                    <p className="text-white/60 mt-1">{c.description}</p>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-liberty-gold hover:underline mt-2 inline-block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Learn more →
                    </a>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!charity}
            className="w-full btn-gold py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Choose Pledge Type */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="font-bebas text-4xl text-liberty-gold mb-2">Pick Your Motivation</h2>
            <p className="text-white/60">How do you want to structure your pledge?</p>
          </div>

          <div className="grid gap-4">
            {PLEDGE_TYPES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPledgeType(p.id)}
                className={`p-6 rounded-xl border-2 text-left transition-all ${
                  pledgeType === p.id
                    ? 'border-liberty-gold bg-liberty-gold/10 scale-[1.02]'
                    : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-3xl">
                    {p.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xl text-white">{p.name}</h3>
                      {pledgeType === p.id && <span className="text-liberty-gold">✓</span>}
                    </div>
                    <p className="text-white/60 mt-1">{p.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">{p.vibe}</span>
                      <span className="text-xs text-white/40">e.g. {p.example}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-4 text-lg border border-white/20 rounded-lg hover:bg-white/5"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!pledgeType}
              className="flex-1 btn-gold py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Set Rate */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="font-bebas text-4xl text-liberty-gold mb-2">Set Your Rate</h2>
            <p className="text-white/60">
              How much per {pledgeType === 'per_completed' ? 'push-up completed' : 'push-up short'}?
            </p>
          </div>

          {/* Rate presets */}
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

          {/* Custom rate */}
          <div className="relative">
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

          {/* Preview */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-liberty-blue/20 to-liberty-red/20 border border-white/10">
            <div className="text-center">
              <div className="text-white/60 mb-2">Your pledge preview</div>
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-2xl">{selectedCharity?.logo}</span>
                <span className="font-bebas text-2xl text-white">{selectedCharity?.name}</span>
              </div>
              
              <div className="text-lg text-white/80 mb-4">
                {selectedPledgeType?.emoji} ${(rateCents / 100).toFixed(2)} per push-up {pledgeType === 'per_completed' ? 'completed' : 'short'}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="text-white/50">If you complete 1,776</div>
                  <div className="font-bold text-liberty-gold text-xl">
                    ${pledgeType === 'per_completed' ? exampleCompleted : '0.00'}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="text-white/50">If you hit 1,276 (500 short)</div>
                  <div className="font-bold text-liberty-gold text-xl">
                    ${pledgeType === 'per_completed' ? ((1276 * rateCents) / 100).toFixed(2) : exampleShort}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-center">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-4 text-lg border border-white/20 rounded-lg hover:bg-white/5"
            >
              Back
            </button>
            <button
              onClick={savePledge}
              disabled={saving || rateCents < 1}
              className="flex-1 btn-gold py-4 text-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : existingPledge ? 'Update Pledge' : '🎖️ Make My Pledge'}
            </button>
          </div>

          <p className="text-center text-white/40 text-sm">
            This is an honor-system pledge. At the end of July, we'll show you your total and link to donate directly.
          </p>
        </div>
      )}
    </div>
  )
}
