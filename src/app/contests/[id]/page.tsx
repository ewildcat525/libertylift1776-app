'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient, Contest, US_STATES } from '@/lib/supabase'
import Navigation from '@/components/Navigation'
import Link from 'next/link'
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

interface ContestMember {
  user_id: string
  display_name: string | null
  state_code: string | null
  total_pushups: number
  current_streak: number
  best_day: number
  joined_at: string
}

interface DailyData {
  day: number
  pace: number
  [key: string]: number // user totals keyed by display name
}

// Color palette for chart lines
const CHART_COLORS = [
  '#FFD700', // gold
  '#EF4444', // red
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
]

export default function ContestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const contestId = params.id as string
  
  const [contest, setContest] = useState<Contest | null>(null)
  const [members, setMembers] = useState<ContestMember[]>([])
  const [chartData, setChartData] = useState<DailyData[]>([])
  const [user, setUser] = useState<any>(null)
  const [isMember, setIsMember] = useState(false)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState<'all' | 'streak' | 'daily'>('all')

  const supabase = createClient()

  useEffect(() => {
    const loadContest = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const { data: contestData, error } = await supabase
        .from('contests')
        .select('*')
        .eq('id', contestId)
        .single()

      if (error || !contestData) {
        router.push('/contests')
        return
      }

      setContest(contestData)

      const { data: participants } = await supabase
        .from('contest_participants')
        .select('user_id, joined_at')
        .eq('contest_id', contestId)

      if (participants && participants.length > 0) {
        const userIds = participants.map(p => p.user_id)
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, state_code')
          .in('id', userIds)

        const { data: stats } = await supabase
          .from('user_stats')
          .select('user_id, total_pushups, current_streak, best_day')
          .in('user_id', userIds)

        // Get daily pushup logs for chart (July 2026 only)
        const { data: logs } = await supabase
          .from('pushup_logs')
          .select('user_id, count, logged_at')
          .in('user_id', userIds)
          .gte('logged_at', '2026-07-01')
          .lte('logged_at', '2026-07-31T23:59:59')
          .order('logged_at', { ascending: true })

        const memberData: ContestMember[] = participants.map((p: any) => {
          const profile = profiles?.find(pr => pr.id === p.user_id)
          const stat = stats?.find(s => s.user_id === p.user_id)
          return {
            user_id: p.user_id,
            display_name: profile?.display_name || null,
            state_code: profile?.state_code || null,
            total_pushups: stat?.total_pushups || 0,
            current_streak: stat?.current_streak || 0,
            best_day: stat?.best_day || 0,
            joined_at: p.joined_at,
          }
        })

        memberData.sort((a, b) => b.total_pushups - a.total_pushups)
        setMembers(memberData)

        // Build chart data
        const dailyTotals: { [userId: string]: { [day: number]: number } } = {}
        
        // Initialize daily totals for each user
        userIds.forEach(uid => {
          dailyTotals[uid] = {}
          for (let d = 1; d <= 31; d++) {
            dailyTotals[uid][d] = 0
          }
        })

        // Aggregate logs by day
        logs?.forEach(log => {
          const day = new Date(log.logged_at).getDate()
          if (day >= 1 && day <= 31) {
            dailyTotals[log.user_id][day] += log.count
          }
        })

        // Build cumulative chart data
        const chartDataPoints: DailyData[] = []
        const cumulatives: { [userId: string]: number } = {}
        userIds.forEach(uid => { cumulatives[uid] = 0 })

        for (let day = 1; day <= 31; day++) {
          const point: DailyData = {
            day,
            pace: Math.round(57.29 * day), // 1776 / 31 ≈ 57.29
          }

          memberData.forEach((member, idx) => {
            cumulatives[member.user_id] += dailyTotals[member.user_id][day] || 0
            const name = member.display_name || `User ${idx + 1}`
            point[name] = cumulatives[member.user_id]
          })

          chartDataPoints.push(point)
        }

        setChartData(chartDataPoints)

        if (user) {
          setIsMember(memberData.some(m => m.user_id === user.id))
        }
      }

      setLoading(false)
    }

    loadContest()
  }, [contestId])

  const joinContest = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    setJoining(true)
    const { error } = await supabase
      .from('contest_participants')
      .insert({
        contest_id: contestId,
        user_id: user.id,
      })

    if (!error) {
      setIsMember(true)
      window.location.reload()
    }
    setJoining(false)
  }

  const copyInviteCode = () => {
    if (contest) {
      navigator.clipboard.writeText(contest.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const sortedMembers = [...members].sort((a, b) => {
    if (filter === 'streak') return b.current_streak - a.current_streak
    if (filter === 'daily') return b.best_day - a.best_day
    return b.total_pushups - a.total_pushups
  })

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen pt-20 pb-12 px-4">
          <div className="max-w-4xl mx-auto text-center text-white/50 py-12">
            Loading contest...
          </div>
        </div>
      </>
    )
  }

  if (!contest) return null

  return (
    <>
      <Navigation />
      <div className="min-h-screen pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/contests" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
            ← Back to Contests
          </Link>

          {/* Contest Header */}
          <div className="card p-6 mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="font-bebas text-4xl text-liberty-gold mb-2">
                  🏆 {contest.name}
                </h1>
                {contest.description && (
                  <p className="text-white/70 mb-4">{contest.description}</p>
                )}
              </div>
              <span className={`text-xs px-3 py-1 rounded-full ${
                contest.is_public ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/50'
              }`}>
                {contest.is_public ? 'Public' : 'Private'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg">
                <span className="text-sm text-white/50">Invite Code:</span>
                <span className="font-mono text-liberty-gold font-bold">{contest.invite_code}</span>
                <button onClick={copyInviteCode} className="text-white/50 hover:text-white transition-colors">
                  {copied ? '✓' : '📋'}
                </button>
              </div>
              <div className="text-sm text-white/50">
                👥 {members.length} {members.length === 1 ? 'patriot' : 'patriots'}
              </div>
              {!isMember && (
                <button onClick={joinContest} disabled={joining} className="btn-gold text-sm py-2 ml-auto">
                  {joining ? 'Joining...' : '🦅 Join Contest'}
                </button>
              )}
            </div>
          </div>

          {/* Progress Chart */}
          {members.length > 0 && (
            <div className="card p-6 mb-8">
              <h2 className="font-bebas text-2xl text-liberty-gold mb-4">📈 Progress to 1776</h2>
              <div className="h-[300px] sm:h-[400px]">
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
                    />
                    <Legend />
                    
                    {/* Pace line (57/day) */}
                    <Line
                      type="monotone"
                      dataKey="pace"
                      name="57/day pace"
                      stroke="#666"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      dot={false}
                    />
                    
                    {/* User lines */}
                    {members.map((member, idx) => (
                      <Line
                        key={member.user_id}
                        type="monotone"
                        dataKey={member.display_name || `User ${idx + 1}`}
                        stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    ))}

                    {/* 1776 goal line */}
                    <ReferenceLine y={1776} stroke="#FFD700" strokeDasharray="3 3" label={{ value: '🎆 1776', fill: '#FFD700', fontSize: 12 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-white/40 text-sm mt-2">
                Dashed line = 57 push-ups/day pace to reach 1776 by July 31
              </p>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex justify-center gap-2 mb-6">
            {[
              { key: 'all', label: 'Total Push-ups' },
              { key: 'streak', label: 'Best Streak' },
              { key: 'daily', label: 'Best Day' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as 'all' | 'streak' | 'daily')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? 'bg-liberty-gold text-liberty-dark'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Contest Leaderboard */}
          {members.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-5xl mb-4">🦅</div>
              <h2 className="font-bebas text-2xl text-liberty-gold mb-2">No Patriots Yet!</h2>
              <p className="text-white/60">Be the first to join this contest.</p>
            </div>
          ) : (
            <div className="card overflow-hidden divide-y divide-white/10">
              {sortedMembers.map((member, index) => (
                <div
                  key={member.user_id}
                  className={`flex items-center gap-4 p-4 hover:bg-white/5 transition-colors ${
                    user && member.user_id === user.id ? 'bg-liberty-gold/10' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-liberty-dark' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-liberty-dark' :
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-liberty-dark' :
                    'bg-white/10 text-white/70'
                  }`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[members.findIndex(m => m.user_id === member.user_id) % CHART_COLORS.length] }}
                      />
                      {member.display_name || 'Anonymous'}
                      {user && member.user_id === user.id && (
                        <span className="text-xs text-liberty-gold">(You)</span>
                      )}
                    </div>
                    <div className="text-sm text-white/50">
                      {member.state_code ? US_STATES[member.state_code] : 'No state'}
                      {member.current_streak > 0 && ` • 🔥 ${member.current_streak} day streak`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bebas text-2xl text-white">
                      {filter === 'streak' ? member.current_streak :
                       filter === 'daily' ? member.best_day :
                       member.total_pushups.toLocaleString()}
                    </div>
                    <div className="text-xs text-white/50">
                      {filter === 'streak' ? 'days' : filter === 'daily' ? 'in one day' : 'push-ups'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
