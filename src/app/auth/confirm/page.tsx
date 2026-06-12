'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'

const EMAIL_OTP_TYPES: EmailOtpType[] = ['email', 'signup', 'magiclink', 'recovery', 'invite', 'email_change']

function getSafeNext(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/dashboard'
  }

  return next
}

function getNextFromParams(searchParams: URLSearchParams) {
  const directNext = searchParams.get('next')
  if (directNext) {
    return getSafeNext(directNext)
  }

  // The email template forwards the original emailRedirectTo value
  // (e.g. https://site/auth/callback?next=%2Fdashboard) as redirect_to.
  const redirectTo = searchParams.get('redirect_to')
  if (redirectTo) {
    try {
      return getSafeNext(new URL(redirectTo).searchParams.get('next'))
    } catch {
      return '/dashboard'
    }
  }

  return '/dashboard'
}

function getOtpType(searchParams: URLSearchParams): EmailOtpType {
  const type = searchParams.get('type')
  return EMAIL_OTP_TYPES.includes(type as EmailOtpType) ? (type as EmailOtpType) : 'email'
}

function getVerifyErrorMessage(message: string) {
  const lowered = message.toLowerCase()
  if (lowered.includes('expired') || lowered.includes('invalid') || lowered.includes('not found')) {
    return 'This sign-in link has expired or was already used. Head back to sign in and we will send you a fresh one.'
  }

  return message
}

function AuthConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  const tokenHash = searchParams.get('token_hash')

  useEffect(() => {
    if (tokenHash) {
      return
    }

    if (searchParams.get('error') || searchParams.get('error_description')) {
      setError(searchParams.get('error_description') || 'Sign in failed.')
      return
    }

    const params = searchParams.toString()
    router.replace(`/auth/callback${params ? `?${params}` : ''}`)
  }, [router, searchParams, tokenHash])

  const handleConfirm = async () => {
    if (!tokenHash || verifying) return

    setError(null)
    setVerifying(true)

    const supabase = createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type: getOtpType(searchParams),
      token_hash: tokenHash,
    })

    if (verifyError) {
      setError(getVerifyErrorMessage(verifyError.message))
      setVerifying(false)
      return
    }

    window.location.assign(getNextFromParams(searchParams))
  }

  return (
    <main className="auth-page">
      <header className="conversion-nav">
        <Link href="/" className="flex items-center gap-3 campaign-nav-mark">
          <span className="campaign-nav-monogram">LL</span>
          <span className="campaign-nav-name">Liberty Lift / 1776</span>
        </Link>
      </header>

      <section className="auth-shell auth-shell-center">
        <div className="auth-card text-center">
          <div className="app-eyebrow justify-center mb-3">
            {error ? 'Sign in failed' : tokenHash ? 'One more step' : 'Signing you in'}
          </div>
          <h1 className="app-title text-5xl">
            {error ? 'Try again' : tokenHash ? 'Confirm sign in' : 'Almost there'}
          </h1>

          {error ? (
            <>
              <div className="auth-error" role="alert">
                {error}
              </div>
              <Link href="/login" className="btn-gold w-full py-3 mt-4">
                Back to sign in
              </Link>
            </>
          ) : tokenHash ? (
            <>
              <p className="text-white/60 mt-3">
                Tap the button below to finish signing in to your account.
              </p>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={verifying}
                className="btn-gold w-full py-3 mt-5 disabled:opacity-50"
              >
                {verifying ? 'Signing you in...' : 'Sign me in'}
              </button>
            </>
          ) : (
            <p className="text-white/60 mt-3">
              Finishing the secure Google handoff.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={null}>
      <AuthConfirmContent />
    </Suspense>
  )
}
