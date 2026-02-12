'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, Contest } from '@/lib/supabase'
import Navigation from '@/components/Navigation'

export default function ContestsPage() {
  const [user, setUser] = useState<any>(null)
  const [contests, setContests] = useState<Contest[]>([])
  const [myContests, setMyContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  
  // Create form
  const [contestName, setContestName] = useState('')
  const [contestDesc, setContestDesc] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [creating, setCreating] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // Load public contests
      const { data: publicContests } = await supabase
        .from('contests')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
      
      setContests(publicContests || [])

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
  }, [])

  const createContest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      router.push('/login')
      return
    }

    setCreating(true)
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase()
    
    const { data: contest, error } = await supabase
      .from('contests')
      .insert({
        name: contestName,
        description: contestDesc,
        creator_id: user.id,
        invite_code: inviteCode,
        is_public: isPublic,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '2026-07-31',
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
    }

    setCreating(false)
  }

  const joinContest = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    setJoinError(null)
    const { data: contest } = await supabase
      .from('contests')
      .select('*')
      .eq('invite_code', joinCode.toUpperCase())
      .single()

    if (!contest) {
      setJoinError('Invalid invite code')
      return
    }

    const { error } = await supabase.from('contest_participants').insert({
      contest_id: contest.id,
      user_id: user.id,
    })

    if (error) {
      if (error.code === '23505') {
        setJoinError('You already joined this contest')
      } else {
        setJoinError('Failed to join contest')
      }
      return
    }

    setMyContests([contest, ...myContests])
    setJoinCode('')
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-bebas text-5xl text-liberty-gold mb-2">
              🏆 CONTESTS
            </h1>
            <p className="text-white/60">Create private challenges or join public competitions</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <button
              onClick={() => user ? setShowCreate(true) : router.push('/login')}
              className="btn-gold flex-1"
            >
              ➕ Create Contest
            </button>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter invite code"
                className="input flex-1"
              />
              <button onClick={joinContest} className="btn-secondary px-4">
                Join
              </button>
            </div>
          </div>

          {joinError && (
            <div className="mb-4 p-3 bg-liberty-red/20 border border-liberty-red/50 rounded-lg text-sm text-red-300">
              {joinError}
            </div>
          )}

          {/* Create Contest Modal */}
          {showCreate && (
            <div className="card p-6 mb-8">
              <h2 className="font-bebas text-2xl text-liberty-gold mb-4">Create New Contest</h2>
              <form onSubmit={createContest} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Contest Name *</label>
                  <input
                    type="text"
                    value={contestName}
                    onChange={(e) => setContestName(e.target.value)}
                    className="input"
                    placeholder="e.g., Family Challenge"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-2">Description</label>
                  <textarea
                    value={contestDesc}
                    onChange={(e) => setContestDesc(e.target.value)}
                    className="input"
                    placeholder="Optional description..."
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isPublic" className="text-sm text-white/70">
                    Make this contest public (anyone can find and join)
                  </label>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={creating} className="btn-gold flex-1">
                    {creating ? 'Creating...' : 'Create Contest'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* My Contests */}
          {user && myContests.length > 0 && (
            <div className="mb-8">
              <h2 className="font-bebas text-2xl text-liberty-gold mb-4">My Contests</h2>
              <div className="space-y-4">
                {myContests.map((contest) => (
                  <div key={contest.id} className="card p-4 card-hover">
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
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded ${
                          contest.is_public ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/50'
                        }`}>
                          {contest.is_public ? 'Public' : 'Private'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Public Contests */}
          <div>
            <h2 className="font-bebas text-2xl text-liberty-gold mb-4">Public Contests</h2>
            {loading ? (
              <div className="text-center text-white/50 py-12">Loading contests...</div>
            ) : contests.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-5xl mb-4">🎯</div>
                <h3 className="font-bebas text-xl text-white mb-2">No Public Contests Yet</h3>
                <p className="text-white/60">Create the first public contest!</p>
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
                        onClick={() => {
                          setJoinCode(contest.invite_code)
                          joinContest()
                        }}
                        className="btn-secondary text-sm py-2"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
