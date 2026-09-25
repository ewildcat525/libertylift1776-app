import { describe, expect, it } from 'vitest'
import { buildChartData, dailyPaceFor, paceFor, requiredPerDay, seasonDate } from '../progress'
import { seasonByYear } from '../seasons'

const season = seasonByYear(2026)!
const at = (iso: string) => new Date(iso)

describe('season calendar helpers', () => {
  it('spreads the goal over the month', () => {
    expect(dailyPaceFor(season)).toBe(58)
    expect(seasonDate(season, 4)).toBe('2026-07-04')
  })
})

describe('buildChartData', () => {
  const logs = { '2026-07-01': 60, '2026-07-02': 40, '2026-06-30': 999, '2026-08-01': 999 }

  it('accumulates only the season month', () => {
    const points = buildChartData(logs, season, at('2026-07-03T12:00:00-04:00'))
    expect(points).toHaveLength(31)
    expect(points[0].you).toBe(60)
    expect(points[1].you).toBe(100)
    expect(points[30].you).toBe(100)
    expect(points[30].pace).toBe(1776)
  })

  it('projects the pace still needed from the last full day', () => {
    const now = at('2026-07-03T12:00:00-04:00')
    const points = buildChartData(logs, season, now)
    // Anchored at day 2 (100 reps), 29 days to go including today.
    expect(points[1].required).toBe(100)
    expect(points[30].required).toBe(1776)
    expect(requiredPerDay(points, season, now)).toBe(Math.ceil((1776 - 100) / 29))
  })

  it('stops projecting once the goal is met', () => {
    const now = at('2026-07-20T12:00:00-04:00')
    const points = buildChartData({ '2026-07-10': 500, '2026-07-11': 500, '2026-07-12': 500, '2026-07-13': 276 }, season, now)
    expect(points.every(point => point.required === null)).toBe(true)
    expect(requiredPerDay(points, season, now)).toBeNull()
  })

  it('has no requirement before any data or after the month', () => {
    expect(requiredPerDay([], season)).toBeNull()
    const after = at('2026-08-05T12:00:00-04:00')
    expect(requiredPerDay(buildChartData({}, season, after), season, after)).toBeNull()
  })
})

describe('paceFor', () => {
  it('is "before" ahead of the month', () => {
    expect(paceFor(0, season, at('2026-06-20T12:00:00-04:00'))).toBe('before')
  })

  it('does not count today as owed yet', () => {
    // Day 10: 9 full days elapsed owe 9/31 of the goal (~515.6).
    const day10 = at('2026-07-10T12:00:00-04:00')
    expect(paceFor(515, season, day10)).toBe('behind')
    expect(paceFor(516, season, day10)).toBe('ontrack')
    expect(paceFor(573, season, day10)).toBe('ahead')
  })

  it('settles to complete or behind after the month', () => {
    const after = at('2026-08-05T12:00:00-04:00')
    expect(paceFor(1776, season, after)).toBe('complete')
    expect(paceFor(1775, season, after)).toBe('behind')
  })
})
