// These run with TZ=America/New_York (see the `test` script), so "local"
// means US Eastern — the same clock most patriots log on.
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  catchUpPace,
  challengeDaysRemaining,
  challengePhase,
  finalPushPhase,
  isChallengeLive,
  isFinalPushWindow,
  isHallOpen,
  liveStreak,
  localDateString,
  msUntilClosingBell,
  postAuthLanding,
} from '../dates'

const at = (iso: string) => new Date(iso)

describe('localDateString', () => {
  it('uses the local calendar day, not UTC', () => {
    // 8:30pm Eastern on July 1 is already July 2 in UTC.
    expect(localDateString(at('2026-07-02T00:30:00Z'))).toBe('2026-07-01')
  })
})

describe('challengePhase', () => {
  it.each([
    ['2026-06-30T23:59:00-04:00', 'before'],
    ['2026-07-01T00:00:00-04:00', 'live'],
    ['2026-07-31T23:59:00-04:00', 'live'],
    ['2026-08-01T12:00:00-04:00', 'grace'],
    ['2026-08-02T00:00:00-04:00', 'ended'],
    ['2026-09-23T12:00:00-04:00', 'ended'],
  ])('%s is %s', (iso, phase) => {
    expect(challengePhase(at(iso))).toBe(phase)
  })

  it('moves to the next season once its July starts', () => {
    expect(challengePhase(at('2027-06-30T12:00:00-04:00'))).toBe('ended')
    expect(challengePhase(at('2027-07-01T00:00:00-04:00'))).toBe('live')
  })
})

describe('isChallengeLive', () => {
  it('is true only during the challenge month', () => {
    expect(isChallengeLive(at('2026-07-15T12:00:00-04:00'))).toBe(true)
    expect(isChallengeLive(at('2026-08-01T12:00:00-04:00'))).toBe(false)
  })
})

describe('challengeDaysRemaining and catchUpPace', () => {
  it('counts today on the first and last day', () => {
    expect(challengeDaysRemaining(at('2026-07-01T09:00:00-04:00'))).toBe(31)
    expect(challengeDaysRemaining(at('2026-07-31T09:00:00-04:00'))).toBe(1)
  })

  it('gives the full month before it starts and zero after', () => {
    expect(challengeDaysRemaining(at('2026-06-15T09:00:00-04:00'))).toBe(31)
    expect(challengeDaysRemaining(at('2026-08-01T09:00:00-04:00'))).toBe(0)
  })

  it('spreads the goal over the remaining days', () => {
    expect(catchUpPace(at('2026-07-01T09:00:00-04:00'))).toBe(Math.ceil(1776 / 31))
    expect(catchUpPace(at('2026-07-31T09:00:00-04:00'))).toBe(1776)
    expect(catchUpPace(at('2026-08-01T09:00:00-04:00'))).toBeNull()
  })
})

describe('the Final Push and the closing bell', () => {
  it.each([
    ['2026-07-30T23:59:00-04:00', 'before'],
    ['2026-07-31T00:00:00-04:00', 'live'],
    // 5:59am Eastern on August 1 is still before midnight in Hawaii.
    ['2026-08-01T09:59:59Z', 'live'],
    ['2026-08-01T10:00:00Z', 'results'],
    ['2026-08-02T00:00:00-04:00', 'over'],
  ])('%s is %s', (iso, phase) => {
    expect(finalPushPhase(at(iso))).toBe(phase)
  })

  it('opens the window at Eastern midnight and closes it at the bell', () => {
    expect(isFinalPushWindow(at('2026-07-31T03:59:59Z'))).toBe(false)
    expect(isFinalPushWindow(at('2026-07-31T04:00:00Z'))).toBe(true)
    expect(isFinalPushWindow(at('2026-08-01T09:59:59Z'))).toBe(true)
    expect(isFinalPushWindow(at('2026-08-01T10:00:00Z'))).toBe(false)
  })

  it('opens the Hall of Honor at the bell', () => {
    expect(isHallOpen(at('2026-08-01T09:59:59Z'))).toBe(false)
    expect(isHallOpen(at('2026-08-01T10:00:00Z'))).toBe(true)
    expect(msUntilClosingBell(at('2026-08-01T09:59:00Z'))).toBe(60_000)
  })

  it('routes signed-in patriots to the right room', () => {
    expect(postAuthLanding(at('2026-07-15T12:00:00-04:00'))).toBe('/dashboard')
    expect(postAuthLanding(at('2026-07-31T12:00:00-04:00'))).toBe('/final-push')
    expect(postAuthLanding(at('2026-08-01T10:00:00Z'))).toBe('/finale')
  })
})

describe('liveStreak', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps a streak alive through today and yesterday only', () => {
    vi.useFakeTimers()
    vi.setSystemTime(at('2026-07-20T12:00:00-04:00'))
    expect(liveStreak(5, '2026-07-20')).toBe(5)
    expect(liveStreak(5, '2026-07-19')).toBe(5)
    expect(liveStreak(5, '2026-07-18')).toBe(0)
  })

  it('treats missing values as no streak', () => {
    expect(liveStreak(null, '2026-07-20')).toBe(0)
    expect(liveStreak(3, null)).toBe(0)
  })

  it('uses the Eastern day even late in the evening', () => {
    vi.useFakeTimers()
    // 11pm Eastern on July 20 is already July 21 in UTC.
    vi.setSystemTime(at('2026-07-21T03:00:00Z'))
    expect(liveStreak(4, '2026-07-19')).toBe(4)
  })
})
