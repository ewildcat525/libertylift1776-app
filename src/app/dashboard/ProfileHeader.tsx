'use client'

// The web dashboard header: badges, the greeting, and the inline editor for
// the patriot's public handle.
import { useEffect, useState } from 'react'
import type { ChallengePhase } from '@/lib/dates'
import type { Season } from '@/lib/seasons'
import type { createClient, Profile } from '@/lib/supabase'

interface ProfileHeaderProps {
  supabase: ReturnType<typeof createClient>
  userId: string
  profile: Profile | null
  onProfileChange: (profile: Profile) => void
  totalPushups: number
  phase: ChallengePhase | null
  season: Season
}

// Handles are public, so they are held to a narrow shape.
function handleProblem(name: string): string | null {
  if (name.length < 3) return 'Handle must be at least 3 characters.'
  if (name.length > 40) return 'Handle must be 40 characters or fewer.'
  if (!/^[A-Za-z0-9 _-]+$/.test(name)) return 'Use letters, numbers, spaces, hyphens, or underscores.'
  return null
}

export default function ProfileHeader({
  supabase,
  userId,
  profile,
  onProfileChange,
  totalPushups,
  phase,
  season,
}: ProfileHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(profile?.display_name || '')
  }, [profile?.display_name])

  const resetEditor = (nextEditing: boolean) => {
    setEditing(nextEditing)
    setName(profile?.display_name || '')
    setError(null)
    setMessage(null)
  }

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile) return

    const nextName = name.trim().replace(/\s+/g, ' ')
    const currentName = profile.display_name || ''

    const problem = handleProblem(nextName)
    if (problem) {
      setError(problem)
      setMessage(null)
      return
    }

    if (nextName.toLowerCase() === currentName.toLowerCase()) {
      setName(currentName)
      setEditing(false)
      setError(null)
      return
    }

    setSaving(true)
    setError(null)
    setMessage(null)

    const { data: isAvailable, error: availabilityError } = await supabase.rpc(
      'is_handle_available',
      { p_handle: nextName }
    )

    if (availabilityError) {
      setSaving(false)
      setError(availabilityError.message)
      return
    }

    if (isAvailable === false) {
      setSaving(false)
      setError('That handle is already taken.')
      return
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ display_name: nextName })
      .eq('id', userId)
      .select()
      .single()

    setSaving(false)

    if (updateError) {
      setError(updateError.code === '23505' ? 'That handle is already taken.' : updateError.message)
      return
    }

    if (updatedProfile) {
      onProfileChange(updatedProfile)
      setName(updatedProfile.display_name || '')
      setEditing(false)
      setMessage('Public handle updated.')
      setTimeout(() => setMessage(null), 3000)
    }
  }

  return (
    <div id="profile-name" className="web-dashboard-header mb-8">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="app-eyebrow">Personal board</div>
        {totalPushups >= season.goal && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-liberty-gold/50 bg-liberty-gold/10 text-liberty-gold text-[10px] font-bold uppercase tracking-[0.15em]">
            🏛️ Founding Father
          </span>
        )}
        {/* Signed up before the first season started. */}
        {profile?.created_at && profile.created_at < '2026-07-01' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-liberty-gold/50 bg-liberty-gold/10 text-liberty-gold text-[10px] font-bold uppercase tracking-[0.15em]">
            📜 Declaration Signer
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <h1 className="app-title text-5xl sm:text-7xl">
          Welcome back, <em>{profile?.display_name || 'Patriot'}</em>
        </h1>
        {!editing && (
          <button
            type="button"
            onClick={() => resetEditor(true)}
            className="mt-1 inline-flex h-10 w-10 items-center justify-center border border-white/20 bg-white/[0.04] text-white/60 transition-colors hover:border-liberty-red/60 hover:text-white"
            aria-label="Edit public handle"
            title="Edit public handle"
          >
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
        )}
      </div>
      <p className="text-white/60 mt-3">
        {phase === 'ended'
          ? `Your ${season.year} campaign, in the books.`
          : `Your journey to ${season.goal.toLocaleString()}.`}
      </p>
      {editing && (
        <form onSubmit={save} className="mt-5 max-w-xl">
          <label htmlFor="profile-name" className="sr-only">
            Public handle
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
                setMessage(null)
              }}
              minLength={3}
              maxLength={40}
              className="input"
              placeholder="Your public handle"
              disabled={saving}
            />
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="btn-gold px-5 py-3 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => resetEditor(false)}
              disabled={saving}
              className="btn-secondary px-5 py-3 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {(message || error) && (
        <div
          role={error ? 'alert' : 'status'}
          className={`mt-3 text-sm ${error ? 'text-red-300' : 'text-green-300'}`}
        >
          {error || message}
        </div>
      )}
    </div>
  )
}
