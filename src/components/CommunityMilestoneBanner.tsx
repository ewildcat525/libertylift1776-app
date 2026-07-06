'use client'

import { useEffect, useState } from 'react'
import { track } from '@vercel/analytics'
import { createClient, CommunityMilestone, CommunityProgress, US_STATES } from '@/lib/supabase'
import Fireworks from './Fireworks'

// Badge granted to whoever presses each milestone rep (see the
// community_milestones migration). Used for the hero's congratulations copy.
const MILESTONE_BADGES: Record<number, string> = {
  50000: 'Liberty Bell',
  100000: 'Grand Union',
}

interface CommunityMilestoneBannerProps {
  // Current user, so the patriot who rang the bell gets the hero treatment.
  userId?: string | null
  // Bump to refetch (e.g. the user's total after logging), so the banner
  // catches a milestone the moment the rep that crossed it lands.
  refreshKey?: number
  className?: string
}

// Keyed to hit_at so a re-armed milestone (a claim reset server-side, like
// the early 50k ring under the old all-logs count) celebrates again when
// it's genuinely crossed.
const seenKey = (m: CommunityMilestone) => `ll-community-milestone-${m.threshold}-${m.hit_at}-seen`

export default function CommunityMilestoneBanner({
  userId,
  refreshKey,
  className = '',
}: CommunityMilestoneBannerProps) {
  const [progress, setProgress] = useState<CommunityProgress | null>(null)
  const [celebrating, setCelebrating] = useState<CommunityMilestone | null>(null)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    supabase.rpc('get_community_progress').then(({ data }) => {
      if (cancelled || !data) return
      const next = data as CommunityProgress
      setProgress(next)

      // Fireworks once per milestone per device, for hero and crowd alike.
      const hit = [...next.milestones].reverse().find(m => m.hit_at)
      if (hit && typeof window !== 'undefined' && !localStorage.getItem(seenKey(hit))) {
        localStorage.setItem(seenKey(hit), '1')
        setCelebrating(hit)
        track('community_milestone_celebrated', {
          threshold: hit.threshold,
          hero: userId != null && hit.hit_by === userId,
        })
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  if (!progress || progress.total_pushups <= 0) return null

  const total = progress.total_pushups
  const latestHit = [...progress.milestones].reverse().find(m => m.hit_at) ?? null
  const nextUp = progress.milestones.find(m => !m.hit_at) ?? null
  const isHero = Boolean(userId && latestHit && latestHit.hit_by === userId)

  const milestoneLabel = latestHit ? latestHit.threshold.toLocaleString() : ''
  const heroName = latestHit?.hit_by_name || 'A patriot'
  const heroState = latestHit?.hit_by_state ? US_STATES[latestHit.hit_by_state] : null
  const hitDate = latestHit?.hit_at
    ? new Date(latestHit.hit_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : null

  const shareText = latestHit
    ? isHero
      ? `I pressed America's ${milestoneLabel}th push-up in the Liberty Lift 1776 challenge. 🔔🇺🇸 Every rep counts:`
      : `America just pressed past ${milestoneLabel} push-ups in the Liberty Lift 1776 challenge — and some of them were mine. 🇺🇸 Join us:`
    : ''
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const nativeShare = async () => {
    track('share_clicked', { channel: 'native', context: 'community_milestone' })
    try {
      await navigator.share({ title: 'Liberty Lift 1776', text: shareText, url: shareUrl })
    } catch {
      // User dismissed the share sheet; nothing to do.
    }
  }

  const shareOnX = () => {
    track('share_clicked', { channel: 'x', context: 'community_milestone' })
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`
    window.open(intent, '_blank', 'noopener,noreferrer')
  }

  const copyShare = async () => {
    track('share_clicked', { channel: 'copy', context: 'community_milestone' })
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard unavailable; leave the button label unchanged.
    }
  }

  return (
    <>
      {celebrating && (
        <Fireworks
          onDone={() => setCelebrating(null)}
          {...(isHero
            ? {
                title: '🔔 YOU RANG THE BELL 🔔',
                subtitle: `America's ${milestoneLabel}th push-up was yours`,
              }
            : {
                title: `🔔 ${milestoneLabel} STRONG 🔔`,
                subtitle: 'One nation. Every rep counted.',
              })}
        />
      )}

      <div className={`card p-6 sm:p-8 ${className}`}>
        <div className="text-center">
          <div className="text-[10px] text-liberty-gold font-bold uppercase tracking-[0.25em] mb-2">
            One nation, one count
          </div>
          <div className="font-bebas text-6xl sm:text-7xl text-white leading-none">
            {total.toLocaleString()}
          </div>
          <div className="text-white/50 text-sm uppercase tracking-wider mt-1">
            Push-ups pressed by all of us, together
          </div>
        </div>

        {nextUp && (
          <div className="mt-5 max-w-xl mx-auto">
            <div className="flex justify-between text-xs text-white/50 mb-1.5">
              <span>{latestHit ? `${milestoneLabel} down` : 'The whole country, counting'}</span>
              <span>Next stop: {nextUp.threshold.toLocaleString()}</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(100, (total / nextUp.threshold) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {latestHit && (
          <div className="mt-6 p-5 bg-liberty-gold/10 border border-liberty-gold/40 text-center">
            {isHero ? (
              <>
                <div className="font-bebas text-3xl sm:text-4xl text-liberty-gold">
                  🔔 YOU RANG THE BELL
                </div>
                <p className="text-white/80 mt-2">
                  America&apos;s {milestoneLabel}th push-up was yours, {heroName}. The
                  one-of-a-kind <span className="text-liberty-gold font-bold">{MILESTONE_BADGES[latestHit.threshold] || 'milestone'}</span> badge
                  now hangs in your case. History remembers.
                </p>
              </>
            ) : (
              <>
                <div className="font-bebas text-3xl sm:text-4xl text-liberty-gold">
                  🔔 {milestoneLabel} STRONG
                </div>
                <p className="text-white/80 mt-2">
                  {hitDate ? `On ${hitDate}, America` : 'America'} pressed past{' '}
                  {milestoneLabel} push-ups. {heroName}
                  {heroState ? ` of ${heroState}` : ''} pressed the rep that rang the
                  bell — but it took every single one of yours to get there. Stand
                  tall, patriot.
                </p>
              </>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {canNativeShare && (
                <button onClick={nativeShare} className="btn-gold px-5 py-2 text-sm">
                  Share the moment
                </button>
              )}
              <button
                onClick={shareOnX}
                className={canNativeShare ? 'btn-secondary px-5 py-2 text-sm' : 'btn-gold px-5 py-2 text-sm'}
              >
                Post on X
              </button>
              <button onClick={copyShare} className="btn-secondary px-5 py-2 text-sm">
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
