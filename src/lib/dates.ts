// Calendar-date helpers for the challenge.
//
// Never derive "today" from Date.toISOString() — it formats in UTC, which
// rolls over to tomorrow during the US evening (8pm ET is already the next
// day in UTC). The challenge day is the user's local calendar day.
export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Challenge window: July 1-31, 2026.
export const CHALLENGE_TOTAL = 1776
// The Final Push: last-day blitz — most reps logged on July 31 wins.
export const FINAL_PUSH_DATE = '2026-07-31'
const CHALLENGE_YEAR = 2026
const JULY = 6 // Date.getMonth() is 0-indexed
const DAYS_IN_JULY = 31

export function isChallengeLive(date: Date = new Date()): boolean {
  return date.getFullYear() === CHALLENGE_YEAR && date.getMonth() === JULY
}

// Lifecycle of the challenge, on the viewer's local calendar (same convention
// as isChallengeLive — the challenge day is the user's local day):
// - 'before': any day up to June 30, 2026
// - 'live':   July 1-31, 2026 — the contest
// - 'grace':  August 1, 2026 — the books are still open for July reps that
//             didn't get logged in time (the database freezes writes at
//             2026-08-02T10:00:00Z, after Aug 1 has ended in every US zone)
// - 'ended':  August 2, 2026 onward — standings are final
export type ChallengePhase = 'before' | 'live' | 'grace' | 'ended'

const AUGUST = 7 // Date.getMonth() is 0-indexed

export function challengePhase(date: Date = new Date()): ChallengePhase {
  const year = date.getFullYear()
  const month = date.getMonth()
  if (year < CHALLENGE_YEAR || (year === CHALLENGE_YEAR && month < JULY)) return 'before'
  if (year === CHALLENGE_YEAR && month === JULY) return 'live'
  if (year === CHALLENGE_YEAR && month === AUGUST && date.getDate() === 1) return 'grace'
  return 'ended'
}

// Days of July 2026 still available to log, counting today.
// The full month before the challenge starts, 0 once it's over.
export function challengeDaysRemaining(date: Date = new Date()): number {
  const year = date.getFullYear()
  const month = date.getMonth()
  if (year < CHALLENGE_YEAR || (year === CHALLENGE_YEAR && month < JULY)) return DAYS_IN_JULY
  if (year > CHALLENGE_YEAR || month > JULY) return 0
  return DAYS_IN_JULY - date.getDate() + 1
}

// Push-ups per day to finish all 1,776 by July 31 when starting today.
// Equals DAILY_PACE (58) before and on July 1; null once July is over.
export function catchUpPace(date: Date = new Date()): number | null {
  const daysRemaining = challengeDaysRemaining(date)
  if (daysRemaining <= 0) return null
  return Math.ceil(CHALLENGE_TOTAL / daysRemaining)
}

// "Today" for server-rendered campaign copy. Servers run on UTC, which is
// already tomorrow during the US evening; anchor to US Eastern instead so
// the quoted pace matches what stateside visitors see on their own clock.
export function easternNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
}

// The Final Push, on the viewer's local calendar:
// - 'before':  any day up to July 30 — the blitz is still ahead
// - 'live':    July 31 — the war room is open
// - 'results': August 1 — the grace day, results still provisional because
//              late July 31 entries can land until the books freeze
// - 'over':    August 2 onward — the Hall of Honor owns the story
export type FinalPushPhase = 'before' | 'live' | 'results' | 'over'

export function finalPushPhase(date: Date = new Date()): FinalPushPhase {
  const today = localDateString(date)
  if (today < FINAL_PUSH_DATE) return 'before'
  if (today === FINAL_PUSH_DATE) return 'live'
  if (today === '2026-08-01') return 'results'
  return 'over'
}

// Milliseconds until the closing bell: midnight at the end of July 31 on the
// viewer's own clock. That is the real deadline they experience — the
// dashboard stamps a log at noon local for the chosen day, so a July 31 log
// from any US timezone still lands on the Eastern July 31 the day board
// buckets by. Negative once the bell has rung.
export function msUntilClosingBell(date: Date = new Date()): number {
  return new Date(CHALLENGE_YEAR, JULY, DAYS_IN_JULY + 1, 0, 0, 0, 0).getTime() - date.getTime()
}

// Milliseconds until the Final Push opens: midnight at the start of July 31,
// local. Negative once the day is underway.
export function msUntilFinalPush(date: Date = new Date()): number {
  return new Date(CHALLENGE_YEAR, JULY, DAYS_IN_JULY, 0, 0, 0, 0).getTime() - date.getTime()
}

// The live current streak, expiring a stored value the moment it goes stale.
//
// user_stats.current_streak is only rewritten when a log is inserted or
// deleted, so a user who stops logging keeps showing their last streak
// forever — the board reads "16 day streak" days after they quit. A streak
// is only alive while its last logged day is yesterday or today (US Eastern),
// matching compute_streaks() in the DB; today gets a grace day because it may
// not be logged yet. Once yesterday is missed the streak is broken, so it
// reads 0 rather than the frozen last value. Callers that read user_stats
// (or any raw current_streak + last_log_date) must pass it through here; the
// leaderboard view applies the same rule in SQL for the public boards.
export function liveStreak(
  currentStreak: number | null | undefined,
  lastLogDate: string | null | undefined,
): number {
  const streak = currentStreak ?? 0
  if (streak <= 0 || !lastLogDate) return 0
  const today = easternNow()
  const yesterday = localDateString(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1),
  )
  // last_log_date is a 'YYYY-MM-DD' date, so lexical >= is chronological >=.
  return lastLogDate >= yesterday ? streak : 0
}
