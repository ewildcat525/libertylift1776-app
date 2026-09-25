// Which campaign emails the daily cron sends on a given challenge-timezone
// day, for whichever season that day belongs to. Every date comes from the
// season row, so opening a new July needs no change here.
import { SEASONS, type Season } from './seasons'

// A weekly nudge, on this weekday (0 = Sunday, 1 = Monday).
export const REMINDER_WEEKDAY = 1
// The finale blast goes out the day after the grace day, with this many
// extra days of retry headroom for anyone a failed batch left behind.
const FINALE_RETRY_DAYS = 2

export interface EmailDay {
  season: Season
  /** 1-based day of the challenge month. */
  dayOfChallenge: number
  launch: boolean
  reminder: boolean
  finalPush: boolean
  finale: boolean
}

export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

// Weekday (0-6) for a YYYY-MM-DD date. Noon UTC keeps the date stable.
export function weekdayOf(day: string): number {
  return new Date(`${day}T12:00:00Z`).getUTCDay()
}

function finaleOpensOn(season: Season): string {
  // The day after the grace day: the books are closed and standings final.
  return addDays(season.endsOn, 2)
}

// The emails due on `today` (YYYY-MM-DD in the season's timezone), or null
// when the day falls outside every season's email window.
export function emailDay(today: string, seasons: Season[] = SEASONS): EmailDay | null {
  const season = seasons.find(
    s => today >= s.startsOn && today <= addDays(finaleOpensOn(s), FINALE_RETRY_DAYS),
  )
  if (!season) return null

  const inChallenge = today <= season.endsOn
  const dayOfChallenge = Math.min(
    Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${season.startsOn}T12:00:00Z`)) / 86_400_000) + 1,
    Math.round((Date.parse(`${season.endsOn}T12:00:00Z`) - Date.parse(`${season.startsOn}T12:00:00Z`)) / 86_400_000) + 1,
  )

  return {
    season,
    dayOfChallenge,
    launch: today === season.startsOn,
    reminder: inChallenge && weekdayOf(today) === REMINDER_WEEKDAY,
    // The day before the blitz, with a day-of retry.
    finalPush: today === addDays(season.finalPushOn, -1) || today === season.finalPushOn,
    finale: today >= finaleOpensOn(season),
  }
}

// Ledger keys in email_campaign_sends: one per season, so a patriot mailed
// in 2026 is mailed again in 2027. Reminders are keyed by day so a re-run
// never sends the same nudge twice.
export function campaignKey(
  kind: 'launch' | 'reminder' | 'final-push' | 'finale',
  season: Season,
  today: string,
): string {
  return kind === 'reminder' ? `reminder-${today}` : `${kind}-${season.year}`
}

// The calendar day in a timezone, as YYYY-MM-DD.
export function dayInTimeZone(date: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date)
}

// Offset of `timeZone` from UTC at `instant`, in milliseconds.
function offsetMs(instant: number, timeZone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(new Date(instant))
    .find(part => part.type === 'timeZoneName')?.value
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name ?? '')
  if (!match) return 0
  const sign = match[1] === '-' ? -1 : 1
  return sign * (Number(match[2]) * 60 + Number(match[3])) * 60_000
}

// UTC instant of local midnight starting `day` in `timeZone`. Two passes
// settle the offset on days a DST change moves it.
function midnightIn(day: string, timeZone: string): number {
  const wall = Date.parse(`${day}T00:00:00Z`)
  let instant = wall - offsetMs(wall, timeZone)
  instant = wall - offsetMs(instant, timeZone)
  return instant
}

// [start, end) of a local calendar day as ISO instants, for range queries.
export function dayBounds(day: string, timeZone: string) {
  return {
    dayStart: new Date(midnightIn(day, timeZone)).toISOString(),
    dayEnd: new Date(midnightIn(addDays(day, 1), timeZone)).toISOString(),
  }
}
