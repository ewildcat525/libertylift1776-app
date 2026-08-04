'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Navigation from '@/components/Navigation'
import AccountSettings from '@/components/AccountSettings'
import ShareProgress from '@/components/ShareProgress'
import { createClient, Profile, UserStats, US_STATES } from '@/lib/supabase'
import { liveStreak } from '@/lib/dates'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const [profileResult, statsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('user_stats').select('*').eq('user_id', user.id).single(),
      ])
      setProfile(profileResult.data)
      setDisplayName(profileResult.data?.display_name || '')
      setStats(statsResult.data)
      setLoading(false)
    }

    void loadProfile()
  }, [router, supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const saveDisplayName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!profile) return
    const nextName = displayName.trim().replace(/\s+/g, ' ')
    if (nextName.length < 3) {
      setNameError('Your public handle must be at least 3 characters.')
      return
    }

    setSavingName(true)
    setNameError(null)
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: nextName })
      .eq('id', profile.id)
      .select()
      .single()

    if (error || !data) {
      setNameError(error?.code === '23505' ? 'That handle is already taken.' : 'Could not save your handle. Try again.')
      setSavingName(false)
      return
    }

    setProfile(data)
    setDisplayName(data.display_name || '')
    setSavingName(false)
    setEditingName(false)
  }

  const initials = profile?.display_name
    ?.split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase() || 'LL'

  return (
    <>
      <Navigation />
      <main className="native-screen app-surface min-h-screen px-4 pb-12 pt-24">
        <div className="mx-auto max-w-2xl">
          {loading ? (
            <div className="native-loading" role="status">
              <span />
              Loading your profile…
            </div>
          ) : (
            <>
              <header className="native-profile-header">
                <div className="native-profile-avatar" aria-hidden="true">{initials}</div>
                <div>
                  <div className="app-eyebrow mb-1">Your account</div>
                  <h1 className="app-title text-5xl sm:text-6xl">{profile?.display_name || 'Patriot'}</h1>
                  <p className="mt-1 text-sm text-white/50">
                    {profile?.state_code ? `Team ${US_STATES[profile.state_code]}` : 'Independent'}
                  </p>
                </div>
              </header>

              <section className="native-profile-stats" aria-label="Challenge totals">
                <div><strong>{stats?.total_pushups.toLocaleString() || 0}</strong><span>Total reps</span></div>
                <div><strong>{liveStreak(stats?.current_streak, stats?.last_log_date)}</strong><span>Day streak</span></div>
                <div><strong>{stats?.best_day || 0}</strong><span>Best day</span></div>
              </section>

              {profile?.display_name && (
                <section className="native-profile-card">
                  <div>
                    <h2>Bring your crew</h2>
                    <p>Share your public board and challenge somebody to join you.</p>
                  </div>
                  <ShareProgress
                    handle={profile.display_name}
                    totalPushups={stats?.total_pushups || 0}
                    currentStreak={liveStreak(stats?.current_streak, stats?.last_log_date)}
                    stateCode={profile.state_code}
                    context="native_profile"
                  />
                </section>
              )}

              {editingName && (
                <form className="native-profile-editor" onSubmit={saveDisplayName}>
                  <label htmlFor="native-display-name">Public handle</label>
                  <input
                    id="native-display-name"
                    className="input"
                    value={displayName}
                    onChange={event => {
                      setDisplayName(event.target.value)
                      setNameError(null)
                    }}
                    minLength={3}
                    maxLength={40}
                    autoCapitalize="words"
                    autoCorrect="off"
                    disabled={savingName}
                  />
                  {nameError && <p role="alert">{nameError}</p>}
                  <div>
                    <button type="button" onClick={() => setEditingName(false)} disabled={savingName}>Cancel</button>
                    <button type="submit" disabled={savingName || !displayName.trim()}>{savingName ? 'Saving…' : 'Save'}</button>
                  </div>
                </form>
              )}

              <section className="native-settings-list" aria-label="Account links">
                <button type="button" onClick={() => setEditingName(true)}><span>Edit public handle</span><b aria-hidden="true">›</b></button>
                <Link href="/support"><span>Help and support</span><b aria-hidden="true">›</b></Link>
                <Link href="/privacy"><span>Privacy policy</span><b aria-hidden="true">›</b></Link>
                <button type="button" onClick={signOut}><span>Sign out</span><b aria-hidden="true">›</b></button>
              </section>

              <AccountSettings />
            </>
          )}
        </div>
      </main>
    </>
  )
}
