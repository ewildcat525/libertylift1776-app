'use client'

import { useEffect, useState } from 'react'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export default function Countdown({
  className = '',
  hideWhenLive = false,
}: {
  className?: string
  hideWhenLive?: boolean
}) {
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

  if (isLive && hideWhenLive) {
    return null
  }

  if (isLive) {
    return (
      <div className={`campaign-countdown campaign-countdown-live ${className}`.trim()}>
        <span>Challenge is live</span>
      </div>
    )
  }

  if (!timeLeft) {
    return null
  }

  return (
    <div className={`campaign-countdown ${className}`.trim()} aria-label="Challenge countdown">
      <div className="campaign-countdown-label">
        Starts July 1
      </div>
      <div className="campaign-countdown-units">
        <CountdownUnit value={timeLeft.days} label="Days" />
        <CountdownUnit value={timeLeft.hours} label="Hours" />
        <CountdownUnit value={timeLeft.minutes} label="Min" />
      </div>
    </div>
  )
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="campaign-countdown-unit">
      <div className="campaign-countdown-value">
        {String(value).padStart(2, '0')}
      </div>
      <div className="campaign-countdown-unit-label">
        {label}
      </div>
    </div>
  )
}
