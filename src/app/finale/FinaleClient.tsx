'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { User } from '@supabase/supabase-js'
import { track } from '@vercel/analytics'
import {
  createClient,
  CommunityProgress,
  LeaderboardEntry,
  US_STATES,
} from '@/lib/supabase'
import { challengePhase, ChallengePhase } from '@/lib/dates'
import { useHallOpen } from '@/lib/useHallOpen'
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

// The Final Push: most reps logged on July 31 (see final_push_board).
interface FinalPushRow {
  id: string
  display_name: string | null
  state_code: string | null
  final_day_pushups: number
  final_push_rank: number
}

// A replay in progress: which scene to mount and the overlay copy.
interface Replay {
  scene: Scene
  title: string
  subtitle: string
}

interface Trophy {
  id: string
  eyebrow: string
  title: string
  name: string
  place: string | null
  value: string
  unit: string
  story: string
  tone: 'gold' | 'silver' | 'bronze' | 'crimson'
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

function TrophySculpture({ tone = 'gold' }: { tone?: Trophy['tone'] }) {
  return (
    <div className={`finale-trophy finale-trophy--${tone}`} aria-hidden="true">
      <Image
        src="/finale-trophy.jpg"
        alt=""
        fill
        sizes="(max-width: 640px) 82vw, (max-width: 1024px) 42vw, 360px"
        className="finale-trophy-image"
      />
      <div className="finale-trophy-grade" />
    </div>
  )
}

function TrophyCard({
  trophy,
  onOpen,
  featured = false,
}: {
  trophy: Trophy
  onOpen: () => void
  featured?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`finale-trophy-card ${featured ? 'finale-trophy-card--featured' : ''}`}
      aria-label={`Open ${trophy.title}: ${trophy.name}`}
    >
      <div className="finale-trophy-beam" />
      <TrophySculpture tone={trophy.tone} />
      <div className="finale-trophy-plaque">
        <span>{trophy.eyebrow}</span>
        <strong>{trophy.title}</strong>
      </div>
      <span className="finale-trophy-prompt">
        Reveal winner <span aria-hidden="true">↗</span>
      </span>
    </button>
  )
}

function TrophyReveal({ trophy, onClose }: { trophy: Trophy; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return

      const controls = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )
      if (!controls?.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="finale-reveal" role="dialog" aria-modal="true" aria-labelledby="trophy-title">
      <button
        type="button"
        className="finale-reveal-backdrop"
        onClick={onClose}
        aria-label="Close winner reveal"
      />
      <div className="finale-reveal-panel" ref={panelRef}>
        <button type="button" className="finale-reveal-close" onClick={onClose} autoFocus>
          Close <span aria-hidden="true">×</span>
        </button>
        <div className="finale-reveal-rays" aria-hidden="true" />
        <div className="finale-reveal-sculpture">
          <TrophySculpture tone={trophy.tone} />
        </div>
        <div className="finale-reveal-copy">
          <div className="finale-kicker">{trophy.eyebrow}</div>
          <h2 id="trophy-title">{trophy.title}</h2>
          <div className="finale-reveal-rule" />
          <div
            className={`finale-reveal-name ${
              trophy.name.replace(/\s/g, '').length > 13 ? 'finale-reveal-name--long' : ''
            }`}
          >
            {trophy.name}
          </div>
          {trophy.place && <div className="finale-reveal-place">{trophy.place}</div>}
          <div className="finale-reveal-record">
            <strong>{trophy.value}</strong>
            <span>{trophy.unit}</span>
          </div>
          <p>{trophy.story}</p>
          <button type="button" className="finale-reveal-done" onClick={onClose}>
            Return to the trophy room
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FinaleClient() {
  const [phase, setPhase] = useState<ChallengePhase | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [ceremony, setCeremony] = useState<'closed' | 'opening' | 'open'>('closed')
  const [activeTrophy, setActiveTrophy] = useState<Trophy | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [progress, setProgress] = useState<CommunityProgress | null>(null)
  const [podium, setPodium] = useState<LeaderboardEntry[]>([])
  const [streakChamps, setStreakChamps] = useState<LeaderboardEntry[]>([])
  const [dayChamps, setDayChamps] = useState<LeaderboardEntry[]>([])
  const [recruitChamps, setRecruitChamps] = useState<LeaderboardEntry[]>([])
  const [finalPushChamps, setFinalPushChamps] = useState<FinalPushRow[]>([])
  const [states, setStates] = useState<StateRow[]>([])
  const [finishers, setFinishers] = useState<FinisherRow[]>([])
  const [finisherCount, setFinisherCount] = useState(0)
  const [pledged, setPledged] = useState<{ total: number; pledgers: number } | null>(null)
  const [participants, setParticipants] = useState<number | null>(null)
  const [replaying, setReplaying] = useState<Replay | null>(null)
  const [nextYearEmail, setNextYearEmail] = useState('')
  const [nextYearBusy, setNextYearBusy] = useState(false)
  const [nextYearDone, setNextYearDone] = useState(false)
  const [nextYearError, setNextYearError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const trophyShelfRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const clockHallOpen = useHallOpen()
  const hallOpen = previewMode || clockHallOpen

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get('preview') === 'grand-finale'
    setPreviewMode(preview)
    setPhase(preview ? 'ended' : challengePhase())
  }, [])

  // The bell can ring on a tab that was already open, so re-read the phase.
  // Never in preview, which pins itself to 'ended' to show the certified Hall.
  useEffect(() => {
    if (clockHallOpen && !previewMode) setPhase(challengePhase())
  }, [clockHallOpen, previewMode])

  useEffect(() => {
    if (!hallOpen) return
    const navigation = document.querySelector('nav')
    if (ceremony !== 'open') {
      document.body.style.overflow = 'hidden'
      navigation?.setAttribute('inert', '')
    } else {
      document.body.style.overflow = ''
      navigation?.removeAttribute('inert')
    }
    return () => {
      document.body.style.overflow = ''
      navigation?.removeAttribute('inert')
    }
  }, [ceremony, hallOpen])

  const openCeremony = () => {
    track('finale_doors_opened', { preview: previewMode })
    setCeremony('opening')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.setTimeout(() => setCeremony('open'), reducedMotion ? 250 : 2200)
  }

  useEffect(() => {
    if (!hallOpen) return
    track('finale_viewed', { phase: previewMode ? 'ended' : challengePhase() })

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
      .from('final_push_board')
      .select('*')
      .order('final_push_rank', { ascending: true })
      .limit(5)
      .then(({ data }) => {
        const rows = (data as FinalPushRow[]) || []
        setFinalPushChamps(rows.filter((r) => r.final_push_rank === 1))
      })

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
  }, [hallOpen, previewMode])

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

  const trophies = useMemo<Trophy[]>(() => {
    const awards: Trophy[] = []
    const nationalChampion = podium[0]

    if (nationalChampion) {
      awards.push({
        id: 'national-champion',
        eyebrow: 'The 2026 crown',
        title: 'National Champion',
        name: nationalChampion.display_name || 'A patriot',
        place: nationalChampion.state_code ? US_STATES[nationalChampion.state_code] : null,
        value: nationalChampion.total_pushups.toLocaleString(),
        unit: 'push-ups across 31 days',
        story:
          'The highest total in the nation. Thirty-one days of showing up, pushing past the burn, and putting every rep on the board.',
        tone: 'gold',
      })
    }

    if (finalPushChamps.length > 0) {
      awards.push({
        id: 'final-push',
        eyebrow: 'July 31',
        title: 'Final Push',
        name: finalPushChamps.map((row) => row.display_name || 'A patriot').join(' & '),
        place:
          Array.from(
            new Set(
              finalPushChamps
                .map((row) => (row.state_code ? US_STATES[row.state_code] : null))
                .filter(Boolean)
            )
          ).join(' & ') || null,
        value: finalPushChamps[0].final_day_pushups.toLocaleString(),
        unit: 'push-ups on the final day',
        story:
          'When the clock was running out, this was the biggest closing charge in America—the last-day performance that left nothing in reserve.',
        tone: 'crimson',
      })
    }

    if (streakChamps.length > 0) {
      awards.push({
        id: 'iron-streak',
        eyebrow: 'Every day matters',
        title: 'Iron Streak',
        name: championNames(streakChamps),
        place: championStates(streakChamps),
        value: String(streakChamps[0].longest_streak),
        unit: 'days in an unbroken streak',
        story:
          'No disappearing when motivation dipped. No waiting for the perfect day. This award belongs to the relentless.',
        tone: 'silver',
      })
    }

    if (dayChamps.length > 0) {
      awards.push({
        id: 'single-day',
        eyebrow: 'One legendary session',
        title: 'Single-Day Record',
        name: championNames(dayChamps),
        place: championStates(dayChamps),
        value: dayChamps[0].best_day.toLocaleString(),
        unit: 'push-ups in one day',
        story:
          'One calendar day. One extraordinary number. The biggest single-day performance of the 2026 Liberty Lift.',
        tone: 'bronze',
      })
    }

    if (recruitChamps.length > 0) {
      awards.push({
        id: 'recruiter',
        eyebrow: 'Strength in numbers',
        title: 'The Rally Cry',
        name: championNames(recruitChamps),
        place: championStates(recruitChamps),
        value: String(recruitChamps[0].recruits ?? 0),
        unit: 'patriots brought into the challenge',
        story:
          'A movement grows because someone asks another person to join. This champion made the circle bigger.',
        tone: 'gold',
      })
    }

    if (topStates[0]) {
      awards.push({
        id: 'champion-state',
        eyebrow: 'The state battle',
        title: 'Champion State',
        name: US_STATES[topStates[0].state_code] || topStates[0].state_code,
        place: `${topStates[0].participants.toLocaleString()} patriots on the roster`,
        value: topStates[0].total_pushups.toLocaleString(),
        unit: 'push-ups pressed together',
        story:
          'The state that climbed to the top of the national board—one community total, built rep by rep.',
        tone: 'crimson',
      })
    }

    return awards
  }, [podium, finalPushChamps, streakChamps, dayChamps, recruitChamps, topStates])

  useEffect(() => {
    if (!trophies.length) return
    const frame = requestAnimationFrame(() => {
      trophyShelfRef.current?.scrollTo({ left: 0, behavior: 'auto' })
    })
    return () => cancelAnimationFrame(frame)
  }, [trophies.length])

  const certified = phase === 'ended'
  const shareText = total
    ? certified
      ? `America pressed ${total.toLocaleString()} push-ups in the Liberty Lift 1776 challenge. The books are closed — see the Hall of Honor: 🇺🇸`
      : `The closing bell has rung at ${total.toLocaleString()} push-ups. Enter the Liberty Lift 1776 Hall of Honor: 🇺🇸`
    : certified
      ? 'The Liberty Lift 1776 challenge is in the books. See the Hall of Honor: 🇺🇸'
      : 'The closing bell has rung. Enter the Liberty Lift 1776 Hall of Honor: 🇺🇸'
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

  const joinNextYear = async (email: string) => {
    const clean = email.trim().toLowerCase()
    if (!clean || !clean.includes('@')) {
      setNextYearError('Enter a valid email address.')
      return
    }
    setNextYearBusy(true)
    setNextYearError(null)
    const { error } = await supabase
      .from('season_interests')
      .insert({
        season_year: 2027,
        email: clean,
        user_id: user?.id ?? null,
        source: 'finale',
      })
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
  if (phase === null || hallOpen === null) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center app-surface">
          <div className="text-white/50">Loading...</div>
        </div>
      </>
    )
  }

  // The Hall stays locked until the single national closing bell.
  if (!hallOpen) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen pt-24 pb-12 px-4 app-surface">
          <div className="max-w-2xl mx-auto text-center">
            <div className="app-eyebrow mb-3">Hall of Honor</div>
            <h1 className="app-title text-6xl sm:text-7xl">
              The doors open at 6:00 a.m. ET on August 1.
            </h1>
            <p className="text-white/60 mt-4">
              The Hall unlocks at the national closing bell—midnight in Hawaii, when every July 31
              has ended. Until then, every rep still moves the board.
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

      {ceremony !== 'open' && (
        <div className={`finale-ceremony finale-ceremony--${ceremony}`}>
          <div className="finale-ceremony-stars" aria-hidden="true" />
          <div className="finale-door finale-door--left" aria-hidden="true">
            <Image
              src="/finale-hall-entrance-v2.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="finale-door-image"
            />
            <span className="finale-door-shade" />
          </div>
          <div className="finale-door finale-door--right" aria-hidden="true">
            <Image
              src="/finale-hall-entrance-v2.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="finale-door-image"
            />
            <span className="finale-door-shade" />
          </div>

          <div className="finale-ceremony-topline">
            <span>Liberty Lift</span>
            <b>1776</b>
            <span>{certified ? 'Final record' : 'Closing bell'}</span>
          </div>

          <div className="finale-ceremony-content">
            <div className="finale-ceremony-seal" aria-hidden="true">
              <span>LL</span>
              <small>MMXXVI</small>
            </div>
            <div className="finale-kicker">Class of 2026</div>
            <h1>The Hall <span>of Honor</span></h1>
            {certified ? (
              <p>
                The final rep is in. The records are sealed.
                <br />
                Step inside and meet the names that made history.
              </p>
            ) : (
              <p>
                The closing bell has rung. The Final Push champion is crowned.
                <br />
                Step inside while the last July logs are recorded.
              </p>
            )}
            <button type="button" onClick={openCeremony} disabled={ceremony === 'opening'}>
              <span className="finale-ceremony-button-icon" aria-hidden="true">
                {ceremony === 'opening' ? '•••' : '✦'}
              </span>
              <span>{ceremony === 'opening' ? 'Doors opening' : 'Enter the Hall'}</span>
              <span aria-hidden="true">→</span>
            </button>
            <div className="finale-ceremony-index" aria-hidden="true">
              <span>Champions</span>
              <i />
              <span>Records</span>
              <i />
              <span>Finishers</span>
            </div>
          </div>
          <button
            type="button"
            className="finale-ceremony-skip"
            onClick={() => setCeremony('open')}
          >
            Skip ceremony
          </button>
        </div>
      )}

      {activeTrophy && (
        <TrophyReveal trophy={activeTrophy} onClose={() => setActiveTrophy(null)} />
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

      <div
        className={`finale-page min-h-screen pt-24 pb-12 px-4 app-surface ${
          ceremony === 'open' ? 'finale-page--revealed' : ''
        }`}
        aria-hidden={ceremony !== 'open'}
      >
        <div className="max-w-6xl mx-auto">
          {previewMode && (
            <div className="finale-preview-note" role="status">
              Private grand-finale preview · Live standings are shown until the books close.
            </div>
          )}
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
          <header className="finale-hero text-center">
            <div className="finale-kicker">
              {phase === 'ended' ? 'Final — certified' : 'Hall of Honor'}
            </div>
            <h1>The Hall <em>of Honor</em></h1>
            <p className="finale-hero-subtitle">July 1–31, 2026 · One nation · One count</p>

            <div className="finale-total">
              <div className="finale-total-label">Together, America pressed</div>
              <div className="finale-total-number">
                {total !== null ? shownTotal.toLocaleString() : '—'}
              </div>
              <div className="finale-total-unit">
                push-ups
              </div>
              <div className="finale-total-stats">
                {participants !== null && (
                  <span>
                    <strong>{participants.toLocaleString()}</strong>
                    <small>patriots enlisted</small>
                  </span>
                )}
                <span>
                  <strong>{states.length}</strong>
                  <small>states on the board</small>
                </span>
                <span>
                  <strong>{finisherCount.toLocaleString()}</strong>
                  <small>finished all 1,776</small>
                </span>
              </div>
              <div className="finale-share-actions">
                {canNativeShare && (
                  <button onClick={nativeShare} className="finale-share-primary">
                    Share the finale
                  </button>
                )}
                <button
                  onClick={shareOnX}
                  className={canNativeShare ? '' : 'finale-share-primary'}
                >
                  Post on X
                </button>
                <button onClick={copyShare}>
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
              </div>
            </div>
          </header>

          {/* ============ Interactive Trophy Room ============ */}
          <section className="finale-trophy-room" aria-labelledby="trophy-room-title">
            <div className="finale-section-heading">
              <div>
                <div className="finale-kicker">The trophy room</div>
                <h2 id="trophy-room-title">Choose an award. Meet a legend.</h2>
              </div>
              <p>Every trophy holds a story. Browse the shelf and tap one to reveal its champion.</p>
            </div>

            {trophies.length > 0 ? (
              <div className="finale-trophy-grid" ref={trophyShelfRef}>
                {trophies.map((trophy, index) => (
                  <TrophyCard
                    key={trophy.id}
                    trophy={trophy}
                    featured={index === 0}
                    onOpen={() => {
                      track('finale_trophy_opened', { trophy: trophy.id })
                      setActiveTrophy(trophy)
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="finale-trophy-loading">The engraver is setting the final names…</div>
            )}

            {podium.length > 1 && (
              <div className="finale-podium" aria-label="National podium">
                {podium.map((entry, index) => (
                  <div key={entry.id} className={`finale-podium-place finale-podium-place--${index + 1}`}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <small>{index === 0 ? 'National champion' : `${index + 1}${index === 1 ? 'nd' : 'rd'} place`}</small>
                      <strong>{entry.display_name || 'A patriot'}</strong>
                      <em>{entry.state_code ? US_STATES[entry.state_code] : 'America'}</em>
                    </div>
                    <b>{entry.total_pushups.toLocaleString()}</b>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ============ The Finisher's Case ============ */}
          <section className="finale-merch-showcase" aria-labelledby="finisher-shirt-title">
            <div className="finale-merch-heading">
              <div className="finale-kicker">The finisher&apos;s case</div>
              <span>Official issue · Class of 2026</span>
            </div>

            <div className="finale-merch-case">
              <div className="finale-merch-visual">
                <Image
                  src="/merch/finale-shirt-case.png"
                  alt="The Reps for the Republic finisher shirt mounted in a championship display case"
                  fill
                  sizes="(max-width: 850px) 100vw, 52vw"
                  className="finale-merch-image"
                />
                <div className="finale-merch-glass" aria-hidden="true" />
                <div className="finale-merch-plaque" aria-hidden="true">
                  <span>Liberty Lift 1776</span>
                  <strong>Official Finisher Issue</strong>
                  <small>Earned July 2026</small>
                </div>
              </div>

              <div className="finale-merch-copy">
                <div className="finale-merch-serial">No. 1776 · Authorized finisher gear</div>
                <h2 id="finisher-shirt-title">
                  The only shirt in the store <em>you can&apos;t simply buy.</em>
                </h2>
                <p>
                  This is the uniform of the 1,776 Club. It unlocks only after the final rep is
                  logged—a two-sided, American-made record that you finished what you started.
                </p>

                <div className="finale-merch-details" aria-label="Shirt details">
                  <div>
                    <span>Entry requirement</span>
                    <strong>All 1,776 reps</strong>
                  </div>
                  <div>
                    <span>Edition</span>
                    <strong>2026 finisher issue</strong>
                  </div>
                  <div>
                    <span>Made</span>
                    <strong>Printed in the USA</strong>
                  </div>
                  <div>
                    <span>Delivered</span>
                    <strong>$44 · Shipping included</strong>
                  </div>
                </div>

                <Link
                  href="/merch"
                  onClick={() => track('finale_merch_cta_clicked')}
                  className="finale-merch-cta"
                >
                  <span>Claim the shirt you earned</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <small className="finale-merch-note">
                  Finisher status is verified before ordering.
                </small>
              </div>
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
          <section id="next-year" className="scroll-mt-24" aria-label="2027 interest list">
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
