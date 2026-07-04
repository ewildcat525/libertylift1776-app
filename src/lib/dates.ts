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
const CHALLENGE_YEAR = 2026
const JULY = 6 // Date.getMonth() is 0-indexed
const DAYS_IN_JULY = 31

export function isChallengeLive(date: Date = new Date()): boolean {
  return date.getFullYear() === CHALLENGE_YEAR && date.getMonth() === JULY
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
