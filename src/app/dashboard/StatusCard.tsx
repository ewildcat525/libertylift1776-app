'use client'

// The card under the header: the grace-day last call, then either the
// countdown, the pace verdict, or — once the books close — the after-action
// report with the patriot's final standing.
import { track } from '@vercel/analytics'
import Countdown from '@/components/Countdown'
import ShareProgress from '@/components/ShareProgress'
import { US_STATES, type Profile, type UserStats } from '@/lib/supabase'
import { liveStreak, type ChallengePhase } from '@/lib/dates'
import { dailyPaceFor, type Pace } from '@/lib/progress'
import type { Season } from '@/lib/seasons'

interface StatusCardProps {
  phase: ChallengePhase | null
  pace: Pace
  season: Season
  profile: Profile | null
  stats: UserStats | null
  requiredPerDay: number | null
  finalRank: number | null
  boardSize: number | null
}

export default function StatusCard({
  phase,
  pace,
  season,
  profile,
  stats,
  requiredPerDay,
  finalRank,
  boardSize,
}: StatusCardProps) {
  const total = stats?.total_pushups ?? 0
  const finalDay = new Date(`${season.endsOn}T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      {/* Grace day: the books are still open for July reps. */}
      {phase === 'grace' && (
        <div
          className="web-dashboard-status mb-8 p-4 bg-yellow-500/15 border border-yellow-500/40 text-center text-yellow-200 text-sm"
          role="status"
        >
          🔔 <strong>Last call.</strong> The contest ended {finalDay} — you have until midnight
          tonight to log any July reps you missed. After that, the books are closed for good.
        </div>
      )}

      {/* After-action report replaces the pace card once standings are final. */}
      {phase === 'ended' ? (
        <div className="web-dashboard-status card p-8 mb-8 text-center">
          <div className="app-eyebrow mb-3 justify-center">After-action report</div>
          <h2 className="font-bebas text-4xl sm:text-5xl text-white mb-2">
            {total >= season.goal ? 'Liberty achieved.' : 'You answered the call.'}
          </h2>
          <p className="text-white/60 text-sm max-w-lg mx-auto">
            {total >= season.goal
              ? `All ${season.goal.toLocaleString()} push-ups, in the books. Founding Father, forever.`
              : `${total.toLocaleString()} push-ups on the board${
                  profile?.state_code ? ` for ${US_STATES[profile.state_code]}` : ''
                } — every one of them counted in the national total.`}
          </p>
          {finalRank !== null && (
            <p className="text-white/80 text-sm mt-3">
              Final standing:{' '}
              <span className="text-liberty-gold font-bold">#{finalRank.toLocaleString()}</span>{' '}
              in the nation
              {boardSize !== null && ` of ${boardSize.toLocaleString()} on the board`}.
            </p>
          )}
          {total >= season.goal && (
            <p className="text-sm mt-3">
              <a
                href="/merch"
                onClick={() => track('merch_unlock_cta_clicked')}
                className="text-liberty-gold hover:underline"
              >
                You earned the Reps for the Republic tee — view the 2026 edition →
              </a>
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <a href="/finale" className="btn-gold px-8 py-3">
              Enter the Hall of Honor
            </a>
          </div>
          {profile?.display_name && (
            <ShareProgress
              handle={profile.display_name}
              totalPushups={total}
              currentStreak={liveStreak(stats?.current_streak, stats?.last_log_date)}
              stateCode={profile.state_code}
              context="finale_recap"
              className="mt-4"
            />
          )}
        </div>
      ) : pace === 'before' ? (
        <Countdown className="web-dashboard-status dashboard-countdown mb-8" hideWhenLive />
      ) : (
        <div className="web-dashboard-status card p-6 text-center mb-8">
          <div className={`inline-flex items-center gap-2 px-4 py-2 border ${
            pace === 'ahead' ? 'bg-green-500/20 text-green-300 border-green-500/40' :
            pace === 'ontrack' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
            pace === 'behind' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
            'bg-liberty-red/20 text-liberty-red border-liberty-red/40'
          }`}>
            <span>
              {pace === 'ahead' ? 'Ahead' :
               pace === 'ontrack' ? 'On Track' :
               pace === 'behind' ? 'Behind' : 'Complete'}
            </span>
          </div>
          <p className="text-sm text-white/60 mt-3">
            {pace === 'complete'
              ? `You did it: ${season.goal.toLocaleString()} push-ups in July.`
              : phase === 'grace'
                ? 'The challenge window is over — log any missed July reps before midnight tonight.'
                : requiredPerDay !== null
                  ? `Target: ${requiredPerDay} push-ups per day from today to hit ${season.goal.toLocaleString()} by the final day.`
                  : `Target: ${dailyPaceFor(season)} push-ups per day to hit ${season.goal.toLocaleString()} by the final day.`}
          </p>
        </div>
      )}
    </>
  )
}
