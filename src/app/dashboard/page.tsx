'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, UserStats, Profile, AMERICAN_FACTS } from '@/lib/supabase'
import Navigation from '@/components/Navigation'
import PledgeWidget from '@/components/PledgeWidget'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [pushupCount, setPushupCount] = useState('')
  const [logDate, setLogDate] = useState(() => {
    const now = new Date()
    const julyStart = new Date(2026, 6, 1)
    const julyEnd = new Date(2026, 6, 31, 23, 59, 59)
    if (now < julyStart) return '2026-07-01'
    if (now > julyEnd) return '2026-07-31'
    return now.toISOString().split('T')[0]
  })
  const [logging, setLogging] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState<string | null>(null)
  const [currentFact, setCurrentFact] = useState<string | null>(null)
  const [dailyLogs, setDailyLogs] = useState<Record<string, number>>({})
  const [calendarMonth] = useState(() => new Date(2026, 6, 1)) // July is month 6 (0-indexed)
  const [chartData, setChartData] = useState<{ day: number; pace: number; you: number }[]>([])
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

      // Load profile (create if missing - handles users created before trigger was added)
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileError && profileError.code === 'PGRST116') {
        // No profile exists, create one
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: user.id, email: user.email })
          .select()
          .single()
        if (!insertError) {
          profileData = newProfile
        } else {
          console.error('Failed to create profile:', insertError)
        }
      }
      setProfile(profileData)

      // Load stats (create if missing - handles users created before trigger was added)
      let { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (statsError && statsError.code === 'PGRST116') {
        // No stats row exists, create one
        const { data: newStats, error: insertError } = await supabase
          .from('user_stats')
          .insert({ user_id: user.id })
          .select()
          .single()
        if (!insertError) {
          statsData = newStats
        } else {
          console.error('Failed to create user_stats:', insertError)
        }
      }
      setStats(statsData)

      // Load daily logs for calendar
      const { data: logsData } = await supabase
        .from('pushup_logs')
        .select('logged_at, count')
        .eq('user_id', user.id)
      
      if (logsData) {
        const grouped: Record<string, number> = {}
        logsData.forEach(log => {
          const date = new Date(log.logged_at).toISOString().split('T')[0]
          grouped[date] = (grouped[date] || 0) + log.count
        })
        setDailyLogs(grouped)

        // Build chart data for July
        const julyLogs: Record<number, number> = {}
        for (let d = 1; d <= 31; d++) julyLogs[d] = 0
        
        logsData.forEach(log => {
          const logDate = new Date(log.logged_at)
          if (logDate.getFullYear() === 2026 && logDate.getMonth() === 6) {
            const day = logDate.getDate()
            julyLogs[day] += log.count
          }
        })

        // Build cumulative data
        let cumulative = 0
        const chartPoints: { day: number; pace: number; you: number }[] = []
        for (let day = 1; day <= 31; day++) {
          cumulative += julyLogs[day]
          chartPoints.push({
            day,
            pace: Math.round(57.29 * day),
            you: cumulative,
          })
        }
        setChartData(chartPoints)
      }
    }

    loadData()
  }, [router])

  const logPushups = async () => {
    const count = parseInt(pushupCount)
    if (!count || count < 1 || !user) return

    // Validate date is in July 2026
    if (!logDate.startsWith('2026-07-')) {
      setShowError('🇺🇸 The Liberty Lift challenge is for the month of July only!')
      setTimeout(() => setShowError(null), 4000)
      return
    }

    setLogging(true)

    // Create timestamp for the selected date (noon to avoid timezone issues)
    const loggedAt = new Date(logDate + 'T12:00:00').toISOString()
    
    const { error } = await supabase
      .from('pushup_logs')
      .insert({ user_id: user.id, count, logged_at: loggedAt })

    if (error) {
      console.error('Error logging pushups:', error)
      setShowError(`Error: ${error.message}`)
      setTimeout(() => setShowError(null), 4000)
      setLogging(false)
      return
    }

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
      
      // Update daily logs for calendar
      setDailyLogs(prev => ({
        ...prev,
        [logDate]: (prev[logDate] || 0) + count
      }))
      
      setPushupCount('')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }

    setLogging(false)
  }

  const clearLogsForDay = async () => {
    if (!user || !logDate) return
    
    const count = dailyLogs[logDate] || 0
    if (count === 0) {
      setShowError('No push-ups logged for this day')
      setTimeout(() => setShowError(null), 3000)
      return
    }

    if (!confirm(`Clear all ${count} push-ups for ${logDate}?`)) return

    // Delete all logs for this date
    const startOfDay = new Date(logDate + 'T00:00:00').toISOString()
    const endOfDay = new Date(logDate + 'T23:59:59').toISOString()

    const { error } = await supabase
      .from('pushup_logs')
      .delete()
      .eq('user_id', user.id)
      .gte('logged_at', startOfDay)
      .lte('logged_at', endOfDay)

    if (error) {
      setShowError(`Error: ${error.message}`)
      setTimeout(() => setShowError(null), 4000)
      return
    }

    // Update local state
    setDailyLogs(prev => {
      const updated = { ...prev }
      delete updated[logDate]
      return updated
    })

    // Refresh stats
    const { data: newStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single()
    setStats(newStats)

    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    return { daysInMonth, startingDay, year, month }
  }

  const progress = stats ? (stats.total_pushups / 1776) * 100 : 0
  const dailyTarget = 57
  const daysInJuly = 31
  const today = new Date()
  const julyStart = new Date(2026, 6, 1)
  const julyEnd = new Date(2026, 6, 31, 23, 59, 59)
  
  // Determine challenge phase and pace
  let pace: 'before' | 'ahead' | 'behind' | 'complete'
  let expectedProgress = 0
  
  if (today < julyStart) {
    pace = 'before'
  } else if (today > julyEnd) {
    pace = stats && stats.total_pushups >= 1776 ? 'complete' : 'behind'
  } else {
    // During July - calculate based on day of month
    const dayOfJuly = today.getDate()
    expectedProgress = (dayOfJuly / daysInJuly) * 1776
    pace = stats && stats.total_pushups >= expectedProgress ? 'ahead' : 'behind'
  }

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

          {/* Pledge Widget */}
          <div className="mb-8">
            <PledgeWidget userId={user.id} totalPushups={stats?.total_pushups || 0} />
          </div>

          {/* Log Push-ups Card */}
          <div className="card p-8 mb-8">
            <h2 className="font-bebas text-2xl text-liberty-red mb-4 text-center">
              LOG YOUR PUSH-UPS
            </h2>
            
            {/* Quick Add Buttons */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {[10, 25, 50, 57, 100].map((num) => (
                <button
                  key={num}
                  onClick={() => setPushupCount(num.toString())}
                  className="py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                >
                  +{num}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 items-center justify-center">
              <div className="flex gap-3 items-center w-full max-w-xs">
                <input
                  type="number"
                  value={pushupCount}
                  onChange={(e) => setPushupCount(e.target.value)}
                  placeholder="0"
                  min="1"
                  max="1000"
                  className="input text-center text-2xl font-bold flex-1"
                />
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  min="2026-07-01"
                  max="2026-07-31"
                  className="input text-center flex-1"
                />
              </div>
              <button
                onClick={logPushups}
                disabled={logging || !pushupCount}
                className="btn-gold px-8 py-3 disabled:opacity-50 w-full max-w-xs"
              >
                {logging ? 'Logging...' : '💪 Log Push-ups'}
              </button>
            </div>

            {/* Success Message */}
            {showSuccess && (
              <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-center text-green-300">
                🎉 Push-ups logged! Keep going, patriot!
              </div>
            )}

            {/* Error Message */}
            {showError && (
              <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-center text-red-300">
                {showError}
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
          <div className="card p-6 text-center mb-8">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
              pace === 'ahead' ? 'bg-green-500/20 text-green-300' :
              pace === 'behind' ? 'bg-yellow-500/20 text-yellow-300' :
              pace === 'complete' ? 'bg-liberty-gold/20 text-liberty-gold' :
              'bg-liberty-blue/20 text-blue-300'
            }`}>
              <span>
                {pace === 'ahead' ? '🚀' : 
                 pace === 'behind' ? '⚠️' : 
                 pace === 'complete' ? '🏆' : '🇺🇸'}
              </span>
              <span className="font-semibold">
                {pace === 'ahead' ? "You're ahead of pace!" :
                 pace === 'behind' ? "You're a bit behind - let's catch up!" :
                 pace === 'complete' ? "Challenge complete! You're a Founding Father! 🎆" :
                 "Challenge starts July 1st!"}
              </span>
            </div>
            <p className="text-sm text-white/50 mt-2">
              {pace === 'before' 
                ? "Get ready — 1,776 push-ups in 31 days"
                : pace === 'complete'
                ? "You did it! 1,776 push-ups in July 🇺🇸"
                : `Target: ~${dailyTarget} push-ups per day to hit 1,776 by July 31st`}
            </p>
          </div>

          {/* Calendar */}
          <div className="card p-6">
            <h2 className="font-bebas text-2xl text-liberty-red text-center mb-4">
              JULY 2026 🇺🇸
            </h2>
            
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs text-white/50 font-semibold py-1">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {(() => {
                const { daysInMonth, startingDay, year, month } = getDaysInMonth(calendarMonth)
                const days = []
                
                // Empty cells for days before the 1st
                for (let i = 0; i < startingDay; i++) {
                  days.push(<div key={`empty-${i}`} className="aspect-square" />)
                }
                
                // Days of the month (hardcoded to July 2026)
                for (let day = 1; day <= daysInMonth; day++) {
                  const dateStr = `2026-07-${String(day).padStart(2, '0')}`
                  const count = dailyLogs[dateStr] || 0
                  const isToday = dateStr === new Date().toISOString().split('T')[0]
                  
                  days.push(
                    <div 
                      key={day}
                      onClick={() => setLogDate(dateStr)}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all text-xs
                        ${count > 0 
                          ? count >= 57 
                            ? 'bg-liberty-red/40 border border-liberty-red/60' 
                            : 'bg-liberty-red/20 border border-liberty-red/30'
                          : 'bg-white/5 hover:bg-white/10'
                        }
                        ${isToday ? 'ring-2 ring-liberty-gold' : ''}
                        ${logDate === dateStr ? 'ring-2 ring-white' : ''}
                      `}
                    >
                      <span className={`font-semibold ${count > 0 ? 'text-white' : 'text-white/60'}`}>
                        {day}
                      </span>
                      {count > 0 && (
                        <span className="text-[10px] text-liberty-red font-bold">{count}</span>
                      )}
                    </div>
                  )
                }
                
                return days
              })()}
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-white/50">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-liberty-red/20 border border-liberty-red/30 rounded"></div>
                <span>Logged</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-liberty-red/40 border border-liberty-red/60 rounded"></div>
                <span>57+ (on pace)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 ring-2 ring-liberty-gold rounded"></div>
                <span>Today</span>
              </div>
            </div>

            {/* Clear day button */}
            {dailyLogs[logDate] > 0 && (
              <button
                onClick={clearLogsForDay}
                className="mt-4 w-full py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                🗑️ Clear {dailyLogs[logDate]} push-ups for {new Date(logDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </button>
            )}
          </div>

          {/* Personal Progress Chart */}
          <div className="card p-6 mt-8">
            <h2 className="font-bebas text-2xl text-liberty-red mb-4 text-center">
              📈 YOUR PROGRESS TO 1776
            </h2>
            <div className="h-[300px] sm:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#666"
                    tick={{ fill: '#999', fontSize: 12 }}
                    label={{ value: 'July', position: 'insideBottom', offset: -5, fill: '#666' }}
                  />
                  <YAxis 
                    stroke="#666"
                    tick={{ fill: '#999', fontSize: 12 }}
                    domain={[0, 1776]}
                    ticks={[0, 444, 888, 1332, 1776]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#999' }}
                    formatter={(value: number, name: string) => [
                      value.toLocaleString(),
                      name === 'you' ? 'Your Push-ups' : '57/day Pace'
                    ]}
                    labelFormatter={(day) => `July ${day}`}
                  />
                  <Legend 
                    formatter={(value) => value === 'you' ? 'Your Push-ups' : '57/day Pace'}
                  />
                  
                  {/* Pace line (57/day) */}
                  <Line
                    type="monotone"
                    dataKey="pace"
                    name="pace"
                    stroke="#666"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={false}
                  />
                  
                  {/* User's line */}
                  <Line
                    type="monotone"
                    dataKey="you"
                    name="you"
                    stroke="#DC2626"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, fill: '#DC2626' }}
                  />

                  {/* 1776 goal line */}
                  <ReferenceLine 
                    y={1776} 
                    stroke="#FFD700" 
                    strokeDasharray="3 3" 
                    label={{ value: '🎆 1776', fill: '#FFD700', fontSize: 12, position: 'right' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center text-white/40 text-sm mt-2">
              Dashed gray line = 57 push-ups/day pace to hit 1776 by July 31
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
