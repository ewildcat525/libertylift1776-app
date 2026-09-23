// A patriot's progress through one season: the cumulative chart, the pace
// verdict and the per-day target to still finish. Pure functions of the daily
// totals and the clock, so the dashboard renders them and the tests pin them.
import { localDateString } from './dates'
import { seasonLengthInDays, type Season } from './seasons'

export type ChartPoint = { day: number; pace: number; you: number; required: number | null }
export type Pace = 'before' | 'ahead' | 'ontrack' | 'behind' | 'complete'

// The flat daily pace that reaches the goal on the final day.
export function dailyPaceFor(season: Season): number {
  return Math.ceil(season.goal / seasonLengthInDays(season))
}

// YYYY-MM-DD for the nth (1-based) day of the season's month.
export function seasonDate(season: Season, day: number): string {
  return `${season.startsOn.slice(0, 8)}${String(day).padStart(2, '0')}`
}

export function seasonDayNumber(date: string, season: Season): number {
  const start = Date.parse(`${season.startsOn}T00:00:00Z`)
  const current = Date.parse(`${date}T00:00:00Z`)
  return Math.round((current - start) / 86_400_000) + 1
}

// Day of the season the "required pace" projection starts from, clamped to
// the challenge window. Returns one past the final day once it is over.
export function requiredStartDay(now: Date, season: Season): number {
  const today = localDateString(now)
  if (today < season.startsOn) return 1
  if (today > season.endsOn) return seasonLengthInDays(season) + 1
  return seasonDayNumber(today, season)
}

export function buildChartData(
  logs: Record<string, number>,
  season: Season,
  now: Date = new Date(),
): ChartPoint[] {
  const daysInSeason = seasonLengthInDays(season)
  const dailyPace = dailyPaceFor(season)
  const seasonLogs: Record<number, number> = {}
  for (let d = 1; d <= daysInSeason; d++) seasonLogs[d] = 0
  Object.entries(logs).forEach(([dateStr, count]) => {
    if (dateStr >= season.startsOn && dateStr <= season.endsOn) {
      seasonLogs[seasonDayNumber(dateStr, season)] = count
    }
  })

  let cumulative = 0
  const points: ChartPoint[] = Array.from({ length: daysInSeason }, (_, i) => {
    const day = i + 1
    cumulative += seasonLogs[day]
    return { day, pace: Math.min(season.goal, Math.round(dailyPace * day)), you: cumulative, required: null }
  })

  // Straight line to the goal on the final day, anchored at the last elapsed day.
  // Today is still in progress, so it counts as one of the remaining days.
  const startDay = requiredStartDay(now, season)
  const anchorDay = startDay - 1
  const anchorTotal = anchorDay >= 1 ? points[anchorDay - 1].you : 0
  const currentTotal = points[Math.min(startDay, daysInSeason) - 1].you
  const daysLeft = daysInSeason - anchorDay
  if (currentTotal < season.goal && daysLeft > 0) {
    const perDay = (season.goal - anchorTotal) / daysLeft
    for (let day = Math.max(anchorDay, 1); day <= daysInSeason; day++) {
      points[day - 1].required = Math.round(anchorTotal + perDay * (day - anchorDay))
    }
  }

  return points
}

// Push-ups per day needed (today included) to reach the goal by the final
// day, or null when there is no chart yet, the goal is met, or time is up.
export function requiredPerDay(chartData: ChartPoint[], season: Season, now: Date = new Date()): number | null {
  if (chartData.length === 0) return null
  const daysInSeason = seasonLengthInDays(season)
  const startDay = requiredStartDay(now, season)
  const anchorDay = startDay - 1
  const anchorTotal = anchorDay >= 1 ? chartData[anchorDay - 1]?.you ?? 0 : 0
  const currentTotal = chartData[Math.min(startDay, daysInSeason) - 1]?.you ?? 0
  if (currentTotal >= season.goal || anchorDay >= daysInSeason) return null
  return Math.ceil((season.goal - anchorTotal) / (daysInSeason - anchorDay))
}

export function paceFor(total: number, season: Season, now: Date = new Date()): Pace {
  const today = localDateString(now)
  if (today < season.startsOn) return 'before'
  if (today > season.endsOn) return total >= season.goal ? 'complete' : 'behind'

  const daysInSeason = seasonLengthInDays(season)
  const dayOfSeason = seasonDayNumber(today, season)
  // The current day is still in progress, so its target isn't owed yet.
  // You're only "behind" if you've fallen short of the days that have
  // already fully elapsed. Once you've met that, you're "on track" until
  // you clear today's cumulative target, at which point you're "ahead".
  const requiredByYesterday = ((dayOfSeason - 1) / daysInSeason) * season.goal
  const targetByToday = (dayOfSeason / daysInSeason) * season.goal
  if (total >= targetByToday) return 'ahead'
  if (total < requiredByYesterday) return 'behind'
  return 'ontrack'
}
