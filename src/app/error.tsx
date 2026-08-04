'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App screen failed:', error)
  }, [error])

  return (
    <main className="app-surface flex min-h-[100dvh] items-center justify-center px-5 py-16 text-center">
      <div className="card w-full max-w-lg p-8 sm:p-10">
        <div className="app-eyebrow mb-3 justify-center">Connection interrupted</div>
        <h1 className="app-title text-5xl sm:text-6xl">Let&apos;s try that again.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/60">
          We couldn&apos;t finish loading this screen. Your saved reps are still tied to your account.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="btn-primary min-h-12 px-7">
            Try again
          </button>
          <Link href="/dashboard" className="btn-secondary min-h-12 px-7">
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
