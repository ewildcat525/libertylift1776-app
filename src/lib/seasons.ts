// The challenge is annual, so nothing about "which July" belongs in a constant
// that only one client can read.
//
// public.challenge_seasons is the source of truth. The database enforces the
// logging window, the caps and the goal against it, and any client can read it
// with the current_season() RPC — which is how the native iOS app will get
// these values without reimplementing a single rule in Swift.
//
// This file mirrors the same rows so the web bundle can render pace, phases and
// countdowns synchronously, without an await in front of every date. Keep it in
// step with supabase/migrations/20260817120000_season_model.sql: same years,
// same instants. Nothing here decides whether a rep is accepted — the database
// does that — so a stale mirror shows the wrong countdown, never the wrong data.

export interface Season {
  year: number
  name: string
  goal: number
  dailyCap: number
  perLogCap: number
  timeZone: string
  /** First day of the challenge, local calendar date. */
  startsOn: string
  /** Last day of the challenge, local calendar date. */
  endsOn: string
  /** The Final Push: the last-day blitz. */
  finalPushOn: string
  /** First instant a rep may be written for this season. */
  loggingOpensAt: string
  /** The books freeze here: midnight ending the grace day in Hawaii. */
  loggingClosesAt: string
  /** The blitz opens at the first US midnight of the final day (Eastern). */
  finalPushOpensAt: string
  /** The closing bell: midnight ending the final day in Hawaii. */
  finalPushDeadline: string
}

export const SEASONS: Season[] = [
  {
    year: 2026,
    name: 'Liberty Lift 1776 — 2026',
    goal: 1776,
    dailyCap: 500,
    perLogCap: 1000,
    timeZone: 'America/New_York',
    startsOn: '2026-07-01',
    endsOn: '2026-07-31',
    finalPushOn: '2026-07-31',
    loggingOpensAt: '2026-06-30T00:00:00Z',
    loggingClosesAt: '2026-08-02T10:00:00Z',
    finalPushOpensAt: '2026-07-31T04:00:00Z',
    finalPushDeadline: '2026-08-01T10:00:00Z',
  },
  {
    year: 2027,
    name: 'Liberty Lift 1776 — 2027',
    goal: 1776,
    dailyCap: 500,
    perLogCap: 1000,
    timeZone: 'America/New_York',
    startsOn: '2027-07-01',
    endsOn: '2027-07-31',
    finalPushOn: '2027-07-31',
    loggingOpensAt: '2027-06-30T00:00:00Z',
    loggingClosesAt: '2027-08-02T10:00:00Z',
    finalPushOpensAt: '2027-07-31T04:00:00Z',
    finalPushDeadline: '2027-08-01T10:00:00Z',
  },
]

function localDay(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function seasonByYear(year: number): Season | undefined {
  return SEASONS.find(season => season.year === year)
}

// The season the boards should show: the most recent one that has started.
// Through the offseason that stays on the finished year, so the Hall of Honor
// and the records keep standing until the next July 1 actually arrives.
// Mirrors season_for_display() in SQL.
export function seasonForDisplay(date: Date = new Date()): Season {
  const today = localDay(date)
  let current = SEASONS[0]
  for (const season of SEASONS) {
    if (season.startsOn <= today) current = season
  }
  return current
}

// The season a rep written right now would belong to: the open one, or the
// next one scheduled. Mirrors season_for_logging() in SQL.
export function seasonForLogging(date: Date = new Date()): Season {
  const t = date.getTime()
  const open = SEASONS.find(
    season =>
      t >= Date.parse(season.loggingOpensAt) && t < Date.parse(season.loggingClosesAt),
  )
  if (open) return open
  const next = SEASONS.find(season => t < Date.parse(season.loggingOpensAt))
  return next ?? SEASONS[SEASONS.length - 1]
}

// Is this calendar day inside the challenge month?
export function isSeasonDay(day: string, season: Season): boolean {
  return day >= season.startsOn && day <= season.endsOn
}

// Days in the challenge, inclusive of both ends.
export function seasonLengthInDays(season: Season): number {
  const start = Date.parse(`${season.startsOn}T00:00:00Z`)
  const end = Date.parse(`${season.endsOn}T00:00:00Z`)
  return Math.round((end - start) / 86_400_000) + 1
}
