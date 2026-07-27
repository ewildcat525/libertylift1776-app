'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { track } from '@vercel/analytics'
import {
  createClient,
  CommunityProgress,
  LeaderboardEntry,
  US_STATES,
} from '@/lib/supabase'
import { challengePhase, ChallengePhase } from '@/lib/dates'
import { CHARITY_DONATE_URLS } from '@/lib/charities'
import Navigation from '@/components/Navigation'
import Fireworks from '@/components/Fireworks'
import IwoJimaFlagRaising from '@/components/IwoJimaFlagRaising'
import MoonLanding from '@/components/MoonLanding'
import ArtemisEarthset from '@/components/ArtemisEarthset'

// The five one-of-a-kind community milestones and how each one replays.
// Thresholds and badge ids match the community_milestones migrations.
type Scene = 'fireworks' | 'summit' | 'moon' | 'artemis'

const MILESTONE_META: Record<
  number,
  { badge: string; icon: string; deed: string; story: string; scene: Scene }
> = {
  50000: {
    badge: 'Liberty Bell',
    icon: '🔔',
    deed: 'Rang the bell',
    story: "Pressed America's 50,000th push-up.",
    scene: 'fireworks',
  },
  100000: {
    badge: 'Grand Union',
    icon: '🚩',
    deed: 'Carried the colors',
    story: "Pressed America's 100,000th push-up.",
    scene: 'fireworks',
  },
  177600: {
    badge: 'Flag Raiser',
    icon: '🇺🇸',
    deed: 'Raised the flag',
    story: 'Pressed the 177,600th — 1,776, a hundred times over.',
    scene: 'summit',
  },
  239000: {
    badge: 'The Eagle Has Landed',
    icon: '🌕',
    deed: 'Planted the flag on the moon',
    story: 'Pressed the 239,000th — one for every mile between Earth and the Sea of Tranquility.',
    scene: 'moon',
  },
  252757: {
    badge: 'Farther Than Artemis II',
    icon: '🌘',
    deed: 'Broke the record',
    story:
      'Pressed the 252,757th — one mile farther than Artemis II flew, past the farthest any human has ever traveled.',
    scene: 'artemis',
  },
}

interface StateRow {
  state_code: string
  participants: number
  total_pushups: number
  avg_pushups: number
  state_rank: number
}

interface FinisherRow {
  id: string
  display_name: string | null
  state_code: string | null
  total_pushups: number
}

// A replay in progress: which scene to mount and the overlay copy.
interface Replay {
  scene: Scene
  title: string
  subtitle: string
}

// Ease-out count-up for the hero number.
function useCountUp(target: number | null, durationMs = 2200) {
  const [value, setValue] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (target === null || started.current) return
    started.current = true
    let frame: number
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return value
}

// Everyone tied at the top shares the crown.
function topTied<K extends keyof LeaderboardEntry>(rows: LeaderboardEntry[], key: K) {
  if (rows.length === 0) return []
  const best = rows[0][key] ?? 0
  if (!best) return []
  return rows.filter((r) => (r[key] ?? 0) === best)
}

function championNames(rows: LeaderboardEntry[]) {
  return rows.map((r) => r.display_name || 'A patriot').join(' & ')
}

function championStates(rows: LeaderboardEntry[]) {
  const states = Array.from(
    new Set(rows.map((r) => (r.state_code ? US_STATES[r.state_code] : null)).filter(Boolean))
  )
  return states.join(' & ') || null
}

function ChampionCard({
  label,
  icon,
  name,
  detail,
  value,
  unit,
}: {
  label: string
  icon: string
  name: string
  detail: string | null
  value: string
  unit: string
}) {
  return (
    <div className="card p-6 text-center border-liberty-gold/30 hover:border-liberty-gold/60 transition-colors">
      <div className="text-3xl mb-2" aria-hidden="true">
        {icon}
      </div>
      <div className="text-[10px] text-liberty-gold font-bold uppercase tracking-[0.25em] mb-2">
        {label}
      </div>
      <div className="font-bebas text-2xl text-white truncate" title={name}>
        {name}
      </div>
      {detail && <div className="text-xs text-white/50 truncate">{detail}</div>}
      <div className="font-bebas text-4xl text-liberty-gold mt-3">{value}</div>
      <div className="text-xs text-white/50 uppercase tracking-wider">{unit}</div>
    </div>
  )
}

export default function FinaleClient() {
  const [phase, setPhase] = useState<ChallengePhase | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [progress, setProgress] = useState<CommunityProgress | null>(null)
  const [podium, setPodium] = useState<LeaderboardEntry[]>([])
  const [streakChamps, setStreakChamps] = useState<LeaderboardEntry[]>([])
  const [dayChamps, setDayChamps] = useState<LeaderboardEntry[]>([])
  const [recruitChamps, setRecruitChamps] = useState<LeaderboardEntry[]>([])
  const [states, setStates] = useState<StateRow[]>([])
  const [finishers, setFinishers] = useState<FinisherRow[]>([])
  const [finisherCount, setFinisherCount] = useState(0)
  const [pledged, setPledged] = useState<{ total: number; pledgers: number } | null>(null)
  const [participants, setParticipants] = useState<number | null>(null)
  const [replaying, setReplaying] = useState<Replay | null>(null)
  const [entranceShow, setEntranceShow] = useState(false)
  const [nextYearEmail, setNextYearEmail] = useState('')
  const [nextYearBusy, setNextYearBusy] = useState(false)
  const [nextYearDone, setNextYearDone] = useState(false)
  const [nextYearError, setNextYearError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setPhase(challengePhase())
  }, [])

  useEffect(() => {
    if (phase !== 'grace' && phase !== 'ended') return
    track('finale_viewed', { phase })

    supabase.auth.getUser().then(({ data: { user: current } }) => setUser(current))

    supabase.rpc('get_community_progress').then(({ data }) => {
      if (data) setProgress(data as CommunityProgress)
    })

    supabase.rpc('participant_count').then(({ data }) => {
      if (typeof data === 'number') setParticipants(data)
    })

    supabase
      .from('leaderboard')
      .select('*')
      .order('total_pushups', { ascending: false })
      .limit(3)
      .then(({ data }) => setPodium(data || []))

    supabase
      .from('leaderboard')
      .select('*')
      .order('longest_streak', { ascending: false })
      .limit(5)
      .then(({ data }) => setStreakChamps(topTied(data || [], 'longest_streak')))

    supabase
      .from('leaderboard')
      .select('*')
      .order('best_day', { ascending: false })
      .limit(5)
      .then(({ data }) => setDayChamps(topTied(data || [], 'best_day')))

    supabase
      .from('leaderboard')
      .select('*')
      .order('recruits', { ascending: false })
      .limit(5)
      .then(({ data }) => setRecruitChamps(topTied(data || [], 'recruits')))

    supabase
      .from('state_leaderboard')
      .select('*')
      .order('state_rank', { ascending: true })
      .limit(51)
      .then(({ data }) => setStates((data as StateRow[]) || []))

    supabase
      .from('leaderboard')
      .select('id, display_name, state_code, total_pushups', { count: 'exact' })
      .gte('total_pushups', 1776)
      .order('total_pushups', { ascending: false })
      .limit(100)
      .then(({ data, count }) => {
        setFinishers((data as FinisherRow[]) || [])
        setFinisherCount(count ?? (data?.length || 0))
      })

    supabase
      .from('pledge_leaderboard')
      .select('pledged_amount')
      .then(({ data }) => {
        if (!data) return
        const total = data.reduce(
          (sum: number, row: { pledged_amount: number | null }) => sum + (row.pledged_amount || 0),
          0
        )
        setPledged({ total, pledgers: data.length })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // One entrance fireworks show per device, once the results are final.
  useEffect(() => {
    if (phase !== 'ended' || typeof window === 'undefined') return
    if (!localStorage.getItem('ll-finale-entrance-seen')) {
      localStorage.setItem('ll-finale-entrance-seen', '1')
      setEntranceShow(true)
    }
  }, [phase])

  const total = progress?.total_pushups ?? null
  const shownTotal = useCountUp(total)

  const hitMilestones = useMemo(
    () => (progress?.milestones || []).filter((m) => m.hit_at && MILESTONE_META[m.threshold]),
    [progress]
  )

  const topStates = states.slice(0, 3)
  const poundForPound = useMemo(
    () =>
      states.length > 0
        ? [...states].sort((a, b) => (b.avg_pushups || 0) - (a.avg_pushups || 0))[0]
        : null,
    [states]
  )

  const shareText = total
    ? `America pressed ${total.toLocaleString()} push-ups in the Liberty Lift 1776 challenge. The books are closed — see the Hall of Honor: 🇺🇸`
    : 'The Liberty Lift 1776 challenge is in the books. See the Hall of Honor: 🇺🇸'
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/finale` : ''
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const nativeShare = async () => {
    track('share_clicked', { channel: 'native', context: 'finale' })
    try {
      await navigator.share({ title: 'Liberty Lift 1776', text: shareText, url: shareUrl })
    } catch {
      // User dismissed the share sheet; nothing to do.
    }
  }

  const shareOnX = () => {
    track('share_clicked', { channel: 'x', context: 'finale' })
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`
    window.open(intent, '_blank', 'noopener,noreferrer')
  }

  const copyShare = async () => {
    track('share_clicked', { channel: 'copy', context: 'finale' })
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard unavailable; leave the button label unchanged.
    }
  }

  const replayMilestone = (threshold: number) => {
    const meta = MILESTONE_META[threshold]
    if (!meta) return
    track('finale_replay', { threshold })
    setReplaying({
      scene: meta.scene,
      title:
        meta.scene === 'artemis'
          ? `🌘 ${threshold.toLocaleString()} STRONG 🌘`
          : meta.scene === 'moon'
            ? `${threshold.toLocaleString()} STRONG`
            : meta.scene === 'summit'
              ? `${threshold.toLocaleString()} STRONG`
              : `${meta.icon} ${threshold.toLocaleString()} STRONG ${meta.icon}`,
      subtitle:
        meta.scene === 'artemis'
          ? 'Farther than any human has ever traveled'
          : meta.scene === 'moon'
            ? 'One mile per rep, all the way to the moon'
            : meta.scene === 'summit'
              ? 'The flag is up. Raised together, rep by rep.'
              : 'One nation. Every rep counted.',
    })
  }

  const replayGrandFinale = () => {
    track('finale_replay', { threshold: 0 })
    setReplaying({
      scene: 'fireworks',
      title: '🎆 THE 2026 LIBERTY LIFT 🎆',
      subtitle: total ? `${total.toLocaleString()} push-ups strong` : 'One nation, one count',
    })
  }

  const joinNextYear = async (email: string) => {
    const clean = email.trim().toLowerCase()
    if (!clean || !clean.includes('@')) {
      setNextYearError('Enter a valid email address.')
      return
    }
    setNextYearBusy(true)
    setNextYearError(null)
    const { error } = await supabase
      .from('email_subscribers')
      .insert({ email: clean, source: 'finale_2027' })
    setNextYearBusy(false)
    // A duplicate means they're already on the list — that's a success.
    if (error && error.code !== '23505') {
      setNextYearError('Something went wrong — try again in a minute.')
      return
    }
    track('finale_2027_signup', { already: Boolean(error) })
    setNextYearDone(true)
  }

  // Server render and pre-mount: neutral shell, no phase-dependent content.
  if (phase === null) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center app-surface">
          <div className="text-white/50">Loading...</div>
        </div>
      </>
    )
  }

  // Before the books close, the hall is still being built.
  if (phase === 'before' || phase === 'live') {
    return (
      <>
        <Navigation />
        <div className="min-h-screen pt-24 pb-12 px-4 app-surface">
          <div className="max-w-2xl mx-auto text-center">
            <div className="app-eyebrow mb-3">Hall of Honor</div>
            <h1 className="app-title text-6xl sm:text-7xl">The doors open August 1.</h1>
            <p className="text-white/60 mt-4">
              Champions, one-of-a-kind moments, and the final nationwide count — sealed when the
              contest ends July 31. Until then, every rep still moves the board.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/dashboard" className="btn-gold px-8 py-3">
                Keep logging
              </Link>
              <Link href="/leaderboard" className="btn-secondary px-8 py-3">
                Live standings
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />

      {entranceShow && (
        <Fireworks
          onDone={() => setEntranceShow(false)}
          title="🎆 THE 2026 LIBERTY LIFT 🎆"
          subtitle="It's in the books, patriot"
        />
      )}

      {replaying &&
        (replaying.scene === 'summit' ? (
          <IwoJimaFlagRaising
            onDone={() => setReplaying(null)}
            title={replaying.title}
            subtitle={replaying.subtitle}
          />
        ) : replaying.scene === 'moon' ? (
          <MoonLanding
            onDone={() => setReplaying(null)}
            title={replaying.title}
            subtitle={replaying.subtitle}
          />
        ) : replaying.scene === 'artemis' ? (
          <ArtemisEarthset
            onDone={() => setReplaying(null)}
            title={replaying.title}
            subtitle={replaying.subtitle}
          />
        ) : (
          <Fireworks
            onDone={() => setReplaying(null)}
            title={replaying.title}
            subtitle={replaying.subtitle}
          />
        ))}

      <div className="min-h-screen pt-24 pb-12 px-4 app-surface">
        <div className="max-w-4xl mx-auto">
          {phase === 'grace' && (
            <div
              className="mb-8 p-4 bg-yellow-500/15 border border-yellow-500/40 text-center text-yellow-200 text-sm"
              role="status"
            >
              🔔 <strong>Last call.</strong> The contest ended July 31, but the books stay open
              through tonight for any July reps that didn&apos;t get logged. Standings below are
              certified in the morning.
            </div>
          )}

          {/* ============ The Final Number ============ */}
          <div className="text-center mb-12">
            <div className="app-eyebrow mb-3 justify-center">
              {phase === 'ended' ? 'Final — certified' : 'Hall of Honor'}
            </div>
            <h1 className="app-title text-6xl sm:text-8xl">The Hall of Honor</h1>
            <p className="text-white/60 mt-3">July 1–31, 2026. One nation, one count.</p>

            <div className="card p-8 sm:p-10 mt-8">
              <div className="font-bebas text-7xl sm:text-9xl text-white leading-none tabular-nums">
                {total !== null ? shownTotal.toLocaleString() : '—'}
              </div>
              <div className="text-liberty-gold text-sm uppercase tracking-[0.25em] mt-2 font-bold">
                Push-ups, pressed together
              </div>
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-6 text-sm text-white/60">
                {participants !== null && (
                  <span>
                    <strong className="text-white">{participants.toLocaleString()}</strong> patriots
                    enlisted
                  </span>
                )}
                <span>
                  <strong className="text-white">{states.length}</strong> states on the board
                </span>
                <span>
                  <strong className="text-white">{finisherCount.toLocaleString()}</strong> finished
                  all 1,776
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
                {canNativeShare && (
                  <button onClick={nativeShare} className="btn-gold px-5 py-2 text-sm">
                    Share the finale
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
          </div>

          {/* ============ Champions' Podium ============ */}
          <section className="mb-12" aria-label="Champions">
            <div className="app-eyebrow mb-4">Champions&apos; podium</div>

            {podium.length > 0 && (
              <div className="card overflow-hidden divide-y divide-white/10 mb-4">
                {podium.map((entry, index) => (
                  <div key={entry.id} className="flex items-center gap-4 p-5">
                    <div className="text-3xl" aria-hidden="true">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bebas text-2xl text-white truncate">
                        {entry.display_name || 'A patriot'}
                      </div>
                      <div className="text-sm text-white/50">
                        {entry.state_code ? US_STATES[entry.state_code] : 'No state'}
                        {index === 0 && ' — National Champion'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bebas text-3xl text-liberty-gold">
                        {entry.total_pushups.toLocaleString()}
                      </div>
                      <div className="text-xs text-white/50 uppercase">push-ups</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-4">
              {streakChamps.length > 0 && (
                <ChampionCard
                  label="Iron streak"
                  icon="🔥"
                  name={championNames(streakChamps)}
                  detail={championStates(streakChamps)}
                  value={String(streakChamps[0].longest_streak)}
                  unit="days straight"
                />
              )}
              {dayChamps.length > 0 && (
                <ChampionCard
                  label="Single-day legend"
                  icon="⚡"
                  name={championNames(dayChamps)}
                  detail={championStates(dayChamps)}
                  value={dayChamps[0].best_day.toLocaleString()}
                  unit="in one day"
                />
              )}
              {recruitChamps.length > 0 && (
                <ChampionCard
                  label="Top recruiter"
                  icon="📯"
                  name={championNames(recruitChamps)}
                  detail={championStates(recruitChamps)}
                  value={String(recruitChamps[0].recruits ?? 0)}
                  unit="patriots recruited"
                />
              )}
            </div>
          </section>

          {/* ============ State Battle ============ */}
          {topStates.length > 0 && (
            <section className="mb-12" aria-label="State results">
              <div className="app-eyebrow mb-4">The state battle</div>
              <div className="card overflow-hidden divide-y divide-white/10">
                {topStates.map((row) => (
                  <div key={row.state_code} className="flex items-center gap-4 p-5">
                    <div
                      className={`w-10 h-10 flex items-center justify-center font-bold text-lg ${
                        row.state_rank === 1
                          ? 'bg-liberty-red text-white'
                          : row.state_rank === 2
                            ? 'bg-white text-liberty-dark'
                            : 'bg-white/70 text-liberty-dark'
                      }`}
                    >
                      {String(row.state_rank).padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bebas text-2xl text-white truncate">
                        {US_STATES[row.state_code] || row.state_code}
                        {row.state_rank === 1 && (
                          <span className="ml-2 text-liberty-gold text-base align-middle">
                            🏆 Champion state
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-white/50">
                        {row.participants.toLocaleString()} patriots
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bebas text-3xl text-white">
                        {row.total_pushups.toLocaleString()}
                      </div>
                      <div className="text-xs text-white/50 uppercase">push-ups</div>
                    </div>
                  </div>
                ))}
                {poundForPound && (
                  <div className="flex items-center gap-4 p-5 bg-liberty-gold/5">
                    <div className="text-2xl" aria-hidden="true">
                      🐎
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bebas text-2xl text-liberty-gold truncate">
                        {US_STATES[poundForPound.state_code] || poundForPound.state_code}
                      </div>
                      <div className="text-sm text-white/50">
                        Pound for pound — highest average across{' '}
                        {poundForPound.participants.toLocaleString()}{' '}
                        {poundForPound.participants === 1 ? 'patriot' : 'patriots'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bebas text-3xl text-liberty-gold">
                        {poundForPound.avg_pushups.toLocaleString()}
                      </div>
                      <div className="text-xs text-white/50 uppercase">avg per patriot</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-right mt-2">
                <Link href="/states" className="text-sm text-white/50 hover:text-white">
                  Full state board →
                </Link>
              </div>
            </section>
          )}

          {/* ============ One-of-a-Kind Wall ============ */}
          {hitMilestones.length > 0 && (
            <section className="mb-12" aria-label="One-of-a-kind milestones">
              <div className="app-eyebrow mb-2">One of a kind, forever</div>
              <p className="text-white/60 text-sm mb-4 max-w-2xl">
                Five reps in history carried America past a milestone. Whoever pressed each one
                holds a badge no one else will ever earn.
              </p>
              <div className="card overflow-hidden divide-y divide-white/10">
                {hitMilestones.map((m) => {
                  const meta = MILESTONE_META[m.threshold]
                  return (
                    <div key={m.threshold} className="flex items-center gap-4 p-5">
                      <div className="text-3xl" aria-hidden="true">
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bebas text-2xl text-white truncate">
                          {m.hit_by_name || 'A patriot'}
                          {m.hit_by_state && (
                            <span className="text-white/50 text-lg">
                              {' '}
                              — {US_STATES[m.hit_by_state]}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-white/60">
                          <span className="text-liberty-gold font-bold">{meta.badge}</span> ·{' '}
                          {meta.story}
                        </div>
                      </div>
                      <button
                        onClick={() => replayMilestone(m.threshold)}
                        className="btn-secondary px-4 py-2 text-xs shrink-0"
                      >
                        ▶ Replay
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="text-center mt-4">
                <button onClick={replayGrandFinale} className="btn-gold px-6 py-2.5 text-sm">
                  🎆 Play the grand finale
                </button>
              </div>
            </section>
          )}

          {/* ============ Finishers' Roll ============ */}
          <section className="mb-12" aria-label="1776 finishers">
            <div className="app-eyebrow mb-2">The 1,776 club</div>
            {finisherCount > 0 ? (
              <>
                <p className="text-white/60 text-sm mb-4">
                  {finisherCount.toLocaleString()}{' '}
                  {finisherCount === 1 ? 'patriot' : 'patriots'} finished every last one of the
                  1,776. Founding Fathers, all.
                </p>
                <div className="card p-5 flex flex-wrap gap-2">
                  {finishers.map((f) => (
                    <span
                      key={f.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-liberty-gold/10 border border-liberty-gold/40 text-sm text-white"
                    >
                      🏛️ {f.display_name || 'A patriot'}
                      {f.state_code && <span className="text-white/50">· {f.state_code}</span>}
                    </span>
                  ))}
                  {finisherCount > finishers.length && (
                    <span className="inline-flex items-center px-3 py-1.5 text-sm text-white/50">
                      +{(finisherCount - finishers.length).toLocaleString()} more
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-white/60 text-sm">
                The full 1,776 stood unconquered this year. 2027 is waiting.
              </p>
            )}
          </section>

          {/* ============ The Shirt ============ */}
          <section className="mb-12" aria-label="Merch">
            <div className="card p-8 text-center border-liberty-gold/40">
              <div className="app-eyebrow mb-3 justify-center">Earned, not given</div>
              <h2 className="font-bebas text-4xl text-white mb-3">
                Finished all 1,776? You earned the shirt.
              </h2>
              <p className="text-white/60 text-sm max-w-lg mx-auto mb-6">
                The Reps for the Republic tee — two-sided screen print, made and printed in the
                USA — unlocks only for patriots who completed the challenge. $44 all-in, shipping
                included. Wear the proof.
              </p>
              <a
                href="/merch"
                onClick={() => track('finale_merch_cta_clicked')}
                className="btn-gold px-8 py-3 inline-block"
              >
                Claim your tee
              </a>
            </div>
          </section>

          {/* ============ For the Warriors ============ */}
          {pledged && pledged.pledgers > 0 && (
            <section className="mb-12" aria-label="Charity pledges">
              <div className="card p-8 text-center">
                <div className="app-eyebrow mb-3 justify-center">For the warriors</div>
                <div className="font-bebas text-6xl sm:text-7xl text-liberty-gold">
                  {pledged.total.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                  })}
                </div>
                <p className="text-white/60 text-sm mt-2 max-w-lg mx-auto">
                  Pledged to the Wounded Warrior Project by {pledged.pledgers.toLocaleString()}{' '}
                  {pledged.pledgers === 1 ? 'patriot' : 'patriots'} — honor-system, a few cents a
                  rep, every rep pressed for someone who gave more. Now&apos;s the time to make
                  good.
                </p>
                <div className="flex flex-wrap justify-center gap-3 mt-6">
                  <a
                    href={CHARITY_DONATE_URLS.wounded_warrior}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track('finale_donate_clicked')}
                    className="btn-gold px-8 py-3"
                  >
                    Fulfill your pledge
                  </a>
                  <Link href="/pledge/leaderboard" className="btn-secondary px-8 py-3">
                    Pledge board
                  </Link>
                </div>
              </div>
            </section>
          )}

          {/* ============ A Word of Thanks ============ */}
          <section className="mb-12" aria-label="Thank you">
            <div className="card p-8 sm:p-10">
              <div className="app-eyebrow mb-4">A word of thanks</div>
              <div className="space-y-4 text-white/80 leading-relaxed">
                <p>
                  Thirty-one days ago, this was just a number and a dare: 1,776 push-ups, one
                  month, all fifty states.
                </p>
                <p>
                  You made it something else. You logged reps in kitchens and garages and hotel
                  rooms. You dragged your friends in, talked your trash in the chat, rang the
                  bell, raised the flag, put a boot on the moon, and pushed past the farthest any
                  human has ever traveled — together, rep by rep.
                </p>
                <p>
                  Whether you pressed all 1,776 or your first 10, you showed up for your state and
                  it counted. Every single rep is in the number at the top of this page.
                </p>
                <p className="text-white">
                  Thank you, patriots. It was an honor to count alongside you.
                </p>
                <p className="text-liberty-gold font-bebas text-2xl pt-2">— Liberty Lift 1776</p>
              </div>
            </div>
          </section>

          {/* ============ See You in 2027 ============ */}
          <section aria-label="2027 signup">
            <div className="card p-8 text-center border-liberty-red/40">
              <div className="app-eyebrow mb-3 justify-center">The sequel</div>
              <h2 className="font-bebas text-4xl sm:text-5xl text-white mb-3">
                See you in July 2027.
              </h2>
              <p className="text-white/60 text-sm max-w-lg mx-auto mb-6">
                Same month. Same number. New board. Leave your email and we&apos;ll send one
                message when enlistment for the 2027 Liberty Lift opens — nothing else.
              </p>

              {nextYearDone ? (
                <div className="p-4 bg-green-500/20 border border-green-500/50 text-green-300 max-w-md mx-auto">
                  🇺🇸 You&apos;re on the roster. See you next July.
                </div>
              ) : user?.email ? (
                <button
                  onClick={() => joinNextYear(user.email as string)}
                  disabled={nextYearBusy}
                  className="btn-gold px-8 py-3 disabled:opacity-50"
                >
                  {nextYearBusy ? 'Enlisting...' : `Count me in for 2027`}
                </button>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    joinNextYear(nextYearEmail)
                  }}
                  className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto"
                >
                  <input
                    type="email"
                    value={nextYearEmail}
                    onChange={(e) => {
                      setNextYearEmail(e.target.value)
                      setNextYearError(null)
                    }}
                    placeholder="you@example.com"
                    className="input flex-1"
                    aria-label="Email address"
                    required
                  />
                  <button
                    type="submit"
                    disabled={nextYearBusy}
                    className="btn-gold px-6 py-3 disabled:opacity-50 shrink-0"
                  >
                    {nextYearBusy ? 'Enlisting...' : 'Notify me'}
                  </button>
                </form>
              )}
              {nextYearError && (
                <div role="alert" className="mt-3 text-sm text-red-300">
                  {nextYearError}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
