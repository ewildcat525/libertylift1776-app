'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import Countdown from '@/components/Countdown'

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

const stateRanks = [
  { rank: '01', state: 'Virginia', total: '184,932', width: '100%' },
  { rank: '02', state: 'Texas', total: '172,410', width: '91%' },
  { rank: '03', state: 'California', total: '161,088', width: '84%' },
  { rank: '04', state: 'Pennsylvania', total: '142,776', width: '72%' },
]

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser)
    })
  }, [])

  const primaryHref = user ? '/dashboard' : '/signup'
  const primaryLabel = user ? 'Open dashboard' : 'Join the challenge'

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
        <video
          className="campaign-hero-video"
          autoPlay
          muted
          loop
          playsInline
          poster="/liberty-lift-hero-vintage.png"
          aria-hidden="true"
        >
          <source src="/liberty-lift-pushup-loop.mp4" type="video/mp4" />
        </video>
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
            <Link href={primaryHref} className="campaign-button campaign-button-primary">
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
          {stateRanks.map((state) => (
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
          <p className="state-board-note">Preview totals shown for campaign concept.</p>
        </div>
      </section>

      <section className="campaign-final">
        <div className="campaign-final-rule" />
        <span className="campaign-final-eyebrow">July 1-31, 2026</span>
        <h2>Will your state answer?</h2>
        <p>1776 push-ups. Thirty-one days. No spectators.</p>
        <Link href={primaryHref} className="campaign-button campaign-button-primary">
          {primaryLabel} <span aria-hidden="true">→</span>
        </Link>
        <div className="campaign-final-mark">LIBERTY LIFT / 1776</div>
      </section>
    </main>
  )
}
