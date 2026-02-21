'use client'

import { useEffect, useState } from 'react'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export default function Countdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const july1 = new Date('2026-07-01T00:00:00')
      const now = new Date()
      const diff = july1.getTime() - now.getTime()

      if (diff <= 0) {
        setIsLive(true)
        return null
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      }
    }

    setTimeLeft(calculateTimeLeft())
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  if (isLive) {
    return (
      <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-liberty-red/20 border border-liberty-red animate-pulse">
        <span className="text-2xl">🔥</span>
        <span className="text-lg font-bold text-liberty-red">CHALLENGE IS LIVE!</span>
        <span className="text-2xl">🔥</span>
      </div>
    )
  }

  if (!timeLeft) {
    return null
  }

  return (
    <div className="text-center">
      <div className="text-sm text-white/60 uppercase tracking-widest mb-4">
        ⭐ Challenge begins in ⭐
      </div>
      <div className="flex justify-center gap-3 sm:gap-4">
        <CountdownUnit value={timeLeft.days} label="Days" />
        <CountdownUnit value={timeLeft.hours} label="Hours" />
        <CountdownUnit value={timeLeft.minutes} label="Min" />
        <CountdownUnit value={timeLeft.seconds} label="Sec" />
      </div>
    </div>
  )
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white/5 border border-liberty-gold/30 rounded-lg px-3 sm:px-5 py-3 min-w-[60px] sm:min-w-[80px] transition-all hover:border-liberty-gold hover:bg-liberty-gold/10">
      <div className="font-bebas text-3xl sm:text-4xl text-liberty-gold leading-none">
        {String(value).padStart(2, '0')}
      </div>
      <div className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  )
}
