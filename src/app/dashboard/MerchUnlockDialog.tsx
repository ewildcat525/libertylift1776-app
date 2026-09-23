'use client'

// Shown once the fireworks for crossing the goal finish.
import { track } from '@vercel/analytics'
import type { Season } from '@/lib/seasons'

export default function MerchUnlockDialog({ season, onClose }: { season: Season; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="merch-unlock-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-liberty-dark/80 backdrop-blur-sm"
      />
      <div className="card relative w-full max-w-md p-8 text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center text-white/40 transition-colors hover:text-white"
        >
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
        <div className="app-eyebrow mb-3">2026 finisher edition</div>
        <h2 id="merch-unlock-title" className="font-bebas text-4xl text-white mb-3">
          You earned the shirt.
        </h2>
        <p className="text-white/60 text-sm mb-6 max-w-sm mx-auto">
          All {season.goal.toLocaleString()} push-ups, done. The Reps for the Republic tee was made
          for finishers like you. Sales are complete for 2026, but the edition
          remains part of the record.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/merch"
            onClick={() => track('merch_unlock_cta_clicked')}
            className="btn-primary px-8 py-3"
          >
            View the 2026 edition
          </a>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-8 py-3"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
