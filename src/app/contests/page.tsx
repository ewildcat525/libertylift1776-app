'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, Contest } from '@/lib/supabase'
import { localDateString } from '@/lib/dates'
import { seasonForLogging } from '@/lib/seasons'
import Navigation from '@/components/Navigation'
import { canUsePublicContests } from '@/lib/flags'
import { isNativeApp } from '@/lib/native-auth'

const publicContestsEnabled = canUsePublicContests()

export default function ContestsPage() {
  const [user, setUser] = useState<any>(null)
  const [contests, setContests] = useState<Contest[]>([])
  const [myContests, setMyContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  
  // Create form
  const [contestName, setContestName] = useState('')
  const [contestDesc, setContestDesc] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [creating, setCreating] = useState(false)
  const [nativeMode, setNativeMode] = useState(false)
  const createCrewButtonRef = useRef<HTMLButtonElement>(null)
  const createCrewSheetRef = useRef<HTMLDivElement>(null)
  
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (publicContestsEnabled) {
        const { data: publicContests } = await supabase
          .from('contests')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false })

        setContests(publicContests || [])
      }

      // Load my contests if logged in
      if (user) {
        const { data: participating } = await supabase
          .from('contest_participants')
          .select('contest_id')
          .eq('user_id', user.id)
        
        if (participating && participating.length > 0) {
          const contestIds = participating.map(p => p.contest_id)
          const { data: myContestData } = await supabase
            .from('contests')
            .select('*')
            .in('id', contestIds)
          
          setMyContests(myContestData || [])
        }
      }

      setLoading(false)
    }

    loadData()
  }, [supabase])

  useEffect(() => {
    setNativeMode(isNativeApp())
  }, [])

  useEffect(() => {
    if (!showCreate) return
    const previousOverflow = document.body.style.overflow
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowCreate(false)
        return
      }
      if (!nativeMode || event.key !== 'Tab') return

      const focusable = Array.from(
        createCrewSheetRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
    if (nativeMode) document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    const focusTimer = window.setTimeout(() => document.getElementById('crew-name')?.focus(), 50)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [nativeMode, showCreate])

  const createContest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      router.push('/login')
      return
    }

    setCreating(true)
    setCreateError(null)
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase()
    
    const { data: contest, error } = await supabase
      .from('contests')
      .insert({
        name: contestName,
        description: contestDesc,
        creator_id: user.id,
        invite_code: inviteCode,
        is_public: publicContestsEnabled && isPublic,
        start_date: localDateString(),
        // The season's last day. The database enforces this too, so a client
        // cannot create a crew that outlives its challenge.
        end_date: seasonForLogging().endsOn,
      })
      .select()
      .single()

    if (!error && contest) {
      // Join own contest
      await supabase.from('contest_participants').insert({
        contest_id: contest.id,
        user_id: user.id,
      })

      setMyContests([contest, ...myContests])
      setShowCreate(false)
      setContestName('')
      setContestDesc('')
    } else if (error) {
      setCreateError('Failed to create crew. Please try again.')
    }

    setCreating(false)
  }

  const joinContest = async (directCode?: string) => {
    if (!user) {
      router.push('/login')
      return
    }

    const codeToUse = directCode ?? joinCode
    const normalizedCode = codeToUse.trim().toUpperCase()
    setJoinError(null)
    if (!normalizedCode) {
      setJoinError('Enter an invite code')
      return
    }

    const { data: contest, error } = await supabase.rpc('join_contest_by_invite_code', {
      p_invite_code: normalizedCode,
    })

    if (error) {
      setJoinError(error.message.includes('Invalid invite code') ? 'Invalid invite code' : 'Failed to join crew')
      return
    }

    if (!contest) {
      setJoinError('Invalid invite code')
      return
    }

    setMyContests(prev => prev.some(c => c.id === contest.id) ? prev : [contest, ...prev])
    setJoinCode('')
    router.push(`/contests/${contest.id}`)
  }

  return (
    <>
      <Navigation />
      <div className="native-crews-screen min-h-screen pt-24 pb-12 px-4 app-surface">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="app-eyebrow mb-3">Private rivalries</div>
            <h1 className="app-title text-6xl sm:text-7xl">Crews</h1>
            <p className="text-white/60 mt-3">Train together, compete, and keep each other moving.</p>
          </div>

          {/* Actions */}
          <div className="native-crew-actions flex flex-col sm:flex-row gap-4 mb-8">
            <button
              ref={createCrewButtonRef}
              onClick={() => user ? setShowCreate(true) : router.push('/login')}
              className="btn-gold flex-1"
            >
              Create crew
            </button>
            <div className="flex-1 flex gap-2">
              <input
                aria-label="Crew invite code"
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter invite code"
                className="input flex-1"
              />
              <button onClick={() => joinContest()} className="btn-secondary px-4">
                Join
              </button>
            </div>
          </div>

          {joinError && (
            <div className="mb-4 p-3 bg-liberty-red/20 border border-liberty-red/50 text-sm text-red-300">
              {joinError}
            </div>
          )}

          {/* Create Contest Modal */}
          {showCreate && (
            <>
            <button type="button" className="native-modal-backdrop" aria-label="Close create crew" onClick={() => setShowCreate(false)} />
            <div ref={createCrewSheetRef} className="native-create-crew-sheet card p-6 mb-8" role="dialog" aria-modal={nativeMode || undefined} aria-labelledby="create-crew-title">
              <div className="native-sheet-handle" aria-hidden="true" />
              <div className="native-create-crew-heading">
                <h2 id="create-crew-title" className="font-bebas text-3xl text-liberty-red mb-4">Create a crew</h2>
                <button type="button" onClick={() => setShowCreate(false)} aria-label="Close create crew">Done</button>
              </div>
              <form onSubmit={createContest} className="space-y-4">
                <div>
                  <label htmlFor="crew-name" className="block text-sm text-white/70 mb-2">Crew name *</label>
                  <input
                    id="crew-name"
                    type="text"
                    value={contestName}
                    onChange={(e) => setContestName(e.target.value)}
                    className="input"
                    placeholder="e.g., Family Challenge"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="crew-description" className="block text-sm text-white/70 mb-2">Description</label>
                  <textarea
                    id="crew-description"
                    value={contestDesc}
                    onChange={(e) => setContestDesc(e.target.value)}
                    className="input"
                    placeholder="Optional description..."
                    rows={2}
                  />
                </div>
                {publicContestsEnabled && <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isPublic" className="text-sm text-white/70">
                    Make this crew public (anyone can find and join)
                  </label>
                </div>}
                {createError && (
                  <div className="p-3 bg-liberty-red/20 border border-liberty-red/50 text-sm text-red-300">
                    {createError}
                  </div>
                )}
                <div className="flex gap-2">
                  <button type="submit" disabled={creating} className="btn-gold flex-1">
                    {creating ? 'Creating…' : 'Create crew'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreate(false); setCreateError(null) }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
            </>
          )}

          {/* My Contests */}
          {user && myContests.length > 0 && (
            <div className="mb-8">
              <h2 className="font-bebas text-3xl text-liberty-red mb-4">My crews</h2>
              <div className="space-y-4">
                {myContests.map((contest) => (
                  <Link key={contest.id} href={`/contests/${contest.id}`}>
                    <div className="card p-4 card-hover cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-white">{contest.name}</h3>
                          {contest.description && (
                            <p className="text-sm text-white/60">{contest.description}</p>
                          )}
                          <div className="text-xs text-white/40 mt-1">
                            Invite code: <span className="text-liberty-gold font-mono">{contest.invite_code}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            contest.is_public ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/50'
                          }`}>
                            {contest.is_public ? 'Public' : 'Private'}
                          </span>
                          <span className="text-white/30">→</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Public discovery stays fail-closed until moderation is ready. */}
          {publicContestsEnabled && <div>
              <h2 className="font-bebas text-3xl text-liberty-red mb-4">Public crews</h2>
            {loading ? (
              <div className="text-center text-white/50 py-12" role="status">Loading crews…</div>
            ) : contests.length === 0 ? (
              <div className="card p-12 text-center">
                <h3 className="font-bebas text-xl text-white mb-2">No public crews yet</h3>
                <p className="text-white/60">Create the first public crew.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {contests.map((contest) => (
                  <div key={contest.id} className="card p-4 card-hover">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-white">{contest.name}</h3>
                        {contest.description && (
                          <p className="text-sm text-white/60">{contest.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => joinContest(contest.invite_code)}
                        className="btn-secondary text-sm py-2"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>}
        </div>
      </div>
    </>
  )
}
