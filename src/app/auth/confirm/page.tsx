'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function AuthConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('error') || searchParams.get('error_description')) {
      setError(searchParams.get('error_description') || 'Sign in failed.')
      return
    }

    const params = searchParams.toString()
    router.replace(`/auth/callback${params ? `?${params}` : ''}`)
  }, [router, searchParams])

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
            {error ? 'Sign in failed' : 'Signing you in'}
          </div>
          <h1 className="app-title text-5xl">
            {error ? 'Try again' : 'Almost there'}
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
