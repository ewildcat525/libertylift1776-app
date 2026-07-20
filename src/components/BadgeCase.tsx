'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient, Achievement, UserStats } from '@/lib/supabase'

interface BadgeCaseProps {
  userId: string
  stats: UserStats | null
}

// Display order: the 1776 journey first, then single-day and streak feats,
// then special badges. Within a group, easiest first.
const TYPE_ORDER: Record<string, number> = { total: 0, daily: 1, streak: 2, special: 3 }

// Community-milestone badges go to exactly one patriot in history (see the
// community_milestones migration), so showing them as "Locked" to everyone
// else would be a lie. Only the earner sees them in their case.
const ONE_OF_A_KIND = new Set(['liberty_bell', 'grand_union', 'flag_raiser', 'eagle_has_landed', 'farther_than_artemis'])

function sortAchievements(a: Achievement, b: Achievement) {
  const typeDiff = (TYPE_ORDER[a.requirement_type] ?? 9) - (TYPE_ORDER[b.requirement_type] ?? 9)
  if (typeDiff !== 0) return typeDiff
  return (a.threshold ?? 0) - (b.threshold ?? 0)
}

// What the locked-badge progress bar measures for each requirement type.
function progressStat(achievement: Achievement, stats: UserStats | null) {
  if (!achievement.threshold || !stats) return null
  switch (achievement.requirement_type) {
    case 'total':
      return stats.total_pushups
    case 'streak':
      return stats.longest_streak
    case 'daily':
      return stats.best_day
    default:
      return null
  }
}

export default function BadgeCase({ userId, stats }: BadgeCaseProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [earned, setEarned] = useState<Record<string, string>>({}) // achievement_id -> earned_at
  const [justEarned, setJustEarned] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const earnedIdsRef = useRef<Set<string> | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadDefinitions = async () => {
      const { data } = await supabase.from('achievements').select('*')
      if (data) setAchievements([...data].sort(sortAchievements))
    }
    loadDefinitions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-check earned badges whenever the stats behind them move, so a badge
  // granted by the database trigger shows up right after the log that won it.
  useEffect(() => {
    const loadEarned = async () => {
      const { data } = await supabase
        .from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', userId)
      if (!data) {
        setLoading(false)
        return
      }

      const byId: Record<string, string> = {}
      data.forEach(row => {
        byId[row.achievement_id] = row.earned_at
      })

      const ids = new Set(Object.keys(byId))
      const previous = earnedIdsRef.current
      if (previous) {
        const fresh = new Set(Object.keys(byId).filter(id => !previous.has(id)))
        if (fresh.size > 0) setJustEarned(fresh)
      }
      earnedIdsRef.current = ids

      setEarned(byId)
      setLoading(false)
    }
    loadEarned()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, stats?.total_pushups, stats?.longest_streak, stats?.best_day])

  if (loading || achievements.length === 0) return null

  const visible = achievements.filter(a => !ONE_OF_A_KIND.has(a.id) || earned[a.id])
  const earnedCount = visible.filter(a => earned[a.id]).length
  let popIndex = 0

  return (
    <div className="card p-8 mb-8">
      <div className="flex flex-wrap items-end justify-between gap-2 mb-1">
        <h2 className="font-bebas text-3xl text-liberty-red">BADGE CASE</h2>
        <div className="text-sm text-white/50 uppercase tracking-wider">
          <span className="text-liberty-gold font-bold">{earnedCount}</span> of {visible.length} earned
        </div>
      </div>
      <p className="text-white/50 text-sm mb-6">
        Every feat on the road to 1776. Earn them all.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {visible.map(achievement => {
          const earnedAt = earned[achievement.id]
          const isJustEarned = justEarned.has(achievement.id)
          const current = earnedAt ? null : progressStat(achievement, stats)

          return (
            <div
              key={achievement.id}
              className={`achievement ${earnedAt ? 'earned' : 'locked'} ${isJustEarned ? 'just-earned' : ''}`}
              style={isJustEarned ? { animationDelay: `${popIndex++ * 150}ms` } : undefined}
            >
              <div className="text-4xl leading-none" aria-hidden="true">
                {achievement.icon}
              </div>
              <div className="text-sm font-bold text-white text-center uppercase tracking-wide">
                {achievement.name}
              </div>
              <div className="text-[11px] text-white/50 text-center leading-snug">
                {achievement.description}
              </div>

              {earnedAt ? (
                <div className="mt-auto text-[10px] text-liberty-gold font-bold uppercase tracking-[0.15em]">
                  ★ Earned{' '}
                  {new Date(earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              ) : current !== null && achievement.threshold ? (
                <div className="mt-auto w-full">
                  <div className="h-1 bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-liberty-gold/70"
                      style={{ width: `${Math.min(100, (current / achievement.threshold) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-white/40 text-center tabular-nums">
                    {current.toLocaleString()} / {achievement.threshold.toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="mt-auto text-[10px] text-white/30 uppercase tracking-[0.15em]">
                  Locked
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
