'use client'

import { useEffect, useRef, useState } from 'react'

export default function AccountSettings() {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const openButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmationRef = useRef<HTMLInputElement>(null)
  const deletingRef = useRef(false)
  deletingRef.current = deleting

  const close = () => {
    if (deleting) return
    setIsOpen(false)
    setConfirmation('')
    setError(null)
  }

  useEffect(() => {
    if (!isOpen) return

    const opener = openButtonRef.current
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deletingRef.current) {
        event.preventDefault()
        setIsOpen(false)
        setConfirmation('')
        setError(null)
        return
      }

      if (event.key !== 'Tab') return
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    const focusTimer = window.setTimeout(() => confirmationRef.current?.focus(), 0)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      opener?.focus()
    }
  }, [isOpen])

  const deleteAccount = async () => {
    if (confirmation !== 'DELETE' || deleting) return
    setDeleting(true)
    setError(null)

    try {
      const response = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      })
      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        setError(result.error || 'We could not delete your account. Please try again.')
        setDeleting(false)
        return
      }

      window.location.replace('/?account=deleted')
    } catch {
      setError('Check your connection and try again.')
      setDeleting(false)
    }
  }

  return (
    <section id="account-settings" className="mt-10 border-t border-white/10 pt-8 text-center" aria-labelledby="account-settings-title">
      <h2 id="account-settings-title" className="text-sm font-bold uppercase tracking-[0.12em] text-white/60">
        Account settings
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-white/45">
        Permanently remove your account, public profile, logged reps, contest history,
        chat activity, and achievements.
      </p>
      <button
        ref={openButtonRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-4 min-h-11 px-4 text-sm font-semibold text-red-300 underline decoration-red-300/40 underline-offset-4 transition-colors hover:text-red-200"
      >
        Delete account
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[220] flex items-end justify-center bg-black/80 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center"
        >
          <button type="button" className="absolute inset-0" onClick={close} aria-label="Close delete account dialog" tabIndex={-1} />
          <div
            ref={dialogRef}
            className="card relative w-full max-w-md p-6 text-left sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >
            <div className="app-eyebrow mb-3">Permanent action</div>
            <h3 id="delete-account-title" className="font-bebas text-4xl text-white">
              Delete your account?
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              This cannot be undone. Your profile and all challenge activity will be permanently
              removed. Type <strong className="text-white">DELETE</strong> to continue.
            </p>
            <label htmlFor="delete-confirmation" className="auth-label mt-5 block">
              Confirmation
            </label>
            <input
              ref={confirmationRef}
              id="delete-confirmation"
              value={confirmation}
              onChange={(event) => {
                setConfirmation(event.target.value.toUpperCase())
                setError(null)
              }}
              className="input mt-2"
              autoComplete="off"
              autoCapitalize="characters"
              disabled={deleting}
              placeholder="DELETE"
            />
            {error && <p className="mt-3 text-sm text-red-300" role="alert">{error}</p>}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={close} disabled={deleting} className="btn-secondary min-h-12 px-5 disabled:opacity-50">
                Keep my account
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={confirmation !== 'DELETE' || deleting}
                className="inline-flex min-h-12 items-center justify-center bg-red-700 px-5 text-sm font-extrabold uppercase tracking-[0.1em] text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
