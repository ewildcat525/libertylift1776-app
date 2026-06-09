'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient, US_STATES } from '@/lib/supabase'
import { generateDisplayName, savePendingSignup } from '@/lib/onboarding'

const STATE_OPTIONS = Object.entries(US_STATES)

function getSafeNext(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/dashboard'
  }

  return next
}

function normalizeDisplayName(displayName: string) {
  return displayName.trim().replace(/\s+/g, ' ')
}

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [stateCode, setStateCode] = useState('')
  const [displayName, setDisplayName] = useState('LibertyLifter1776')
  const [nextPath, setNextPath] = useState('/dashboard')
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'email' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [isStateMenuOpen, setIsStateMenuOpen] = useState(false)
  const [activeStateIndex, setActiveStateIndex] = useState(0)
  const statePickerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const selectedState = stateCode ? US_STATES[stateCode] : null
  const selectedStateIndex = STATE_OPTIONS.findIndex(([code]) => code === stateCode)

  const getRedirectTo = () => {
    if (typeof window === 'undefined') return undefined
    const safeNext = getSafeNext(new URLSearchParams(window.location.search).get('next'))
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`
  }

  useEffect(() => {
    setNextPath(getSafeNext(new URLSearchParams(window.location.search).get('next')))
  }, [])

  useEffect(() => {
    setDisplayName(generateDisplayName(stateCode))
  }, [stateCode])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!statePickerRef.current?.contains(event.target as Node)) {
        setIsStateMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const chooseState = (nextStateCode: string) => {
    setStateCode(nextStateCode)
    setError(null)
    setEmailSent(false)
    setIsStateMenuOpen(false)
  }

  const handleStatePickerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isStateMenuOpen && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      setActiveStateIndex(selectedStateIndex >= 0 ? selectedStateIndex : 0)
      setIsStateMenuOpen(true)
      return
    }

    if (!isStateMenuOpen) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveStateIndex((current) => (current + 1) % STATE_OPTIONS.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveStateIndex((current) => (current - 1 + STATE_OPTIONS.length) % STATE_OPTIONS.length)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveStateIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveStateIndex(STATE_OPTIONS.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      chooseState(STATE_OPTIONS[activeStateIndex][0])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setIsStateMenuOpen(false)
    }
  }

  const persistPendingSignup = (nextDisplayName: string) => {
    if (!stateCode) return
    savePendingSignup({
      displayName: nextDisplayName,
      stateCode,
    })
  }

  const validateDisplayName = async () => {
    const nextDisplayName = normalizeDisplayName(displayName)

    if (!stateCode) {
      setError('Choose your state first.')
      return null
    }

    if (nextDisplayName.length < 3) {
      setError('Handle must be at least 3 characters.')
      return null
    }

    if (nextDisplayName.length > 40) {
      setError('Handle must be 40 characters or fewer.')
      return null
    }

    if (!/^[A-Za-z0-9 _-]+$/.test(nextDisplayName)) {
      setError('Use letters, numbers, spaces, hyphens, or underscores.')
      return null
    }

    const { data: existingProfile, error: availabilityError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('display_name', nextDisplayName)
      .limit(1)
      .maybeSingle()

    if (availabilityError) {
      setError(availabilityError.message)
      return null
    }

    if (existingProfile) {
      setError('That handle is already taken.')
      return null
    }

    setDisplayName(nextDisplayName)
    return nextDisplayName
  }

  const handleGoogleSignup = async () => {
    setError(null)
    setEmailSent(false)
    setLoadingProvider('google')

    const nextDisplayName = await validateDisplayName()
    if (!nextDisplayName) {
      setLoadingProvider(null)
      return
    }

    persistPendingSignup(nextDisplayName)

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirectTo(),
      },
    })

    if (oauthError) {
      setError(oauthError.message)
      setLoadingProvider(null)
    }
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    setError(null)
    setEmailSent(false)
    setLoadingProvider('email')

    const nextDisplayName = await validateDisplayName()
    if (!nextDisplayName) {
      setLoadingProvider(null)
      return
    }

    persistPendingSignup(nextDisplayName)

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: getRedirectTo(),
        data: {
          display_name: nextDisplayName,
          state_code: stateCode,
        },
      },
    })

    if (otpError) {
      setError(otpError.message)
      setLoadingProvider(null)
      return
    }

    setEmailSent(true)
    setLoadingProvider(null)
  }

  return (
    <main className="auth-page">
      <header className="conversion-nav">
        <Link href="/" className="flex items-center gap-3 campaign-nav-mark">
          <span className="campaign-nav-monogram">LL</span>
          <span className="campaign-nav-name">Liberty Lift / 1776</span>
        </Link>

        <div className="conversion-nav-actions">
          <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="conversion-signin">
            Sign in
          </Link>
        </div>
      </header>

      <section className="auth-shell">
        <div className="auth-copy">
          <div className="app-eyebrow mb-4">Join your state</div>
          <h1 className="app-title auth-title">
            1776 push-ups.
            <br />
            <em>One team.</em>
          </h1>
          <p>
            Pick your state, grab an autogenerated handle, and get your dashboard.
            You can edit the handle now or later.
          </p>
        </div>

        <div className="auth-card">
          <div className="auth-step-label">Step 1</div>
          <label className="auth-label" htmlFor="state-code">
            Choose your state
          </label>
          <div
            ref={statePickerRef}
            className="state-picker"
            onKeyDown={handleStatePickerKeyDown}
          >
            <button
              id="state-code"
              type="button"
              className="state-picker-trigger"
              aria-haspopup="listbox"
              aria-expanded={isStateMenuOpen}
              aria-controls="state-code-list"
              onClick={() => {
                setActiveStateIndex(selectedStateIndex >= 0 ? selectedStateIndex : 0)
                setIsStateMenuOpen((isOpen) => !isOpen)
              }}
            >
              <span>{selectedState || 'Select your state...'}</span>
              <span className="state-picker-chevron" aria-hidden="true">⌄</span>
            </button>

            {isStateMenuOpen && (
              <div
                id="state-code-list"
                className="state-picker-list"
                role="listbox"
                aria-labelledby="state-code"
                tabIndex={-1}
              >
                {STATE_OPTIONS.map(([code, name], index) => (
                  <button
                    key={code}
                    id={`state-option-${code}`}
                    type="button"
                    role="option"
                    aria-selected={code === stateCode}
                    className={`state-picker-option${index === activeStateIndex ? ' is-active' : ''}`}
                    onMouseEnter={() => setActiveStateIndex(index)}
                    onClick={() => chooseState(code)}
                  >
                    <span>{name}</span>
                    <span>{code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="generated-handle" aria-live="polite">
            <label htmlFor="display-name">Your public handle</label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value)
                setError(null)
                setEmailSent(false)
              }}
              onBlur={() => setDisplayName((currentDisplayName) => normalizeDisplayName(currentDisplayName))}
              minLength={3}
              maxLength={40}
              className="generated-handle-input"
              aria-describedby="display-name-help"
              disabled={loadingProvider !== null}
            />
          </div>
          <p id="display-name-help" className="auth-field-note">
            Letters, numbers, spaces, hyphens, or underscores.
          </p>

          {selectedState && (
            <div className="state-join-callout" role="status">
              Team {selectedState} selected. Every rep you log moves your state total.
            </div>
          )}

          <div className="auth-step-label auth-step-gap">Step 2</div>
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={!stateCode || loadingProvider !== null}
            className="auth-google-button"
          >
            <span aria-hidden="true">G</span>
            {loadingProvider === 'google' ? 'Opening Google...' : 'Continue with Google'}
          </button>

          <div className="auth-divider">
            <span>or use email</span>
          </div>

          <form onSubmit={handleEmailSignup} className="auth-email-form">
            <label className="auth-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setError(null)
                setEmailSent(false)
              }}
              className="input"
              placeholder="you@example.com"
              required
            />

            <button
              type="submit"
              disabled={!stateCode || loadingProvider !== null}
              className="btn-gold w-full py-3 disabled:opacity-50"
            >
              {loadingProvider === 'email' ? 'Sending link...' : 'Email me a sign-in link'}
            </button>
          </form>

          {emailSent && (
            <div className="auth-success" role="status">
              Check your email for the sign-in link. Your state and handle are waiting.
            </div>
          )}

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <p className="auth-footnote">
            No password required. Already joined?{' '}
            <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="text-liberty-gold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
