'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { merchConfig, merchTotal, formatUsd } from '@/lib/merch'

const THRESHOLD = merchConfig.unlock.threshold

type GateState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'locked'; total: number }
  | { status: 'unlocked' }

export default function MerchBuy() {
  const [gate, setGate] = useState<GateState>({ status: 'loading' })
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        setGate({ status: 'signed-out' })
        return
      }
      const { data } = await supabase
        .from('user_stats')
        .select('total_pushups')
        .eq('user_id', user.id)
        .maybeSingle()
      if (cancelled) return
      const total = data?.total_pushups ?? 0
      setGate(total >= THRESHOLD ? { status: 'unlocked' } : { status: 'locked', total })
    }
    check()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {/* In-flow CTA block (all breakpoints; sticky bar below is mobile-only) */}
      <div className="card p-6 text-center">
        <GateBody gate={gate} />
      </div>

      {/* Sticky mobile bar: price + current gate state always in reach */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-liberty-dark/95 backdrop-blur border-t border-white/15 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="shrink-0">
            <div className="font-bebas text-2xl text-white leading-none">
              {formatUsd(merchTotal)}
            </div>
            <div className="text-white/50 text-[10px] uppercase tracking-[0.12em] font-bold">
              all-in, shipping included
            </div>
          </div>
          <StickyAction gate={gate} />
        </div>
      </div>
    </>
  )
}

function BuyButton({ className = '' }: { className?: string }) {
  if (!merchConfig.stripePaymentLink) {
    return (
      <span className={`btn-primary opacity-40 cursor-not-allowed select-none ${className}`} aria-disabled="true">
        Coming soon
      </span>
    )
  }
  return (
    <a href={merchConfig.stripePaymentLink} className={`btn-primary ${className}`}>
      Buy — {formatUsd(merchTotal)} all-in
    </a>
  )
}

function ProgressBar({ total }: { total: number }) {
  const pct = Math.min(100, (total / THRESHOLD) * 100)
  return (
    <div className="h-2 bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={total} aria-valuemin={0} aria-valuemax={THRESHOLD}>
      <div className="h-full bg-liberty-red" style={{ width: `${pct}%` }} />
    </div>
  )
}

function GateBody({ gate }: { gate: GateState }) {
  const goal = THRESHOLD.toLocaleString()

  if (gate.status === 'loading') {
    return <p className="text-white/40 text-sm uppercase tracking-[0.12em] font-bold py-4">Checking your reps&hellip;</p>
  }

  if (gate.status === 'signed-out') {
    return (
      <>
        <h2 className="font-bebas text-3xl text-white mb-2">Locked. This one&apos;s earned.</h2>
        <p className="text-white/60 text-sm mb-5 max-w-md mx-auto">
          You can&apos;t buy this shirt — you unlock it. Finish all {goal} push-ups
          and ordering opens up. Sign in to check your progress.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup" className="btn-primary px-8 py-3">Accept the challenge</Link>
          <Link href="/login" className="btn-secondary px-8 py-3">Sign in</Link>
        </div>
      </>
    )
  }

  if (gate.status === 'locked') {
    const remaining = THRESHOLD - gate.total
    return (
      <>
        <h2 className="font-bebas text-3xl text-white mb-2">
          {remaining.toLocaleString()} reps between you and this shirt
        </h2>
        <p className="text-white/60 text-sm mb-4 max-w-md mx-auto">
          Ordering unlocks when you finish the challenge. You&apos;re at{' '}
          <span className="text-white font-bold">{gate.total.toLocaleString()}</span> of {goal} —
          keep pushing.
        </p>
        <div className="max-w-md mx-auto mb-5">
          <ProgressBar total={gate.total} />
        </div>
        <Link href="/dashboard" className="btn-secondary px-8 py-3">Log push-ups</Link>
      </>
    )
  }

  return (
    <>
      <h2 className="font-bebas text-3xl text-liberty-gold mb-2">Unlocked. You did the work.</h2>
      <p className="text-white/60 text-sm mb-5">
        {goal} push-ups, done. {merchConfig.fulfillment.preorderNote}
      </p>
      <BuyButton className="px-10 py-4 text-lg" />
      <p className="text-white/50 text-xs uppercase tracking-[0.12em] font-bold mt-3">
        Apple Pay &middot; Google Pay &middot; Card
      </p>
    </>
  )
}

function StickyAction({ gate }: { gate: GateState }) {
  const base = 'flex-1 max-w-[220px] py-3'
  switch (gate.status) {
    case 'loading':
      return <span className={`btn-primary opacity-40 ${base}`} aria-disabled="true">&hellip;</span>
    case 'signed-out':
      return <Link href="/login" className={`btn-secondary ${base}`}>Sign in to unlock</Link>
    case 'locked':
      return (
        <span className={`btn-primary opacity-40 cursor-not-allowed select-none text-center leading-tight ${base}`} aria-disabled="true">
          {(THRESHOLD - gate.total).toLocaleString()} reps to go
        </span>
      )
    case 'unlocked':
      return <BuyButton className={base} />
  }
}
