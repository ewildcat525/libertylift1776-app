'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { track } from '@vercel/analytics'
import { createClient, US_STATES } from '@/lib/supabase'
import { captureReferralFromUrl } from '@/lib/referral'
import Countdown from '@/components/Countdown'

// Hide the live counter until there is enough signal to be social proof.
const SOCIAL_PROOF_THRESHOLD = 100

const challengeSteps = [
  {
    number: '01',
    title: 'Choose your ground',
    copy: 'Join your home state and put your reps on the national board.',
  },
  {
    number: '02',
    title: 'Put in the work',
    copy: 'Log 1776 push-ups across July. That is roughly 58 a day.',
  },
  {
    number: '03',
    title: 'Bring your people',
    copy: 'Challenge friends, build a streak, and move your state up the ranks.',
  },
]

// Placeholder board shown until real reps start landing on July 1.
const previewStateRanks = [
  { rank: '01', state: 'Virginia', total: '184,932', width: '100%' },
  { rank: '02', state: 'Texas', total: '172,410', width: '91%' },
  { rank: '03', state: 'California', total: '161,088', width: '84%' },
  { rank: '04', state: 'Pennsylvania', total: '142,776', width: '72%' },
]

interface BoardRow {
  rank: string
  state: string
  total: string
  width: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [enlisted, setEnlisted] = useState<number | null>(null)
  const [showVideo, setShowVideo] = useState(false)
  const [liveBoard, setLiveBoard] = useState<BoardRow[] | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Defer the 1.7MB hero video until after first paint; the poster carries the hero.
    const timer = setTimeout(() => setShowVideo(true), 300)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    captureReferralFromUrl()

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser)
    })

    supabase.rpc('participant_count').then(({ data: count }) => {
      if (count && count >= SOCIAL_PROOF_THRESHOLD) setEnlisted(count)
    })

    // Once real reps exist, the preview board flips to live state totals.
    supabase
      .from('state_leaderboard')
      .select('state_code, total_pushups, state_rank')
      .order('state_rank', { ascending: true })
      .limit(4)
      .then(({ data: states }) => {
        if (!states || states.length === 0) return
        const top = states[0].total_pushups
        if (!top) return
        setLiveBoard(
          states.map((s) => ({
            rank: String(s.state_rank).padStart(2, '0'),
            state: US_STATES[s.state_code] || s.state_code,
            total: s.total_pushups.toLocaleString(),
            width: `${Math.max(Math.round((s.total_pushups / top) * 100), 4)}%`,
          }))
        )
      })
  }, [])

  const primaryHref = user ? '/dashboard' : '/signup'
  const primaryLabel = user ? 'Open dashboard' : 'Join the challenge'
  const trackCta = (location: string) => track('cta_clicked', { location })

  return (
    <main className="campaign-page">
      <header className="conversion-nav">
        <Link href="/" className="flex items-center gap-3 campaign-nav-mark">
          <span className="campaign-nav-monogram">LL</span>
          <span className="campaign-nav-name">Liberty Lift / 1776</span>
        </Link>

        <div className="conversion-nav-actions">
          {user ? (
            <Link href="/dashboard" className="conversion-signin">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="conversion-signin">
              Sign in
            </Link>
          )}
          <Link href={primaryHref} className="campaign-nav-cta">
            {primaryLabel}
          </Link>
        </div>
      </header>

      <section className="campaign-hero">
        {showVideo ? (
          <video
            className="campaign-hero-video"
            autoPlay
            muted
            loop
            playsInline
            poster="/liberty-lift-hero-vintage.webp"
            aria-hidden="true"
          >
            <source src="/liberty-lift-pushup-loop.mp4" type="video/mp4" />
          </video>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="campaign-hero-video"
            src="/liberty-lift-hero-vintage.webp"
            alt=""
            aria-hidden="true"
          />
        )}
        <div className="campaign-hero-wash" aria-hidden="true" />
        <div className="film-grain" aria-hidden="true" />

        <div className="campaign-hero-content">
          <div className="campaign-kicker">
            <span>July 1-31, 2026</span>
            <span className="campaign-kicker-line" />
            <span>All 50 states</span>
          </div>

          <h1 className="campaign-title">
            <span>1776</span>
            <span>Push-ups.</span>
          </h1>

          <p className="campaign-declaration">
            Join your state. Log your reps.
            <br />
            Move the board.
          </p>

          <Countdown />

          <div className="campaign-actions">
            <Link
              href={primaryHref}
              className="campaign-button campaign-button-primary"
              onClick={() => trackCta('hero')}
            >
              {primaryLabel}
              <span aria-hidden="true">→</span>
            </Link>
            {!user && (
              <Link href="/login" className="campaign-button campaign-button-quiet">
                Already joined? Sign in
              </Link>
            )}
          </div>
        </div>

        <div className="campaign-hero-footer">
          <div>
            <span className="campaign-stat-value">58</span>
            <span className="campaign-stat-label">reps a day</span>
          </div>
          <div>
            <span className="campaign-stat-value">31</span>
            <span className="campaign-stat-label">days in July</span>
          </div>
          {enlisted !== null && (
            <div>
              <span className="campaign-stat-value">{enlisted.toLocaleString()}</span>
              <span className="campaign-stat-label">patriots enlisted</span>
            </div>
          )}
          <div className="campaign-scroll-cue">
            <span>Scroll to enter</span>
            <span aria-hidden="true">↓</span>
          </div>
        </div>
      </section>

      <section className="movement-strip" aria-label="Challenge activity">
        <div className="movement-strip-track">
          <span>One nation moving</span>
          <b>1776 push-ups</b>
          <span>Fifty states competing</span>
          <b>Thirty-one days</b>
          <span>One nation moving</span>
          <b>1776 push-ups</b>
        </div>
      </section>

      <section className="campaign-section campaign-manifesto">
        <div className="campaign-section-label">The challenge</div>
        <div className="campaign-manifesto-copy">
          <h2>
            Your body.
            <br />
            Your state.
            <br />
            <em>Your move.</em>
          </h2>
          <p>
            This July, turn ordinary effort into a national challenge. Every rep
            moves your personal total and your state&apos;s place on the board.
          </p>
          <Link href={primaryHref} className="campaign-text-link">
            {primaryLabel} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="campaign-section challenge-steps-section">
        <div className="campaign-section-label">How it works</div>
        <div className="challenge-steps">
          {challengeSteps.map((step) => (
            <article key={step.number} className="challenge-step">
              <span className="challenge-step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="state-race">
        <div className="state-race-copy">
          <div className="campaign-section-label">State versus state</div>
          <h2>Every rep counts twice.</h2>
          <p>
            Once for you. Once for everyone back home. Join the board, invite
            your crew, and give your state something to rally around.
          </p>
          <Link href={primaryHref} className="campaign-button campaign-button-light">
            Join your state <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="state-board" aria-label="Example state leaderboard">
          <div className="state-board-header">
            <span>National board</span>
            <span>Push-ups logged</span>
          </div>
          {(liveBoard || previewStateRanks).map((state) => (
            <div key={state.state} className="state-rank">
              <span className="state-rank-number">{state.rank}</span>
              <div className="state-rank-main">
                <div className="state-rank-text">
                  <strong>{state.state}</strong>
                  <span>{state.total}</span>
                </div>
                <div className="state-rank-bar">
                  <span style={{ width: state.width }} />
                </div>
              </div>
            </div>
          ))}
          {!liveBoard && (
            <p className="state-board-note">Preview totals shown for campaign concept.</p>
          )}
        </div>
      </section>

      <section className="campaign-section campaign-manifesto" aria-label="Optional charity pledge">
        <div className="campaign-section-label">Optional pledge</div>
        <div className="campaign-manifesto-copy">
          <h2>
            Every rep can
            <br />
            <em>give back.</em>
          </h2>
          <p>
            Make an optional, honor-system pledge — say, 5¢ per push-up — to
            Wounded Warrior Project or Save the Children. At the end of July you
            donate directly to the charity. We never collect or process a dime.
          </p>
          <Link href={primaryHref} className="campaign-text-link" onClick={() => trackCta('pledge')}>
            Join, then set your pledge <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="campaign-final">
        <div className="campaign-final-rule" />
        <span className="campaign-final-eyebrow">July 1-31, 2026</span>
        <h2>Will your state answer?</h2>
        <p>1776 push-ups. Thirty-one days. No spectators.</p>
        <Link
          href={primaryHref}
          className="campaign-button campaign-button-primary"
          onClick={() => trackCta('final')}
        >
          {primaryLabel} <span aria-hidden="true">→</span>
        </Link>
        <div className="campaign-final-mark">LIBERTY LIFT / 1776</div>
        <div className="mt-8 flex justify-center gap-6 text-xs text-white/40">
          <Link href="/privacy" className="hover:text-white/70">Privacy</Link>
          <Link href="/terms" className="hover:text-white/70">Terms</Link>
        </div>
      </section>
    </main>
  )
}
