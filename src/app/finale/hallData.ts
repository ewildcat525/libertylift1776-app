// Everything the Hall of Honor shows about the season, in one read. Used by
// the server page (cached, so the Hall arrives rendered) and by the client
// as a fallback when the server could not reach the database.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CommunityProgress, Database, LeaderboardEntry, Views } from '@/lib/supabase'

export type StateRow = Views<'state_leaderboard'>
export type FinalPushRow = Views<'final_push_board'>
export type FinisherRow = Pick<LeaderboardEntry, 'id' | 'display_name' | 'state_code' | 'total_pushups'>

export interface HallData {
  progress: CommunityProgress | null
  participants: number | null
  podium: LeaderboardEntry[]
  streakChamps: LeaderboardEntry[]
  dayChamps: LeaderboardEntry[]
  recruitChamps: LeaderboardEntry[]
  finalPushChamps: FinalPushRow[]
  states: StateRow[]
  finishers: FinisherRow[]
  finisherCount: number
  pledged: { total: number; pledgers: number } | null
}

// Everyone tied for the top value of `key`; nobody when the best is zero.
export function topTied<K extends keyof LeaderboardEntry>(rows: LeaderboardEntry[], key: K) {
  if (rows.length === 0) return []
  const best = rows[0][key] ?? 0
  if (!best) return []
  return rows.filter((r) => (r[key] ?? 0) === best)
}

// strict: throw if any read failed, for the server, which has a fallback.
// The client shows whatever sections did load, as it always has.
export async function loadHallData(
  supabase: SupabaseClient<Database>,
  goal: number,
  { strict = true }: { strict?: boolean } = {},
): Promise<HallData> {
  const topBy = (column: 'total_pushups' | 'longest_streak' | 'best_day' | 'recruits', limit: number) =>
    supabase.from('leaderboard').select('*').order(column, { ascending: false }).limit(limit)

  const [
    progress,
    participants,
    podium,
    streak,
    day,
    recruits,
    finalPush,
    states,
    finishers,
    pledges,
  ] = await Promise.all([
    supabase.rpc('get_community_progress'),
    supabase.rpc('participant_count'),
    topBy('total_pushups', 3),
    topBy('longest_streak', 5),
    topBy('best_day', 5),
    topBy('recruits', 5),
    supabase.from('final_push_board').select('*').order('final_push_rank', { ascending: true }).limit(5),
    supabase.from('state_leaderboard').select('*').order('state_rank', { ascending: true }).limit(51),
    supabase
      .from('leaderboard')
      .select('id, display_name, state_code, total_pushups', { count: 'exact' })
      .gte('total_pushups', goal)
      .order('total_pushups', { ascending: false })
      .limit(100),
    supabase.from('pledge_leaderboard').select('pledged_amount'),
  ])

  const failed = [progress, participants, podium, streak, day, recruits, finalPush, states, finishers, pledges]
    .find((result) => result.error)
  if (failed) {
    if (strict) throw failed.error
    console.error('Hall of Honor read failed:', failed.error)
  }

  return {
    progress: progress.data ?? null,
    participants: typeof participants.data === 'number' ? participants.data : null,
    podium: podium.data || [],
    streakChamps: topTied(streak.data || [], 'longest_streak'),
    dayChamps: topTied(day.data || [], 'best_day'),
    recruitChamps: topTied(recruits.data || [], 'recruits'),
    finalPushChamps: (finalPush.data || []).filter((r) => r.final_push_rank === 1),
    states: states.data || [],
    finishers: finishers.data || [],
    finisherCount: finishers.count ?? (finishers.data?.length || 0),
    pledged: pledges.data
      ? {
          total: pledges.data.reduce((sum, row) => sum + (row.pledged_amount || 0), 0),
          pledgers: pledges.data.length,
        }
      : null,
  }
}
