'use client'

import { useMemo, useState } from 'react'
import { track } from '@vercel/analytics'
import { createClient } from '@/lib/supabase'

export default function Notify2027() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const join = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) {
      setError('Enter a valid email address.')
      return
    }

    setBusy(true)
    setError(null)
    const { error: insertError } = await supabase.from('season_interests').insert({
      season_year: 2027,
      email: clean,
      user_id: null,
      source: 'record_2026',
    })
    setBusy(false)

    if (insertError && insertError.code !== '23505') {
      setError('Something went wrong — try again in a minute.')
      return
    }

    track('record_2026_2027_signup', { already: Boolean(insertError) })
    setDone(true)
  }

  if (done) {
    return (
      <p className="record-2026-notify-done" role="status">
        You&apos;re on the 2027 list.
      </p>
    )
  }

  return (
    <form onSubmit={join} className="record-2026-notify">
      <label htmlFor="record-2026-email">2027 notify</label>
      <div className="record-2026-notify-fields">
        <input
          id="record-2026-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setError(null)
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'record-2026-email-error' : undefined}
          placeholder="you@example.com"
          required
        />
        <button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Notify me'}
        </button>
      </div>
      {error && (
        <p id="record-2026-email-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
