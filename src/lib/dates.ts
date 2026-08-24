// Calendar-date helpers for the challenge.
//
// Every date in here used to be a 2026 literal. They now come from the season
// mirror in lib/seasons.ts, which tracks public.challenge_seasons. The exported
// names and signatures are unchanged, so callers keep working; what changed is
// that they answer for whichever season the given date falls in. Opening 2027
// is a row in challenge_seasons plus the matching entry in SEASONS, not a
// find-and-replace through this file.
//
// Two seasons, two questions: the display season is the one the boards show
// (the most recent July that has started, so the Hall of Honor keeps standing
// all offseason), and the logging season is the one a rep written now belongs
// to. These helpers are all about what a visitor sees, so they use the display
// season. The database owns whether a rep is accepted.
import { seasonForDisplay, seasonForLogging, seasonLengthInDays, type Season } from './seasons'

export { seasonForDisplay, seasonForLogging, type Season }

// Never derive "today" from Date.toISOString() — it formats in UTC, which
// rolls over to tomorrow during the US evening (8pm ET is already the next
// day in UTC). The challenge day is the user's local calendar day.
export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const CURRENT = seasonForDisplay()

// The season's goal. 1,776 in every season shipped so far.
export const CHALLENGE_TOTAL = CURRENT.goal
// The Final Push: last-day blitz — most reps logged on the last day wins.
export const FINAL_PUSH_DATE = CURRENT.finalPushOn

export function isChallengeLive(date: Date = new Date()): boolean {
  const season = seasonForDisplay(date)
  const today = localDateString(date)
  return today >= season.startsOn && today <= season.endsOn
}

// Lifecycle of the challenge, on the viewer's local calendar:
// - 'before': any day up to the day before it starts
// - 'live':   the challenge month itself
// - 'grace':  the day after it ends — the books are still open for reps that
//             didn't get logged in time (the database freezes writes at the
//             season's loggingClosesAt, after the grace day has ended in every
//             US zone)
// - 'ended':  from the day after that, standings are final
export type ChallengePhase = 'before' | 'live' | 'grace' | 'ended'

function dayAfter(day: string): string {
  const next = new Date(`${day}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString().slice(0, 10)
}

export function challengePhase(date: Date = new Date()): ChallengePhase {
  const season = seasonForDisplay(date)
  const today = localDateString(date)
  if (today < season.startsOn) return 'before'
  if (today <= season.endsOn) return 'live'
  if (today === dayAfter(season.endsOn)) return 'grace'
  return 'ended'
}

// Days of the challenge still available to log, counting today.
// The full month before the challenge starts, 0 once it's over.
export function challengeDaysRemaining(date: Date = new Date()): number {
  const season = seasonForDisplay(date)
  const today = localDateString(date)
  if (today < season.startsOn) return seasonLengthInDays(season)
  if (today > season.endsOn) return 0
  const end = Date.parse(`${season.endsOn}T00:00:00Z`)
  const now = Date.parse(`${today}T00:00:00Z`)
  return Math.round((end - now) / 86_400_000) + 1
}

// Push-ups per day to finish the whole goal by the last day, starting today.
// Equals the flat daily pace before and on day one; null once it's over.
export function catchUpPace(date: Date = new Date()): number | null {
  const daysRemaining = challengeDaysRemaining(date)
  if (daysRemaining <= 0) return null
  return Math.ceil(seasonForDisplay(date).goal / daysRemaining)
}

// "Today" for server-rendered campaign copy. Servers run on UTC, which is
// already tomorrow during the US evening; anchor to the challenge timezone
// instead so the quoted pace matches what stateside visitors see on their own
// clock.
export function easternNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: CURRENT.timeZone }))
}

// The closing bell: ONE national instant, not each viewer's own midnight.
//
// Midnight ending the last day in the last US timezone to reach it. Hawaii
// (UTC-10, never on DST) gets there at 10:00Z the next morning; Alaska, on AKDT
// (UTC-8) in July, gets there two hours earlier — so Hawaii is the one that
// decides it. Every patriot's last day is over at that instant, and that is
// when the Final Push Champion is crowned.
//
// The crown deliberately does NOT wait for the grace day. The books stay open
// until the season's loggingClosesAt (the same midnight-in-Hawaii convention,
// one day later) so late reps still count toward the goal, your state, and the
// national total. They just cannot change who won the last day: the Final Push
// is a live contest, and it closes at the bell.
export const FINAL_PUSH_DEADLINE = CURRENT.finalPushDeadline
export const FINAL_PUSH_DEADLINE_MS = Date.parse(FINAL_PUSH_DEADLINE)

// The Hall of Honor opens at the same national instant as the closing bell.
// Keep this tied to the Final Push deadline so the war room and finale can
// never disagree at handoff.
export function isHallOpen(date: Date = new Date()): boolean {
  return date.getTime() >= Date.parse(seasonForDisplay(date).finalPushDeadline)
}

// The Final Push, keyed to the bell above and the viewer's local calendar:
// - 'before':  the blitz has not opened on the viewer's clock yet
// - 'live':    the viewer's last day has started and the bell has not rung —
//              which keeps a stateside viewer live into the small hours of the
//              next morning, because they can still log last-day reps until it
//              does
// - 'results': the bell has rung, the day board is frozen, the champion stands
// - 'over':    from the day after the grace day, the Hall of Honor owns it
export type FinalPushPhase = 'before' | 'live' | 'results' | 'over'

export function finalPushPhase(date: Date = new Date()): FinalPushPhase {
  const season = seasonForDisplay(date)
  if (date.getTime() >= Date.parse(season.finalPushDeadline)) {
    return localDateString(date) >= dayAfter(dayAfter(season.endsOn)) ? 'over' : 'results'
  }
  return localDateString(date) < season.finalPushOn ? 'before' : 'live'
}

// Milliseconds until the closing bell. The same countdown for everyone in the
// country, so the bell is a single shared moment rather than six staggered
// ones. Negative once it has rung.
export function msUntilClosingBell(date: Date = new Date()): number {
  return Date.parse(seasonForDisplay(date).finalPushDeadline) - date.getTime()
}

// The blitz opens at the first US midnight of the final day — Eastern, UTC-4
// in July — and runs to the bell. Both ends are absolute instants, so this is
// safe to evaluate on a server whose clock is UTC (Vercel's is).
export const FINAL_PUSH_OPENS_MS = Date.parse(CURRENT.finalPushOpensAt)

export function isFinalPushWindow(date: Date = new Date()): boolean {
  const season = seasonForDisplay(date)
  const t = date.getTime()
  return t >= Date.parse(season.finalPushOpensAt) && t < Date.parse(season.finalPushDeadline)
}

// Where a returning patriot lands after signing in. While the blitz is running
// that is the war room: it carries its own log box, so nothing is lost by
// skipping the dashboard. At the closing bell, the Hall of Honor takes over.
//
// Deliberately NOT used by the signup flow. /dashboard is where the state and
// handle chosen during signup get written to the profile (readPendingSignup),
// so routing a brand-new patriot straight to the war room would strand them
// without either.
export function postAuthLanding(date: Date = new Date()): string {
  if (isHallOpen(date)) return '/finale'
  return isFinalPushWindow(date) ? '/final-push' : '/dashboard'
}

// Milliseconds until the Final Push opens: midnight at the start of the final
// day, local. Negative once the day is underway.
export function msUntilFinalPush(date: Date = new Date()): number {
  return new Date(`${seasonForDisplay(date).finalPushOn}T00:00:00`).getTime() - date.getTime()
}

// The live current streak, expiring a stored value the moment it goes stale.
//
// season_user_stats.current_streak is only rewritten when a log is inserted or
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
