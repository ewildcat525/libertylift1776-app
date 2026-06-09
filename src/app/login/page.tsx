'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

function getSafeNext(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/dashboard'
  }

  return next
}

function getLoginErrorMessage(message: string) {
  if (message.toLowerCase().includes('signups not allowed for otp')) {
    return 'No account found for that email. Join first, then use sign in next time.'
  }

  return message
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [nextPath, setNextPath] = useState('/dashboard')
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'email' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const supabase = createClient()

  const getRedirectTo = () => {
    if (typeof window === 'undefined') return undefined
    const safeNext = getSafeNext(new URLSearchParams(window.location.search).get('next'))
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`
  }

  useEffect(() => {
    setNextPath(getSafeNext(new URLSearchParams(window.location.search).get('next')))
  }, [])

  const handleGoogleLogin = async () => {
    setError(null)
    setEmailSent(false)
    setLoadingProvider('google')

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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setEmailSent(false)
    setLoadingProvider('email')

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: getRedirectTo(),
        shouldCreateUser: false,
      },
    })

    if (otpError) {
      setError(getLoginErrorMessage(otpError.message))
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
          <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className="campaign-nav-cta">
            Join
          </Link>
        </div>
      </header>

      <section className="auth-shell auth-shell-center">
        <div className="auth-card">
          <div className="text-center mb-7">
            <div className="app-eyebrow justify-center mb-3">Welcome back</div>
            <h1 className="app-title text-5xl">Sign in</h1>
            <p className="text-white/60 mt-3">Get back to your reps and state board.</p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loadingProvider !== null}
            className="auth-google-button"
          >
            <span aria-hidden="true">G</span>
            {loadingProvider === 'google' ? 'Opening Google...' : 'Continue with Google'}
          </button>

          <div className="auth-divider">
            <span>or use email</span>
          </div>

          <form onSubmit={handleEmailLogin} className="auth-email-form">
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
              disabled={loadingProvider !== null}
              className="btn-gold w-full py-3 disabled:opacity-50"
            >
              {loadingProvider === 'email' ? 'Sending link...' : 'Email me a sign-in link'}
            </button>
          </form>

          {emailSent && (
            <div className="auth-success" role="status">
              Check your email for the sign-in link.
            </div>
          )}

          {error && (
            <div className="auth-error" role="alert">
              {error}{' '}
              {error.startsWith('No account found') && (
                <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className="text-liberty-gold hover:underline">
                  Join Liberty Lift.
                </Link>
              )}
            </div>
          )}

          <p className="auth-footnote">
            New here?{' '}
            <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className="text-liberty-gold hover:underline">
              Join your state
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
