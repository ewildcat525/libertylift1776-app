'use client'

import { useEffect, useState } from 'react'
import { merchConfig, ordersCloseAt } from '@/lib/merch'

// The deadline is the whole pitch of the final call, so it can't live only in
// an email — anyone who lands on /merch has to see the same clock.
function remainingLabel(now: Date) {
  const ms = ordersCloseAt.getTime() - now.getTime()
  if (ms <= 0) return null

  const totalMinutes = Math.floor(ms / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return `${days}d ${hours}h ${minutes}m left`
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

export default function MerchDeadline() {
  // Server render stays neutral; the live clock starts after hydration so the
  // markup can't mismatch.
  const [countdown, setCountdown] = useState<string | null>(null)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    function tick() {
      const label = remainingLabel(new Date())
      setCountdown(label)
      setClosed(label === null)
    }
    tick()
    const timer = setInterval(tick, 30000)
    return () => clearInterval(timer)
  }, [])

  if (closed) {
    return (
      <div className="card p-4 mb-6 border-white/20 text-center">
        <div className="app-eyebrow text-white/50">Ordering closed</div>
        <p className="text-white/60 text-sm mt-1">
          The finisher tee is no longer available. We produced only what was ordered.
        </p>
      </div>
    )
  }

  return (
    <div className="card p-4 mb-6 border-liberty-red/50 bg-liberty-red/10 text-center">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-liberty-red">
        Orders close {merchConfig.finalCall.ordersCloseLabel}
      </div>
      <p className="text-white font-bebas text-2xl leading-none mt-2">
        {countdown ?? 'Final call'}
      </p>
      <p className="text-white/50 text-xs mt-2">
        First batch arrives {merchConfig.finalCall.firstBatchLabel}. After the deadline this page
        comes down — the shirt is not offered again.
      </p>
    </div>
  )
}
