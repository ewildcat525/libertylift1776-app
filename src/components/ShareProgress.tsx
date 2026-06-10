'use client'

import { useState } from 'react'
import { track } from '@vercel/analytics'
import { US_STATES } from '@/lib/supabase'

interface ShareProgressProps {
  handle: string
  totalPushups: number
  currentStreak: number
  stateCode?: string | null
  // Where the share UI is rendered, for analytics (e.g. 'dashboard', 'log_success', 'milestone')
  context: string
  className?: string
}

function buildShareText(totalPushups: number, currentStreak: number, stateCode?: string | null) {
  const stateName = stateCode ? US_STATES[stateCode] : null
  const team = stateName ? ` for Team ${stateName}` : ''

  if (totalPushups >= 1776) {
    return `I finished the Liberty Lift 1776 challenge — all 1,776 push-ups${team}. Think you can keep up?`
  }
  if (totalPushups > 0) {
    const streak = currentStreak > 1 ? ` on a ${currentStreak}-day streak` : ''
    return `${totalPushups.toLocaleString()} push-ups down${team}${streak}. 1,776 in July. Join me:`
  }
  return `I'm doing 1,776 push-ups in July${team}. Join me:`
}

export default function ShareProgress({
  handle,
  totalPushups,
  currentStreak,
  stateCode,
  context,
  className = '',
}: ShareProgressProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/p/${encodeURIComponent(handle)}`
      : ''
  const shareText = buildShareText(totalPushups, currentStreak, stateCode)
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const nativeShare = async () => {
    track('share_clicked', { channel: 'native', context })
    try {
      await navigator.share({ title: 'Liberty Lift 1776', text: shareText, url: shareUrl })
    } catch {
      // User dismissed the share sheet; nothing to do.
    }
  }

  const shareOnX = () => {
    track('share_clicked', { channel: 'x', context })
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`
    window.open(intent, '_blank', 'noopener,noreferrer')
  }

  const copyLink = async () => {
    track('share_clicked', { channel: 'copy', context })
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard unavailable; leave the button label unchanged.
    }
  }

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      {canNativeShare && (
        <button onClick={nativeShare} className="btn-gold px-5 py-2 text-sm">
          Share your progress
        </button>
      )}
      <button
        onClick={shareOnX}
        className={canNativeShare ? 'btn-secondary px-5 py-2 text-sm' : 'btn-gold px-5 py-2 text-sm'}
      >
        Post on X
      </button>
      <button onClick={copyLink} className="btn-secondary px-5 py-2 text-sm">
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  )
}
