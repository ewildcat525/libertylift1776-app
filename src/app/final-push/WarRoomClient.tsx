'use client'

// The Final Push War Room — the last day of the 2026 Liberty Lift, live.
//
// Everywhere else in the app the Final Push is a board you refresh. Here it
// is a room you sit in: a clock counting down to the closing bell, the
// nation's reps landing on the tape as they happen, a board that reorders
// under you, and a log box so you never have to leave to answer someone
// passing you.
//
// Four looks, keyed to the viewer's local calendar day (see finalPushPhase):
// - before:  the eve — countdown to the blitz and the standard to beat
// - live:    July 31 — the war room proper
// - results: August 1 — the champion, still provisional through the grace day
// - over:    August 2 onward — the Hall of Honor owns it; we point there
//
// Liveness comes from a realtime subscription to pushup_logs inserts
// (20260730120000_final_push_war_room.sql). Every insert nudges a debounced
// refetch rather than patching state directly: the ranks, the ties and the
// state battle are all decided in SQL, and a half-applied local guess would
// show the wrong leader. A slow poll backs it up wherever realtime cannot
// connect.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { track } from '@vercel/analytics'
import type { User } from '@supabase/supabase-js'
import { createClient, US_STATES } from '@/lib/supabase'
import {
  FINAL_PUSH_DATE,
  FinalPushPhase,
  finalPushPhase,
  msUntilClosingBell,
  msUntilFinalPush,
} from '@/lib/dates'
import Navigation from '@/components/Navigation'
import Fireworks from '@/components/Fireworks'

interface BoardRow {
  id: string
  display_name: string | null
  state_code: string | null
  final_day_pushups: number
  final_push_rank: number
}

interface FeedRow {
  id: string
  created_at: string
  count: number
  user_id: string
  display_name: string | null
  state_code: string | null
}

interface StateRow {
  state_code: string
  participants: number
  total_pushups: number
  avg_pushups: number
  state_rank: number
}

interface Pulse {
  total_pushups: number
  patriots: number
  sets_logged: number
  biggest_set: number
}

// How the room escalates as the clock runs out. Everything visual keys off
// this one value so the room tightens as a whole, not piece by piece.
type Intensity = 'steady' | 'closing' | 'final-hour' | 'bell'

const BOARD_SIZE = 25
const FEED_SIZE = 18
// Realtime tells us *something* landed; this is how long we wait for the
// rest of a flurry before spending a round trip on the authoritative board.
const REFRESH_DEBOUNCE_MS = 1200
// Backstop for viewers whose realtime never connects (locked-down networks).
const POLL_MS = 25000
const DAILY_CAP = 5000

// The Eastern calendar day a log belongs to — the same bucket the day board
// uses in SQL. en-CA formats as YYYY-MM-DD, which compares lexically.
//
// Realtime hands us Postgres's own rendering of the timestamp
// ("2026-07-31 16:00:00+00"), and a space-separated datetime is outside what
// the Date constructor is specified to parse, so normalize it first. Returns
// null if it still will not parse, which callers treat as "don't know" rather
// than "not today" — a missed refetch is worse than an extra one.
function easternDay(timestamp: string): string | null {
  const parsed = new Date(timestamp.replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

function clockParts(ms: number) {
  const safe = Math.max(0, ms)
  const totalSeconds = Math.floor(safe / 1000)
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    // Hours without a days column beside them. The war room's clock has no
    // days unit, so it must read 24 at the stroke of midnight opening the
    // 31st — not 00, which would look like the bell had already rung.
    totalHours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

function intensityOf(ms: number): Intensity {
  if (ms <= 0) return 'bell'
  if (ms <= 60 * 60 * 1000) return 'final-hour'
  if (ms <= 6 * 60 * 60 * 1000) return 'closing'
  return 'steady'
}

// Animates between values on every change, so the national count visibly
// climbs each time reps land instead of snapping to a new number.
function useTicker(target: number, durationMs = 700) {
  const [display, setDisplay] = useState(target)
  // Tracks what is on screen right now, so a target that changes mid-flight
  // (a flurry of reps landing) picks up from the current number instead of
  // snapping back to where the last animation started.
  const displayRef = useRef(target)

  useEffect(() => {
    const from = displayRef.current
    if (from === target) return
    let frame: number
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = Math.round(from + (target - from) * eased)
      displayRef.current = next
      setDisplay(next)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return display
}

export default function WarRoomClient() {
  // Resolved after mount so the prerendered HTML (which has no clock)
  // matches the first client render.
  const [phase, setPhase] = useState<FinalPushPhase | null>(null)
  const [msLeft, setMsLeft] = useState<number | null>(null)

  const [user, setUser] = useState<User | null>(null)
  const [board, setBoard] = useState<BoardRow[] | null>(null)
  const [myRow, setMyRow] = useState<BoardRow | null>(null)
  const [pulse, setPulse] = useState<Pulse | null>(null)
  const [feed, setFeed] = useState<FeedRow[]>([])
  const [states, setStates] = useState<StateRow[]>([])
  const [standard, setStandard] = useState<{ name: string; best: number } | null>(null)

  // Rank movement since the previous board, held briefly so the arrow is
  // readable before it fades.
  const [moves, setMoves] = useState<Record<string, number>>({})
  const [passedAlert, setPassedAlert] = useState(false)
  const [bellShow, setBellShow] = useState(false)

  const [amount, setAmount] = useState('')
  const [logging, setLogging] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)
  const [logFlash, setLogFlash] = useState<number | null>(null)

  const supabase = useMemo(() => createClient(), [])
  const prevRanks = useRef<Record<string, number>>({})
  const myRankRef = useRef<number | null>(null)
  const bellFiredRef = useRef(false)
  // Read inside the realtime callback, which must not be torn down and
  // resubscribed just because auth resolved.
  const userIdRef = useRef<string | null>(null)
  userIdRef.current = user?.id ?? null

  // ?preview=war-room forces the live room open before the day, so the room
  // can be walked through ahead of time. Same convention as the finale's
  // ?preview=grand-finale. Everything it shows is live data — which means
  // empty boards until reps actually land on the 31st.
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get('preview') === 'war-room'
    setPreviewMode(preview)
    setPhase(preview ? 'live' : finalPushPhase())
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
  }, [supabase])

  // --- The clock -------------------------------------------------------
  // Before the day it counts down to the blitz opening; on the day, to the
  // closing bell.
  useEffect(() => {
    if (phase === null) return
    const read = () => (phase === 'before' ? msUntilFinalPush() : msUntilClosingBell())
    setMsLeft(read())
    const id = setInterval(() => setMsLeft(read()), 1000)
    return () => clearInterval(id)
  }, [phase])

  // Only the live day escalates. On the eve the same clock is counting down
  // to the blitz *opening*, and dressing that in last-hour red would spend
  // the effect a day early.
  const intensity: Intensity =
    phase === 'live' && msLeft !== null ? intensityOf(msLeft) : 'steady'

  // The bell tolls once, for whoever is still in the room when it does.
  useEffect(() => {
    if (phase !== 'live' || msLeft === null || bellFiredRef.current) return
    if (msLeft > 0) return
    bellFiredRef.current = true
    setBellShow(true)
    track('final_push_closing_bell')
  }, [phase, msLeft])

  // --- Data ------------------------------------------------------------
  const loadBoard = useCallback(async () => {
    const [boardRes, pulseRes, feedRes, stateRes] = await Promise.all([
      supabase
        .from('final_push_board')
        .select('*')
        .order('final_push_rank', { ascending: true })
        .limit(BOARD_SIZE),
      supabase.from('final_push_pulse').select('*').limit(1),
      supabase
        .from('final_push_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(FEED_SIZE),
      supabase
        .from('final_push_state_board')
        .select('*')
        .order('state_rank', { ascending: true })
        .limit(5),
    ])

    const rows = (boardRes.data as BoardRow[]) || []

    // Rank movement, measured against the board we were last showing.
    const previous = prevRanks.current
    if (Object.keys(previous).length > 0) {
      const changed: Record<string, number> = {}
      rows.forEach((row) => {
        const before = previous[row.id]
        if (before !== undefined && before !== row.final_push_rank) {
          changed[row.id] = before - row.final_push_rank
        }
      })
      if (Object.keys(changed).length > 0) {
        setMoves(changed)
        setTimeout(() => setMoves({}), 6000)
      }
    }
    prevRanks.current = Object.fromEntries(rows.map((r) => [r.id, r.final_push_rank]))

    setBoard(rows)
    setPulse(((pulseRes.data as Pulse[]) || [])[0] ?? null)
    setFeed((feedRes.data as FeedRow[]) || [])
    setStates((stateRes.data as StateRow[]) || [])

    return rows
  }, [supabase])

  // The viewer's own line, fetched separately because they may sit well
  // outside the top 25.
  const loadMyRow = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('final_push_board').select('*').eq('id', user.id).limit(1)
    const row = ((data as BoardRow[]) || [])[0] ?? null
    setMyRow(row)

    // Getting passed is the thing worth interrupting someone for.
    const before = myRankRef.current
    if (row && before !== null && row.final_push_rank > before) {
      setPassedAlert(true)
      setTimeout(() => setPassedAlert(false), 9000)
    }
    myRankRef.current = row?.final_push_rank ?? null
  }, [supabase, user])

  const refresh = useCallback(() => {
    loadBoard()
    loadMyRow()
  }, [loadBoard, loadMyRow])

  useEffect(() => {
    if (phase === null || phase === 'before') return
    refresh()
  }, [phase, refresh])

  // The standard to beat on the eve: the biggest single day anyone has put
  // up all month. best_day already lives on the leaderboard view.
  useEffect(() => {
    if (phase !== 'before') return
    supabase
      .from('leaderboard')
      .select('display_name,best_day')
      .order('best_day', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const row = (data as { display_name: string | null; best_day: number }[])?.[0]
        if (row?.best_day) setStandard({ name: row.display_name || 'A patriot', best: row.best_day })
      })
  }, [phase, supabase])

  // --- Liveness --------------------------------------------------------
  useEffect(() => {
    if (phase !== 'live') return

    let timer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(refresh, REFRESH_DEBOUNCE_MS)
    }

    // Unique per mount: a fixed channel name can collide with one that is
    // still tearing down and throw, which would take the page with it.
    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      channel = supabase
        .channel(`final-push-${Math.random().toString(36).slice(2)}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'pushup_logs' },
          (payload) => {
            const log = payload.new as { count?: number; logged_at?: string; user_id?: string }
            const day = log.logged_at ? easternDay(log.logged_at) : null
            // People are still backfilling earlier July days; only the 31st
            // belongs in this room. An unparseable date falls through to the
            // refetch, which settles it authoritatively.
            if (day !== null && day !== FINAL_PUSH_DATE) return
            // Move the national number immediately — the debounced refetch
            // replaces it with the authoritative total a beat later. Our own
            // reps are skipped here because logReps() already refreshes;
            // counting them twice would spike the number and then walk it back.
            if (day === FINAL_PUSH_DATE && log.user_id !== userIdRef.current) {
              setPulse((prev) =>
                prev ? { ...prev, total_pushups: prev.total_pushups + (log.count || 0) } : prev
              )
            }
            scheduleRefresh()
          }
        )
        .subscribe()
    } catch (err) {
      console.error('Final Push realtime unavailable:', err)
    }

    const poll = setInterval(refresh, POLL_MS)

    return () => {
      if (timer) clearTimeout(timer)
      clearInterval(poll)
      if (channel) supabase.removeChannel(channel)
    }
  }, [phase, refresh, supabase])

  useEffect(() => {
    if (phase) track('final_push_war_room_view', { phase })
  }, [phase])

  // --- Logging ---------------------------------------------------------
  const logReps = async (count: number) => {
    if (!user || logging || count < 1) return
    setLogging(true)
    setLogError(null)

    // Noon local for July 31, exactly as the dashboard stamps it, so the
    // Eastern bucketing in final_push_board catches it from any US zone.
    const loggedAt = new Date(`${FINAL_PUSH_DATE}T12:00:00`).toISOString()
    const { error } = await supabase
      .from('pushup_logs')
      .insert({ user_id: user.id, count, logged_at: loggedAt })

    if (error) {
      setLogError(error.message)
      setTimeout(() => setLogError(null), 5000)
      setLogging(false)
      return
    }

    track('pushups_logged', { count, source: 'final_push_war_room' })
    setAmount('')
    setLogFlash(count)
    setTimeout(() => setLogFlash(null), 4000)
    await refresh()
    setLogging(false)
  }

  const myTotal = myRow?.final_day_pushups ?? 0
  const capLeft = Math.max(0, DAILY_CAP - myTotal)

  // The single most motivating number in the room: what it costs to take
  // the next spot. Ranks tie, so the target is the best total still above
  // yours, not simply the row above you on screen.
  const chase = useMemo(() => {
    if (!board || !myRow) return null
    const above = board.filter((r) => r.final_day_pushups > myRow.final_day_pushups)
    if (above.length === 0) return null
    const target = above[above.length - 1]
    return { name: target.display_name || 'A patriot', gap: target.final_day_pushups - myTotal + 1 }
  }, [board, myRow, myTotal])

  const leader = board?.[0] ?? null
  const clock = clockParts(msLeft ?? 0)

  if (phase === null) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen pt-24 app-surface" />
      </>
    )
  }

  return (
    <>
      <Navigation />
      {bellShow && (
        <Fireworks
          onDone={() => setBellShow(false)}
          title="🔔 THE BELL 🔔"
          subtitle={
            leader
              ? `${leader.display_name || 'A patriot'} — ${leader.final_day_pushups.toLocaleString()} on the last day`
              : 'The 2026 Liberty Lift is complete'
          }
        />
      )}

      <div className={`min-h-screen pt-24 pb-16 px-4 app-surface warroom warroom--${intensity}`}>
        <div className="max-w-5xl mx-auto">
          {previewMode && (
            <div className="finale-preview-note" role="status">
              Private war-room preview · The boards fill with live July 31 reps on the day.
            </div>
          )}
          {/* ---------------- Header + clock ---------------- */}
          <header className="text-center">
            <div className="warroom-kicker">
              {phase === 'before'
                ? 'The eve of the last day'
                : phase === 'live'
                  ? 'Live · July 31 · The war room'
                  : phase === 'results'
                    ? 'July 31 · Final results'
                    : 'July 31 · In the books'}
            </div>
            <h1 className="warroom-title font-bebas">The Final Push</h1>
            <p className="warroom-lede">
              {phase === 'before'
                ? 'One day. As many as you can. The biggest single-day total on July 31 crowns the Final Push Champion — a permanent place in the Hall of Honor.'
                : phase === 'live'
                  ? 'Every rep in the country lands here as it happens. Log yours and watch the board move.'
                  : phase === 'results'
                    ? 'The last day of the 2026 Liberty Lift, and the patriots who emptied the tank.'
                    : 'The 2026 Liberty Lift is certified. The champion stands in the Hall of Honor.'}
            </p>

            {(phase === 'before' || phase === 'live') && msLeft !== null && (
              <div className="warroom-clock">
                <div className="warroom-clock-label">
                  {phase === 'before'
                    ? 'The blitz opens in'
                    : intensity === 'bell'
                      ? 'The bell has rung'
                      : intensity === 'final-hour'
                        ? '⚠ Final hour — everything counts'
                        : 'Until the closing bell'}
                </div>
                {intensity === 'bell' ? (
                  <div className="warroom-clock-done font-bebas">00:00:00</div>
                ) : (
                  <div className="warroom-clock-units">
                    {phase === 'before' && clock.days > 0 && (
                      <ClockUnit value={clock.days} label={clock.days === 1 ? 'Day' : 'Days'} />
                    )}
                    <ClockUnit
                      value={phase === 'before' ? clock.hours : clock.totalHours}
                      label="Hours"
                    />
                    <ClockUnit value={clock.minutes} label="Min" />
                    <ClockUnit value={clock.seconds} label="Sec" />
                  </div>
                )}
                {phase === 'live' && intensity !== 'bell' && (
                  <p className="warroom-clock-note">Midnight on your clock. Log it before then.</p>
                )}
                {intensity === 'bell' && (
                  <p className="warroom-clock-note">
                    Reps you already did today can still be logged through the grace day.
                  </p>
                )}
              </div>
            )}
          </header>

          {/* ---------------- The eve ---------------- */}
          {phase === 'before' && (
            <div className="warroom-grid mt-10">
              <section className="card p-6 sm:p-8">
                <h2 className="warroom-heading">The standard to beat</h2>
                {standard ? (
                  <>
                    <div className="warroom-standard font-bebas">{standard.best.toLocaleString()}</div>
                    <p className="text-white/60 text-sm">
                      The biggest single day anyone has put up all month —{' '}
                      <span className="text-white font-semibold">{standard.name}</span>. Tomorrow is
                      your one shot to beat it.
                    </p>
                  </>
                ) : (
                  <p className="text-white/50 text-sm">Reading the month&apos;s best day…</p>
                )}
              </section>

              <section className="card p-6 sm:p-8">
                <h2 className="warroom-heading">How it works</h2>
                <ul className="warroom-rules">
                  <li>Every rep logged on July 31 counts toward one number: your day total.</li>
                  <li>Biggest day total in the country takes the crown.</li>
                  <li>They still count for your 1,776, your state, and the national total.</li>
                  <li>The board is live — you will see the country move all day.</li>
                  <li>Cap is {DAILY_CAP.toLocaleString()} in a day. Log in sets as you go.</li>
                </ul>
              </section>
            </div>
          )}

          {phase === 'before' && (
            <div className="warroom-outro">
              <p className="warroom-outro-note">
                This room opens at midnight. Come back and bring everything you have left.
              </p>
              <Link href={user ? '/dashboard' : '/signup'} className="btn-primary">
                {user ? 'Log today’s reps' : 'Get in the fight'}
              </Link>
            </div>
          )}

          {/* ---------------- Live + results ---------------- */}
          {(phase === 'live' || phase === 'results' || phase === 'over') && (
            <>
              {/* National pulse */}
              <NationalPulse pulse={pulse} live={phase === 'live'} />

              {/* Your standing + quick log */}
              {phase === 'live' && (
                <section className="warroom-panel mt-6">
                  {user ? (
                    <>
                      <div className="warroom-standing">
                        <div>
                          <div className="warroom-standing-label">Your day</div>
                          <div className="warroom-standing-value font-bebas">
                            {myTotal.toLocaleString()}
                          </div>
                          <div className="warroom-standing-sub">
                            {myRow
                              ? `#${myRow.final_push_rank} in the nation today`
                              : 'Not on the board yet'}
                          </div>
                        </div>
                        <div className="warroom-chase">
                          {passedAlert ? (
                            <span className="warroom-chase-alert">
                              You just got passed. Answer it.
                            </span>
                          ) : chase ? (
                            <>
                              <span className="warroom-chase-number font-bebas">
                                {chase.gap.toLocaleString()}
                              </span>
                              <span className="warroom-chase-copy">
                                more to pass <strong>{chase.name}</strong>
                              </span>
                            </>
                          ) : myRow ? (
                            <>
                              <span className="warroom-chase-number font-bebas">#1</span>
                              <span className="warroom-chase-copy">
                                You lead the nation. Someone is coming.
                              </span>
                            </>
                          ) : (
                            <span className="warroom-chase-copy">
                              First set puts you on the board.
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="warroom-log">
                        <div className="warroom-log-presets">
                          {[25, 50, 100].map((n) => (
                            <button
                              key={n}
                              type="button"
                              className="warroom-preset"
                              disabled={logging || n > capLeft}
                              onClick={() => logReps(n)}
                            >
                              +{n}
                            </button>
                          ))}
                        </div>
                        <form
                          className="warroom-log-form"
                          onSubmit={(e) => {
                            e.preventDefault()
                            const n = parseInt(amount, 10)
                            if (n > 0) logReps(n)
                          }}
                        >
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={Math.max(1, Math.min(1000, capLeft))}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Reps"
                            className="input warroom-log-input"
                            disabled={logging}
                          />
                          <button
                            type="submit"
                            className="btn-primary warroom-log-submit"
                            disabled={logging || !amount}
                          >
                            {logging ? 'Logging…' : 'Log it'}
                          </button>
                        </form>
                      </div>

                      {logFlash !== null && (
                        <p className="warroom-log-flash">
                          +{logFlash.toLocaleString()} on the board. Keep going.
                        </p>
                      )}
                      {logError && <p className="warroom-log-error">{logError}</p>}
                      {capLeft === 0 && (
                        <p className="warroom-log-note">
                          You have hit the {DAILY_CAP.toLocaleString()} daily cap. That is a day to
                          be proud of.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-center">
                      <p className="text-white/70 text-sm">
                        You are watching the last day of the 2026 Liberty Lift. There is still time
                        to be in it.
                      </p>
                      <Link href="/signup" className="btn-primary mt-4">
                        Get in the fight
                      </Link>
                    </div>
                  )}
                </section>
              )}

              <div className="warroom-grid mt-6">
                {/* The board */}
                <section className="card p-5 sm:p-6">
                  <div className="warroom-panel-head">
                    <h2 className="warroom-heading mb-0">
                      {phase === 'live' ? 'The board' : 'Final day board'}
                    </h2>
                    {phase === 'live' && <span className="warroom-live-dot">Live</span>}
                  </div>

                  {board === null ? (
                    <p className="text-white/50 text-sm mt-4">Reading the board…</p>
                  ) : board.length === 0 ? (
                    <p className="text-white/50 text-sm mt-4">
                      Nobody has logged yet. The first set leads the nation.
                    </p>
                  ) : (
                    <ol className="warroom-board">
                      {board.map((row) => {
                        const move = moves[row.id]
                        return (
                          <li
                            key={row.id}
                            className={`warroom-board-row ${
                              user && row.id === user.id ? 'warroom-board-row--me' : ''
                            } ${move ? (move > 0 ? 'warroom-board-row--up' : 'warroom-board-row--down') : ''}`}
                          >
                            <span
                              className={`warroom-rank warroom-rank--${
                                row.final_push_rank <= 3 ? row.final_push_rank : 'default'
                              }`}
                            >
                              {row.final_push_rank}
                            </span>
                            <span className="warroom-board-name">
                              {row.display_name || 'A patriot'}
                              {row.state_code && (
                                <span className="warroom-board-state">
                                  {' '}
                                  · {US_STATES[row.state_code]}
                                </span>
                              )}
                            </span>
                            {move !== undefined && move !== 0 && (
                              <span className={`warroom-move ${move > 0 ? 'is-up' : 'is-down'}`}>
                                {move > 0 ? `▲${move}` : `▼${Math.abs(move)}`}
                              </span>
                            )}
                            <span className="warroom-board-total font-bebas">
                              {row.final_day_pushups.toLocaleString()}
                            </span>
                          </li>
                        )
                      })}
                    </ol>
                  )}

                  {myRow && myRow.final_push_rank > BOARD_SIZE && (
                    <p className="warroom-board-you">
                      You: <strong>{myTotal.toLocaleString()}</strong> — #{myRow.final_push_rank} in
                      the nation.
                    </p>
                  )}

                  <Link href="/leaderboard" className="warroom-link">
                    See the full day board →
                  </Link>
                </section>

                {/* The tape */}
                <section className="card p-5 sm:p-6">
                  <div className="warroom-panel-head">
                    <h2 className="warroom-heading mb-0">The tape</h2>
                    {phase === 'live' && <span className="warroom-live-dot">Live</span>}
                  </div>
                  {feed.length === 0 ? (
                    <p className="text-white/50 text-sm mt-4">Nothing on the wire yet.</p>
                  ) : (
                    <ul className="warroom-tape">
                      {feed.map((row) => (
                        <li key={row.id} className="warroom-tape-row">
                          <span className="warroom-tape-count font-bebas">+{row.count}</span>
                          <span className="warroom-tape-name">
                            {row.display_name || 'A patriot'}
                            {row.state_code && (
                              <span className="warroom-tape-state">
                                {' '}
                                · {US_STATES[row.state_code]}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              {/* State battle */}
              {states.length > 0 && (
                <section className="card p-5 sm:p-6 mt-6">
                  <h2 className="warroom-heading">
                    {phase === 'live' ? 'States emptying the tank' : 'The final day, by state'}
                  </h2>
                  <ul className="warroom-states">
                    {states.map((s) => (
                      <li key={s.state_code} className="warroom-state-row">
                        <span className="warroom-state-rank">{s.state_rank}</span>
                        <span className="warroom-state-name">{US_STATES[s.state_code]}</span>
                        <span className="warroom-state-avg">
                          {s.avg_pushups.toLocaleString()} avg · {s.participants}{' '}
                          {s.participants === 1 ? 'patriot' : 'patriots'}
                        </span>
                        <span className="warroom-state-total font-bebas">
                          {s.total_pushups.toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Where the story goes next */}
              {(phase === 'results' || phase === 'over') && (
                <div className="warroom-outro">
                  {phase === 'results' && (
                    <p className="warroom-outro-note">
                      Provisional until the books close: reps done on the 31st can still be logged
                      through the grace day.
                    </p>
                  )}
                  <Link href="/finale" className="btn-primary">
                    {phase === 'over'
                      ? 'See the champion in the Hall of Honor'
                      : 'The Hall of Honor'}
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

function ClockUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="warroom-clock-unit">
      <div className="warroom-clock-value font-bebas">{String(value).padStart(2, '0')}</div>
      <div className="warroom-clock-unit-label">{label}</div>
    </div>
  )
}

function NationalPulse({ pulse, live }: { pulse: Pulse | null; live: boolean }) {
  const total = useTicker(pulse?.total_pushups ?? 0)
  return (
    <section className="warroom-pulse mt-8">
      <div className="warroom-pulse-label">
        {live ? 'Logged across America today' : 'Logged across America on July 31'}
      </div>
      <div className="warroom-pulse-number font-bebas">{total.toLocaleString()}</div>
      <div className="warroom-pulse-stats">
        <span>
          <strong>{(pulse?.patriots ?? 0).toLocaleString()}</strong> patriots in it
        </span>
        <span>
          <strong>{(pulse?.sets_logged ?? 0).toLocaleString()}</strong> sets logged
        </span>
        <span>
          <strong>{(pulse?.biggest_set ?? 0).toLocaleString()}</strong> biggest single set
        </span>
      </div>
    </section>
  )
}
