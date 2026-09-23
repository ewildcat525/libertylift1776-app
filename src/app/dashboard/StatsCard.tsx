'use client'

import { liveStreak } from '@/lib/dates'
import type { Season } from '@/lib/seasons'
import type { UserStats } from '@/lib/supabase'

// The big number, the progress bar to the goal, and four quick stats.
export default function StatsCard({ stats, season }: { stats: UserStats | null; season: Season }) {
  const progress = stats ? (stats.total_pushups / season.goal) * 100 : 0

  return (
    <div className="web-dashboard-detail card p-8 mb-8">
      <div className="text-center mb-6">
        <div className="font-bebas text-8xl text-white">
          {stats?.total_pushups.toLocaleString() || 0}
        </div>
        <div className="text-white/50 uppercase tracking-wider">Total Push-ups</div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm text-white/60 mb-2">
          <span>Progress to {season.goal.toLocaleString()}</span>
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
          <span>{Math.round(season.goal / 2).toLocaleString()}</span>
          <span>{season.goal.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-white/[0.04] border border-liberty-red/30">
          <div className="font-bebas text-3xl text-liberty-red">
            {liveStreak(stats?.current_streak, stats?.last_log_date)}
          </div>
          <div className="text-xs text-white/50 uppercase">Day Streak</div>
        </div>
        <div className="text-center p-4 bg-white/[0.04] border border-white/10">
          <div className="font-bebas text-3xl text-white">
            {stats?.best_day || 0}
          </div>
          <div className="text-xs text-white/50 uppercase">Best Day</div>
        </div>
        <div className="text-center p-4 bg-white/[0.04] border border-white/10">
          <div className="font-bebas text-3xl text-white">
            {stats?.days_logged || 0}
          </div>
          <div className="text-xs text-white/50 uppercase">Days Logged</div>
        </div>
        <div className="text-center p-4 bg-white/[0.04] border border-white/10">
          <div className="font-bebas text-3xl text-white">
            {Math.max(0, season.goal - (stats?.total_pushups || 0))}
          </div>
          <div className="text-xs text-white/50 uppercase">Remaining</div>
        </div>
      </div>
    </div>
  )
}
