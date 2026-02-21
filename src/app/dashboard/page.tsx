'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, UserStats, Profile, AMERICAN_FACTS } from '@/lib/supabase'
import Navigation from '@/components/Navigation'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [pushupCount, setPushupCount] = useState('')
  const [logging, setLogging] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [currentFact, setCurrentFact] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      // Load stats
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()
      setStats(statsData)
    }

    loadData()
  }, [router])

  const logPushups = async () => {
    const count = parseInt(pushupCount)
    if (!count || count < 1 || !user) return

    setLogging(true)

    const { error } = await supabase
      .from('pushup_logs')
      .insert({ user_id: user.id, count })

    if (!error) {
      // Refresh stats
      const { data: newStats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      // Check for milestone
      const newTotal = newStats?.total_pushups || 0
      const oldTotal = stats?.total_pushups || 0
      const fact = AMERICAN_FACTS.find(f => f.threshold > oldTotal && f.threshold <= newTotal)
      if (fact) {
        setCurrentFact(fact.fact)
      }

      setStats(newStats)
      setPushupCount('')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }

    setLogging(false)
  }

  const progress = stats ? (stats.total_pushups / 1776) * 100 : 0
  const dailyTarget = 57
  const daysInJuly = 31
  const today = new Date()
  const dayOfMonth = today.getDate()
  const expectedProgress = (dayOfMonth / daysInJuly) * 1776
  const pace = stats ? (stats.total_pushups >= expectedProgress ? 'ahead' : 'behind') : 'on-track'

  if (!user) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white/50">Loading...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-bebas text-4xl text-liberty-red mb-2">
              Welcome back, {profile?.display_name || 'Patriot'}!
            </h1>
            <p className="text-white/60">Your journey to 1776</p>
          </div>

          {/* Main Stats Card */}
          <div className="card p-8 mb-8">
            <div className="text-center mb-6">
              <div className="font-bebas text-8xl text-white">
                {stats?.total_pushups.toLocaleString() || 0}
              </div>
              <div className="text-white/50 uppercase tracking-wider">Total Push-ups</div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-white/60 mb-2">
                <span>Progress to 1776</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-white/40 mt-1">
                <span>0</span>
                <span>888</span>
                <span>1776</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white/5 rounded-lg border border-liberty-red/20">
                <div className="font-bebas text-3xl text-liberty-red">
                  {stats?.current_streak || 0}
                </div>
                <div className="text-xs text-white/50 uppercase">Day Streak 🔥</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <div className="font-bebas text-3xl text-white">
                  {stats?.best_day || 0}
                </div>
                <div className="text-xs text-white/50 uppercase">Best Day</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <div className="font-bebas text-3xl text-white">
                  {stats?.days_logged || 0}
                </div>
                <div className="text-xs text-white/50 uppercase">Days Logged</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <div className="font-bebas text-3xl text-white">
                  {1776 - (stats?.total_pushups || 0)}
                </div>
                <div className="text-xs text-white/50 uppercase">Remaining</div>
              </div>
            </div>
          </div>

          {/* Log Push-ups Card */}
          <div className="card p-8 mb-8">
            <h2 className="font-bebas text-2xl text-liberty-red mb-4 text-center">
              LOG YOUR PUSH-UPS
            </h2>
            
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <input
                type="number"
                value={pushupCount}
                onChange={(e) => setPushupCount(e.target.value)}
                placeholder="How many?"
                min="1"
                max="1000"
                className="input text-center text-2xl font-bold w-40"
              />
              <button
                onClick={logPushups}
                disabled={logging || !pushupCount}
                className="btn-gold px-8 py-3 disabled:opacity-50"
              >
                {logging ? 'Logging...' : '💪 Log Push-ups'}
              </button>
            </div>

            {/* Quick Add Buttons */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {[10, 25, 50, 57, 100].map((num) => (
                <button
                  key={num}
                  onClick={() => setPushupCount(num.toString())}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                >
                  +{num}
                </button>
              ))}
            </div>

            {/* Success Message */}
            {showSuccess && (
              <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-center text-green-300">
                🎉 Push-ups logged! Keep going, patriot!
              </div>
            )}

            {/* Fun Fact */}
            {currentFact && (
              <div className="mt-4 p-4 bg-liberty-red/20 border border-liberty-red/50 rounded-lg text-center">
                <div className="text-liberty-red font-semibold mb-1">🇺🇸 Milestone Reached!</div>
                <div className="text-white/80">{currentFact}</div>
                <button 
                  onClick={() => setCurrentFact(null)}
                  className="mt-2 text-sm text-white/50 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* Pace Indicator */}
          <div className="card p-6 text-center">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
              pace === 'ahead' ? 'bg-green-500/20 text-green-300' :
              pace === 'behind' ? 'bg-yellow-500/20 text-yellow-300' :
              'bg-white/10 text-white/70'
            }`}>
              <span>{pace === 'ahead' ? '🚀' : pace === 'behind' ? '⚠️' : '✅'}</span>
              <span className="font-semibold">
                {pace === 'ahead' ? "You're ahead of pace!" :
                 pace === 'behind' ? "You're a bit behind - let's catch up!" :
                 "You're on track!"}
              </span>
            </div>
            <p className="text-sm text-white/50 mt-2">
              Target: ~{dailyTarget} push-ups per day to hit 1,776 by July 31st
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
