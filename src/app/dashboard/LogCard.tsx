'use client'

// Where reps get logged: presets, count and date, then the success, error
// and milestone messages. In the iOS app it renders as a bottom sheet.
import type { RefObject } from 'react'
import ShareProgress from '@/components/ShareProgress'
import { liveStreak } from '@/lib/dates'
import type { Season } from '@/lib/seasons'
import type { Profile, UserStats } from '@/lib/supabase'

const PRESETS = [10, 20, 25, 50, 100]

interface LogCardProps {
  season: Season
  profile: Profile | null
  stats: UserStats | null
  pushupCount: string
  onPushupCountChange: (value: string) => void
  logDate: string
  onLogDateChange: (value: string) => void
  logging: boolean
  onLog: () => void
  showSuccess: boolean
  error: string | null
  fact: string | null
  onDismissFact: () => void
  nativeMode: boolean
  sheetOpen: boolean
  onCloseSheet: () => void
  sheetRef: RefObject<HTMLDivElement>
  inputRef: RefObject<HTMLInputElement>
}

export default function LogCard({
  season,
  profile,
  stats,
  pushupCount,
  onPushupCountChange,
  logDate,
  onLogDateChange,
  logging,
  onLog,
  showSuccess,
  error,
  fact,
  onDismissFact,
  nativeMode,
  sheetOpen,
  onCloseSheet,
  sheetRef,
  inputRef,
}: LogCardProps) {
  const share = (context: 'log_success' | 'milestone', className?: string) =>
    profile?.display_name && (
      <ShareProgress
        handle={profile.display_name}
        totalPushups={stats?.total_pushups || 0}
        currentStreak={liveStreak(stats?.current_streak, stats?.last_log_date)}
        stateCode={profile.state_code}
        context={context}
        className={className}
      />
    )

  return (
    <>
      {nativeMode && sheetOpen && (
        <button
          type="button"
          className="native-sheet-backdrop"
          onClick={onCloseSheet}
          aria-label="Close rep logger"
          tabIndex={-1}
        />
      )}
      <div
        ref={sheetRef}
        id="log-pushups"
        className={`card p-8 mb-8 ${nativeMode ? `native-log-sheet ${sheetOpen ? 'is-open' : ''}` : ''}`}
        role={nativeMode && sheetOpen ? 'dialog' : undefined}
        aria-modal={nativeMode && sheetOpen ? true : undefined}
        aria-labelledby={nativeMode && sheetOpen ? 'native-log-sheet-title' : 'log-pushups-title'}
      >
        {nativeMode && (
          <div className="native-sheet-header">
            <div>
              <span>Quick entry</span>
              <strong id="native-log-sheet-title">Add push-ups</strong>
            </div>
            <button type="button" onClick={onCloseSheet} aria-label="Close rep logger">Done</button>
          </div>
        )}
        <h2 id="log-pushups-title" className="font-bebas text-3xl text-liberty-red mb-5 text-center">
          LOG YOUR PUSH-UPS
        </h2>

        <div className="native-safety-note mb-5 border border-amber-300/25 bg-amber-300/[0.06] p-4 text-sm leading-relaxed text-amber-100/80" role="note">
          <strong className="text-amber-100">Train safely.</strong> Use controlled form, rest
          between sets, and stop if anything feels wrong. Daily cap: {season.dailyCap}.
        </div>

        {/* Quick Add Buttons */}
        <div className="native-log-presets grid grid-cols-5 gap-2 mb-4" aria-label="Rep presets">
          {PRESETS.map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onPushupCountChange(num.toString())}
              className={`min-h-12 bg-white/10 hover:bg-white/20 text-sm font-bold transition-colors ${pushupCount === num.toString() ? 'is-selected' : ''}`}
              aria-pressed={pushupCount === num.toString()}
            >
              +{num}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 items-center justify-center">
          <div className="native-log-fields flex flex-col sm:flex-row gap-3 items-center w-full max-w-xl">
            <div className="native-log-field">
            <label htmlFor="pushup-count" className="sr-only native-field-label">Reps completed</label>
            <input
              id="pushup-count"
              ref={inputRef}
              type="number"
              value={pushupCount}
              onChange={(e) => onPushupCountChange(e.target.value)}
              placeholder="0"
              min="1"
              max={season.dailyCap}
              inputMode="numeric"
              className="input text-center text-2xl font-bold flex-1"
            />
            </div>
            <div className="native-log-field">
            <label htmlFor="pushup-date" className="sr-only native-field-label">Date completed</label>
            <input
              id="pushup-date"
              type="date"
              value={logDate}
              onChange={(e) => onLogDateChange(e.target.value)}
              min={season.startsOn}
              max={season.endsOn}
              className="input text-center flex-1"
            />
            </div>
          </div>
          <button
            onClick={onLog}
            disabled={logging || !pushupCount}
            className="btn-gold px-8 py-3 disabled:opacity-50 w-full max-w-xl"
          >
            {logging ? 'Saving…' : nativeMode ? 'Save set' : 'Log push-ups'}
          </button>
        </div>

        {showSuccess && (
          <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 text-center text-green-300">
            <div className="mb-3">Push-ups logged. Keep going.</div>
            {share('log_success')}
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 text-center text-red-300">
            {error}
          </div>
        )}

        {fact && (
          <div className="mt-4 p-4 bg-liberty-red/20 border border-liberty-red/50 text-center">
            <div className="text-liberty-red font-semibold mb-1">Milestone reached.</div>
            <div className="text-white/80">{fact}</div>
            {share('milestone', 'mt-3')}
            <button
              onClick={onDismissFact}
              className="mt-2 text-sm text-white/50 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </>
  )
}
