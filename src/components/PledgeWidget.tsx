'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface Pledge {
  id: string
  charity: 'wounded_warrior' | 'save_the_children'
  pledge_type: 'per_completed' | 'per_short'
  rate_cents: number
}

interface PledgeWidgetProps {
  userId: string
  totalPushups: number
}

const CHARITY_INFO = {
  wounded_warrior: { name: 'Wounded Warrior Project', logo: '🎖️', color: 'amber' },
  save_the_children: { name: 'Save the Children', logo: '🌍', color: 'red' },
}

export default function PledgeWidget({ userId, totalPushups }: PledgeWidgetProps) {
  const [pledge, setPledge] = useState<Pledge | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadPledge = async () => {
      const { data } = await supabase
        .from('pledges')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()
      
      setPledge(data)
      setLoading(false)
    }
    loadPledge()
  }, [userId])

  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-1/2 mb-4"></div>
        <div className="h-12 bg-white/10 rounded"></div>
      </div>
    )
  }

  // No pledge yet - show CTA
  if (!pledge) {
    return (
      <Link href="/pledge" className="block">
        <div className="card p-6 border-2 border-dashed border-liberty-gold/30 hover:border-liberty-gold/60 hover:bg-liberty-gold/5 transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bebas text-xl text-liberty-gold mb-1">Make a Pledge</h3>
              <p className="text-white/60 text-sm">Support a charity with your push-ups</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-liberty-gold/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🎗️
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex -space-x-2">
              <span className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-sm">🎖️</span>
              <span className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-sm">🌍</span>
            </div>
            <span className="text-white/50 text-sm">Wounded Warrior • Save the Children</span>
          </div>
        </div>
      </Link>
    )
  }

  // Has pledge - show status
  const charityInfo = CHARITY_INFO[pledge.charity]
  const rateDisplay = (pledge.rate_cents / 100).toFixed(2)
  
  // Calculate current pledge amount
  let pledgedAmount: number
  let pledgeDescription: string
  
  if (pledge.pledge_type === 'per_completed') {
    pledgedAmount = (totalPushups * pledge.rate_cents) / 100
    pledgeDescription = `$${rateDisplay} × ${totalPushups.toLocaleString()} push-ups`
  } else {
    const short = Math.max(0, 1776 - totalPushups)
    pledgedAmount = (short * pledge.rate_cents) / 100
    pledgeDescription = `$${rateDisplay} × ${short.toLocaleString()} short of 1,776`
  }

  // Project final amount
  const projectedFinal = pledge.pledge_type === 'per_completed' 
    ? (1776 * pledge.rate_cents) / 100 
    : 0

  return (
    <div className="card p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-liberty-gold/10 to-transparent rounded-bl-full" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-${charityInfo.color}-600/20 flex items-center justify-center text-xl`}>
              {charityInfo.logo}
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">{charityInfo.name}</h3>
              <p className="text-white/50 text-xs">
                {pledge.pledge_type === 'per_completed' ? '🥕 Per completed' : '🔥 Per short'}
              </p>
            </div>
          </div>
          <Link href="/pledge" className="text-xs text-liberty-gold hover:underline">
            Edit
          </Link>
        </div>

        <div className="text-center py-4">
          <div className="text-white/50 text-sm mb-1">Your pledge so far</div>
          <div className="font-bebas text-5xl text-liberty-gold">
            ${pledgedAmount.toFixed(2)}
          </div>
          <div className="text-white/40 text-xs mt-1">{pledgeDescription}</div>
        </div>

        {pledge.pledge_type === 'per_completed' && (
          <div className="mt-4 p-3 rounded-lg bg-white/5 text-center">
            <span className="text-white/50 text-sm">Complete all 1,776 → </span>
            <span className="font-bold text-liberty-gold">${projectedFinal.toFixed(2)}</span>
          </div>
        )}

        {pledge.pledge_type === 'per_short' && totalPushups >= 1776 && (
          <div className="mt-4 p-3 rounded-lg bg-green-500/20 text-center border border-green-500/30">
            <span className="text-green-300">🎉 You hit 1,776! $0.00 owed — donate anyway?</span>
          </div>
        )}
      </div>
    </div>
  )
}
