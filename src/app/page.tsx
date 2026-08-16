'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { track } from '@vercel/analytics'
import { createClient, US_STATES } from '@/lib/supabase'
import { captureReferralFromUrl } from '@/lib/referral'
import { catchUpPace, challengeDaysRemaining, isChallengeLive } from '@/lib/dates'
import { useHallOpen } from '@/lib/useHallOpen'
import Countdown from '@/components/Countdown'

// Hide the live counter until there is enough signal to be social proof.
const SOCIAL_PROOF_THRESHOLD = 100

// Catch-up pace for visitors landing mid-challenge. Computed after mount so
// the prerendered HTML (which has no clock) matches the first client render.
interface PaceInfo {
  reps: number
  daysLeft: number
  midChallenge: boolean
}

const challengeSteps = (pace: PaceInfo | null) => [
  {
    number: '01',
    title: 'Choose your ground',
    copy: 'Join your home state and put your reps on the national board.',
  },
  {
    number: '02',
    title: 'Put in the work',
    copy: pace?.midChallenge
      ? `Log 1776 push-ups by July 31. Starting today, that is ${pace.reps} a day.`
      : 'Log 1776 push-ups across July. That is roughly 58 a day.',
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
  const [authReady, setAuthReady] = useState(false)
  const [enlisted, setEnlisted] = useState<number | null>(null)
  const [showVideo, setShowVideo] = useState(false)
  const [liveBoard, setLiveBoard] = useState<BoardRow[] | null>(null)
  const [pace, setPace] = useState<PaceInfo | null>(null)
  const [accountDeleted, setAccountDeleted] = useState(false)
  const [nextYearEmail, setNextYearEmail] = useState('')
  const [nextYearBusy, setNextYearBusy] = useState(false)
  const [nextYearDone, setNextYearDone] = useState(false)
  const [nextYearError, setNextYearError] = useState<string | null>(null)
  const hallOpen = useHallOpen()
  const [finalCount, setFinalCount] = useState<number | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    // Once the contest wraps, the hero leads with the final nationwide count.
    if (hallOpen === true) {
      supabase.rpc('get_community_progress').then(({ data }) => {
        if (data?.total_pushups) setFinalCount(data.total_pushups as number)
      })
    }
  }, [hallOpen, supabase])

  useEffect(() => {
    setAccountDeleted(new URLSearchParams(window.location.search).get('account') === 'deleted')

    // Defer the 1.7MB hero video until after first paint; the poster carries the hero.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setTimeout(() => setShowVideo(true), 300)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const now = new Date()
    const reps = catchUpPace(now)
    if (!isChallengeLive(now) || reps === null) return
    const daysLeft = challengeDaysRemaining(now)
    setPace({ reps, daysLeft, midChallenge: daysLeft < 31 })
  }, [])

  useEffect(() => {
    captureReferralFromUrl()

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser)
      setAuthReady(true)
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
  }, [supabase])

  const postContest = hallOpen === true
  const primaryHref = postContest ? '/finale' : user ? '/dashboard' : '/signup'
  const primaryLabel = postContest
    ? 'Enter the Hall of Honor'
    : user
      ? 'Open dashboard'
      : 'Join the challenge'
  const trackCta = (location: string) => track('cta_clicked', { location })

  const joinNextYear = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const email = nextYearEmail.trim().toLowerCase()

    if (!email) {
      setNextYearError('Enter your email so we can reach you.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setNextYearError('That address is missing something. Check it and try again.')
      return
    }

    setNextYearBusy(true)
    setNextYearError(null)
    const { error } = await supabase.from('season_interests').insert({
      season_year: 2027,
      email,
      user_id: null,
      source: 'offseason_home',
    })
    setNextYearBusy(false)

    // They may already be on the 2027 list through the Hall of Honor.
    if (error && error.code !== '23505') {
      setNextYearError('Something went wrong — try again in a minute.')
      return
    }

    track('offseason_2027_signup', { already: Boolean(error) })
    setNextYearDone(true)
  }

  if (postContest) {
    const total = finalCount !== null ? finalCount.toLocaleString() : '357,879'
    const signedOut = authReady && !user
    const recruitView = !user

    return (
      <main className={`campaign-page offseason-page${recruitView ? ' offseason-page-recruit' : ''}`}>
        {accountDeleted && (
          <div className="fixed inset-x-3 top-[max(4.75rem,calc(env(safe-area-inset-top)+4.25rem))] z-[90] mx-auto max-w-lg border border-green-400/40 bg-[#10100f]/95 px-4 py-3 text-center text-sm font-semibold text-green-200 shadow-2xl backdrop-blur" role="status">
            Your account and challenge data were permanently deleted.
          </div>
        )}

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
            <Link
              href={user ? '/finale' : '#next-year'}
              className="campaign-nav-cta"
            >
              {user ? 'Hall of Honor' : 'Join the 2027 list'}
            </Link>
          </div>
        </header>

        <section className={`offseason-hero${recruitView ? ' offseason-hero-recruit' : ''}`}>
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

          <div className="offseason-content">
            <div className="campaign-kicker offseason-rise">
              <span className="campaign-kicker-line" aria-hidden="true" />
              <span>Returns July 2027</span>
            </div>

            <h1 className="offseason-title">
              <span className="offseason-rise offseason-rise-delay-1">2026</span>
              <span className="offseason-rise offseason-rise-delay-2">In the books.</span>
            </h1>

            <p className="offseason-declaration offseason-rise offseason-rise-delay-2">
              {authReady && user
                ? 'Thank you for answering the call. We’ll see you again in July 2027.'
                : 'America answered. 219 patriots logged 357,879 push-ups. We go again in July.'}
            </p>

            {authReady && user ? (
              <div className="campaign-actions offseason-actions offseason-rise offseason-rise-delay-3">
                <Link
                  href="/dashboard"
                  className="campaign-button campaign-button-primary"
                  onClick={() => trackCta('offseason_record')}
                >
                  View your 2026 record <span aria-hidden="true">→</span>
                </Link>
                <Link href="/finale" className="campaign-button campaign-button-quiet">
                  Visit the Hall of Honor
                </Link>
              </div>
            ) : authReady ? (
              <div id="next-year" className="offseason-signup-shell offseason-rise offseason-rise-delay-3">
                {nextYearDone ? (
                  <div className="offseason-success" role="status">
                    <strong>You&apos;re on the 2027 list.</strong>
                    <span>We&apos;ll send one message when July 2027 enlistment opens.</span>
                  </div>
                ) : (
                  <form onSubmit={joinNextYear} className="offseason-signup-form">
                    <label htmlFor="offseason-email">Be first to know when enlistment opens</label>
                    <div className="offseason-signup-fields">
                      <input
                        id="offseason-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={nextYearEmail}
                        onChange={(event) => {
                          setNextYearEmail(event.target.value)
                          setNextYearError(null)
                        }}
                        aria-invalid={nextYearError ? true : undefined}
                        aria-describedby={nextYearError ? 'offseason-email-note offseason-email-error' : 'offseason-email-note'}
                        placeholder="you@example.com"
                        required
                      />
                      <button type="submit" disabled={nextYearBusy}>
                        {nextYearBusy ? 'Signing you up…' : 'Count me in'}
                      </button>
                    </div>
                    <small id="offseason-email-note">One message when 2027 registration opens. Nothing else.</small>
                    {nextYearError && <p id="offseason-email-error" role="alert">{nextYearError}</p>}
                  </form>
                )}
              </div>
            ) : (
              <div className="offseason-auth-placeholder" aria-hidden="true" />
            )}
          </div>

          {authReady && user && (
            <div className="offseason-proof" aria-label="2026 final results">
              <div>
                <span className="campaign-stat-value">{total}</span>
                <span className="campaign-stat-label">push-ups together</span>
              </div>
              <div>
                <span className="campaign-stat-value">219</span>
                <span className="campaign-stat-label">patriots in 2026</span>
              </div>
            </div>
          )}
        </section>

        {signedOut && (
          <>
            <section className="offseason-impact" aria-labelledby="offseason-impact-title">
              <div className="offseason-wrap">
                <p className="offseason-section-label">The 2026 record</p>
                <h2 id="offseason-impact-title">What 219 people did in one month.</h2>
                <div className="offseason-tally">
                  <div className="offseason-stat offseason-stat-primary">
                    <strong>{total}</strong>
                    <span>Push-ups logged</span>
                  </div>
                  <div className="offseason-stat">
                    <strong>219</strong>
                    <span>Patriots enlisted</span>
                  </div>
                  <div className="offseason-stat">
                    <strong>1,634</strong>
                    <span>Average per patriot</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="offseason-hall" aria-labelledby="offseason-hall-title">
              <div className="offseason-wrap offseason-hall-inner">
                <div>
                  <p className="offseason-section-label">Hall of Honor</p>
                  <h2 id="offseason-hall-title">Every name from 2026 is still on the wall.</h2>
                </div>
                <Link
                  href="/finale"
                  className="offseason-hall-link"
                  onClick={() => trackCta('offseason_hall')}
                >
                  Explore the Hall of Honor <span aria-hidden="true">→</span>
                </Link>
              </div>
            </section>

            <footer className="offseason-footer offseason-footer-recruit">
              <p className="offseason-creed">One standard. One mission. One nation.</p>
              <div className="offseason-footer-row">
                <Link href="/" className="campaign-nav-mark" aria-label="Liberty Lift 1776 home">
                  <span className="campaign-nav-monogram" aria-hidden="true">LL</span>
                  <span className="campaign-nav-name">Liberty Lift / 1776</span>
                </Link>
                <nav aria-label="Footer">
                  <Link href="/finale">Hall of Honor</Link>
                  <Link href="/merch">Merch</Link>
                  <Link href="/support">Support</Link>
                  <Link href="/privacy">Privacy</Link>
                  <Link href="/terms">Terms</Link>
                </nav>
              </div>
            </footer>
          </>
        )}

        {authReady && user && (
          <footer className="offseason-footer">
            <span>Liberty Lift / 1776</span>
            <nav aria-label="Legal">
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </nav>
          </footer>
        )}
      </main>
    )
  }

  return (
    <main className="campaign-page">
      {accountDeleted && (
        <div className="fixed inset-x-3 top-[max(4.75rem,calc(env(safe-area-inset-top)+4.25rem))] z-[90] mx-auto max-w-lg border border-green-400/40 bg-[#10100f]/95 px-4 py-3 text-center text-sm font-semibold text-green-200 shadow-2xl backdrop-blur" role="status">
          Your account and challenge data were permanently deleted.
        </div>
      )}
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
            {postContest ? 'Finale' : user ? 'Dashboard' : 'Join now'}
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
            <span>{postContest ? 'In the books' : 'All 50 states'}</span>
          </div>

          <h1 className="campaign-title">
            <span>1776</span>
            <span>Push-ups.</span>
          </h1>

          <p className="campaign-declaration">
            {postContest ? (
              <>
                America answered.
                <br />
                The books are closed.
              </>
            ) : (
              <>
                Join your state. Log your reps.
                <br />
                Move the board.
              </>
            )}
          </p>

          {!postContest && <Countdown />}

          {!user && pace?.midChallenge && (
            <p className="campaign-late-note" role="status">
              Missed the start? Hardly. Join today, log{' '}
              <strong>{pace.reps} a day</strong>, and you still finish all 1,776
              by July 31.
            </p>
          )}

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
          {postContest ? (
            <div>
              <span className="campaign-stat-value">
                {finalCount !== null ? finalCount.toLocaleString() : '—'}
              </span>
              <span className="campaign-stat-label">push-ups, all of us together</span>
            </div>
          ) : (
            <>
              <div>
                <span className="campaign-stat-value">{pace?.midChallenge ? pace.reps : 58}</span>
                <span className="campaign-stat-label">
                  {pace?.midChallenge ? 'a day from today' : 'reps a day'}
                </span>
              </div>
              <div>
                <span className="campaign-stat-value">{pace?.midChallenge ? pace.daysLeft : 31}</span>
                <span className="campaign-stat-label">
                  {pace?.midChallenge ? 'days left in July' : 'days in July'}
                </span>
              </div>
            </>
          )}
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
          {challengeSteps(pace).map((step) => (
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
            {postContest ? 'See the final board' : 'Join your state'}{' '}
            <span aria-hidden="true">→</span>
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
            Make an optional, honor-system pledge to Wounded Warrior Project —
            a fixed amount per push-up you complete. At 5¢ a rep, finishing all
            1,776 is $88.80. At the end of July you donate directly. We never
            collect or process a dime.
          </p>
          <Link
            href={postContest ? '/pledge/leaderboard' : primaryHref}
            className="campaign-text-link"
            onClick={() => trackCta('pledge')}
          >
            {postContest ? 'See the pledge board' : 'Join, then set your pledge'}{' '}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="campaign-final">
        <div className="campaign-final-rule" />
        <span className="campaign-final-eyebrow">July 1-31, 2026</span>
        <h2>{postContest ? 'Your state answered.' : 'Will your state answer?'}</h2>
        <p>
          {postContest
            ? '1776 push-ups. Thirty-one days. History made — see you in 2027.'
            : '1776 push-ups. Thirty-one days. No spectators.'}
        </p>
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
