import { describe, expect, it } from 'vitest'
import { campaignKey, dayBounds, emailDay } from '../email-schedule'

describe('emailDay', () => {
  it('sends nothing outside a season window', () => {
    expect(emailDay('2026-06-30')).toBeNull()
    expect(emailDay('2026-08-05')).toBeNull()
    expect(emailDay('2026-09-23')).toBeNull()
  })

  it('launches on the first day', () => {
    expect(emailDay('2026-07-01')).toMatchObject({ launch: true, dayOfChallenge: 1 })
    expect(emailDay('2027-07-01')).toMatchObject({ launch: true, season: { year: 2027 } })
  })

  it('reminds on Mondays in the challenge month only', () => {
    expect(emailDay('2026-07-06')?.reminder).toBe(true) // Monday
    expect(emailDay('2026-07-07')?.reminder).toBe(false)
    expect(emailDay('2026-08-03')?.reminder).toBe(false) // Monday, but over
    expect(emailDay('2027-07-05')?.reminder).toBe(true) // Monday in 2027
  })

  it('announces the Final Push on the eve with a day-of retry', () => {
    expect(emailDay('2026-07-29')?.finalPush).toBe(false)
    expect(emailDay('2026-07-30')).toMatchObject({ finalPush: true, dayOfChallenge: 30 })
    expect(emailDay('2026-07-31')).toMatchObject({ finalPush: true, dayOfChallenge: 31 })
  })

  it('sends the finale after the grace day, with retry headroom', () => {
    expect(emailDay('2026-08-01')?.finale).toBe(false)
    expect(emailDay('2026-08-02')?.finale).toBe(true)
    expect(emailDay('2026-08-04')?.finale).toBe(true)
  })
})

describe('campaignKey', () => {
  it('scopes one-time campaigns to the season and reminders to the day', () => {
    const season = emailDay('2027-07-05')!.season
    expect(campaignKey('launch', season, '2027-07-01')).toBe('launch-2027')
    expect(campaignKey('finale', season, '2027-08-02')).toBe('finale-2027')
    expect(campaignKey('reminder', season, '2027-07-05')).toBe('reminder-2027-07-05')
  })
})

describe('dayBounds', () => {
  it('uses the zone offset in effect on that day', () => {
    expect(dayBounds('2026-07-15', 'America/New_York')).toEqual({
      dayStart: '2026-07-15T04:00:00.000Z',
      dayEnd: '2026-07-16T04:00:00.000Z',
    })
    expect(dayBounds('2026-12-15', 'America/New_York').dayStart).toBe('2026-12-15T05:00:00.000Z')
  })

  it('spans 23 hours on the spring-forward day', () => {
    const { dayStart, dayEnd } = dayBounds('2027-03-14', 'America/New_York')
    expect(dayStart).toBe('2027-03-14T05:00:00.000Z')
    expect(dayEnd).toBe('2027-03-15T04:00:00.000Z')
  })
})
