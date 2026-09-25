'use client'

// The native app's home: progress ring, today's numbers, the Log a set
// action, July activity, the next milestone and recent work. Hidden on the
// web by CSS; the web layout below it covers the same ground.
import Link from 'next/link'
import { AMERICAN_FACTS, type Profile, type UserStats } from '@/lib/supabase'
import { liveStreak, localDateString, type ChallengePhase } from '@/lib/dates'
import { seasonLengthInDays, type Season } from '@/lib/seasons'
import { seasonDate } from '@/lib/progress'

interface NativeTodayProps {
  profile: Profile | null
  stats: UserStats | null
  dailyLogs: Record<string, number>
  phase: ChallengePhase | null
  season: Season
  onOpenLogger: () => void
}

export default function NativeToday({ profile, stats, dailyLogs, phase, season, onOpenLogger }: NativeTodayProps) {
  const seasonDays = seasonLengthInDays(season)
  const totalPushups = stats?.total_pushups ?? 0
  const progress = stats ? (stats.total_pushups / season.goal) * 100 : 0
  const remainingPushups = Math.max(0, season.goal - totalPushups)
  const nextMilestone = AMERICAN_FACTS.find(milestone => milestone.threshold > totalPushups)
  const activeDays = stats?.days_logged ?? Object.values(dailyLogs).filter(Boolean).length
  const averageActiveDay = activeDays > 0 ? Math.round(totalPushups / activeDays) : 0
  const seasonActivity = Array.from({ length: seasonDays }, (_, index) => {
    const day = index + 1
    const count = dailyLogs[seasonDate(season, day)] ?? 0
    return { day, count }
  })
  const recentLogEntries = Object.entries(dailyLogs)
    .filter(([, count]) => count > 0)
    .sort(([left], [right]) => right.localeCompare(left))
    .slice(0, 3)

  return (
    <section className="native-today" aria-labelledby="native-today-title">
      <header className="native-today-heading">
        <div>
          <div className="native-overline">Your campaign</div>
          <h1 id="native-today-title">Ready, {profile?.display_name?.split(' ')[0] || 'Patriot'}?</h1>
          <p>{phase === 'ended' ? `Your ${season.year} campaign is in the books.` : 'Keep the promise you made to yourself.'}</p>
        </div>
        <Link href="/profile" className="native-avatar" aria-label="Open your profile">
          {profile?.display_name
            ?.split(/\s+/)
            .slice(0, 2)
            .map(part => part[0])
            .join('')
            .toUpperCase() || 'LL'}
        </Link>
      </header>

      <div className="native-progress-hero">
        <div className="native-progress-copy">
          <span>Total completed</span>
          <strong>{totalPushups.toLocaleString()}</strong>
          <small>of {season.goal.toLocaleString()} push-ups</small>
        </div>
        <div
          className="native-progress-ring"
          style={{ '--native-progress': `${Math.min(progress, 100)}%` } as React.CSSProperties}
          role="progressbar"
          aria-label="Challenge completion"
          aria-valuemin={0}
          aria-valuemax={season.goal}
          aria-valuenow={Math.min(totalPushups, season.goal)}
          aria-valuetext={`${Math.round(progress)} percent complete`}
        >
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="native-progress-track" aria-hidden="true">
          <span style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      </div>

      <div className="native-today-stats">
        <div><span>Today</span><strong>{dailyLogs[localDateString()] || 0}</strong><small>reps</small></div>
        <div><span>Streak</span><strong>{liveStreak(stats?.current_streak, stats?.last_log_date)}</strong><small>days</small></div>
        <div><span>Remaining</span><strong>{remainingPushups}</strong><small>reps</small></div>
      </div>

      {phase === 'ended' ? (
        <Link href="/finale" className="native-primary-action">
          <span>View your final result</span><b aria-hidden="true">›</b>
        </Link>
      ) : (
        <button type="button" className="native-primary-action" onClick={onOpenLogger}>
          <span className="native-primary-action-icon" aria-hidden="true">＋</span>
          <span>Log a set</span>
        </button>
      )}

      <section className="native-momentum-card" aria-labelledby="native-momentum-title">
        <div className="native-section-heading">
          <div>
            <span>Consistency</span>
            <h2 id="native-momentum-title">July activity</h2>
          </div>
          <strong>{activeDays}<small>/{seasonDays} days</small></strong>
        </div>
        <div className="native-activity-grid" aria-label={`${activeDays} active days in July`}>
          <span className="sr-only">
            {seasonActivity.filter(day => day.count > 0).map(day => `July ${day.day}: ${day.count} push-ups`).join('; ') || 'No activity logged'}
          </span>
          {seasonActivity.map(({ day, count }) => (
            <span
              key={day}
              className={count > 0 ? 'is-active' : ''}
              style={{ '--activity-strength': Math.min(1, 0.32 + count / 140) } as React.CSSProperties}
              title={`July ${day}: ${count} push-ups`}
            />
          ))}
        </div>
        <div className="native-momentum-stats">
          <div><span>Active-day average</span><strong>{averageActiveDay}</strong></div>
          <div><span>Best day</span><strong>{stats?.best_day ?? 0}</strong></div>
          <div><span>Longest streak</span><strong>{stats?.longest_streak ?? 0}</strong></div>
        </div>
      </section>

      {nextMilestone && (
        <section className="native-milestone-card" aria-label="Next milestone">
          <span className="native-milestone-icon" aria-hidden="true">✦</span>
          <div>
            <span>Next milestone</span>
            <strong>{nextMilestone.threshold.toLocaleString()} reps</strong>
            <small>{(nextMilestone.threshold - totalPushups).toLocaleString()} to go</small>
          </div>
        </section>
      )}

      {recentLogEntries.length > 0 && (
        <section className="native-recent-card" aria-labelledby="native-recent-title">
          <div className="native-section-heading">
            <div>
              <span>History</span>
              <h2 id="native-recent-title">Recent work</h2>
            </div>
          </div>
          <div className="native-recent-list">
            {recentLogEntries.map(([date, count]) => (
              <div key={date}>
                <span className="native-recent-check" aria-hidden="true">✓</span>
                <div>
                  <strong>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</strong>
                  <small>Completed</small>
                </div>
                <b>{count.toLocaleString()}<small> reps</small></b>
              </div>
            ))}
          </div>
        </section>
      )}

      <nav className="native-quick-links" aria-label="Quick links">
        <Link href="/leaderboard"><span aria-hidden="true">⌁</span><div><strong>Standings</strong><small>See where you rank</small></div><b aria-hidden="true">›</b></Link>
        <Link href="/contests"><span aria-hidden="true">◉</span><div><strong>Your crews</strong><small>Train with your people</small></div><b aria-hidden="true">›</b></Link>
      </nav>
    </section>
  )
}
