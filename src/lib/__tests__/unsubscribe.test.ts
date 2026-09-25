import { afterEach, describe, expect, it, vi } from 'vitest'
import { unsubscribeToken, verifyUnsubscribeToken } from '../email'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('unsubscribe tokens', () => {
  it('round-trips and rejects forgeries', () => {
    vi.stubEnv('UNSUBSCRIBE_SECRET', 'unsub')
    vi.stubEnv('CRON_SECRET', 'cron')
    const token = unsubscribeToken('profile', 'abc')!
    expect(verifyUnsubscribeToken('profile', 'abc', token)).toBe(true)
    expect(verifyUnsubscribeToken('profile', 'abd', token)).toBe(false)
    expect(verifyUnsubscribeToken('subscriber', 'abc', token)).toBe(false)
    expect(verifyUnsubscribeToken('profile', 'abc', 'short')).toBe(false)
  })

  it('keeps links signed with CRON_SECRET working', () => {
    vi.stubEnv('UNSUBSCRIBE_SECRET', '')
    vi.stubEnv('CRON_SECRET', 'cron')
    const legacy = unsubscribeToken('profile', 'abc')!

    vi.stubEnv('UNSUBSCRIBE_SECRET', 'unsub')
    expect(unsubscribeToken('profile', 'abc')).not.toBe(legacy)
    expect(verifyUnsubscribeToken('profile', 'abc', legacy)).toBe(true)
  })

  it('survives a CRON_SECRET rotation once UNSUBSCRIBE_SECRET is set', () => {
    vi.stubEnv('UNSUBSCRIBE_SECRET', 'old-cron')
    vi.stubEnv('CRON_SECRET', 'old-cron')
    const token = unsubscribeToken('subscriber', 'xyz')!

    vi.stubEnv('CRON_SECRET', 'new-cron')
    expect(verifyUnsubscribeToken('subscriber', 'xyz', token)).toBe(true)
  })

  it('has no token without a secret', () => {
    vi.stubEnv('UNSUBSCRIBE_SECRET', '')
    vi.stubEnv('CRON_SECRET', '')
    expect(unsubscribeToken('profile', 'abc')).toBeNull()
    expect(verifyUnsubscribeToken('profile', 'abc', 'anything')).toBe(false)
  })
})
