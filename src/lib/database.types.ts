// The Database type every Supabase client in the app is built with.
//
// database.generated.ts is regenerated from the live schema. Postgres cannot
// say which view columns are never null, so the generator marks every one of
// them nullable; and it cannot see BEFORE INSERT triggers that fill required
// columns. Both are corrected here, and only here, from the view and trigger
// definitions in supabase/migrations.
import type { Database as Generated } from './database.generated'

export type { Json } from './database.generated'

type Simplify<T> = { [K in keyof T]: T[K] }

type GeneratedViews = Generated['public']['Views']
type GeneratedTables = Generated['public']['Tables']

// Mark columns of a view row as never null.
type StrictView<
  V extends keyof GeneratedViews,
  K extends keyof GeneratedViews[V]['Row'],
> = Simplify<
  Omit<GeneratedViews[V], 'Row'> & {
    Row: Simplify<
      Omit<GeneratedViews[V]['Row'], K> & {
        [P in K]: NonNullable<GeneratedViews[V]['Row'][P]>
      }
    >
  }
>

// Make columns optional on insert because a trigger fills them.
type TriggerFilled<
  T extends keyof GeneratedTables,
  K extends keyof GeneratedTables[T]['Insert'],
> = Simplify<
  Omit<GeneratedTables[T], 'Insert'> & {
    Insert: Simplify<
      Omit<GeneratedTables[T]['Insert'], K> & Partial<Pick<GeneratedTables[T]['Insert'], K>>
    >
  }
>

type StrictViews = {
  // profiles joined to season_user_stats (all NOT NULL), with window ranks
  // and a count() subquery.
  leaderboard: StrictView<
    'leaderboard',
    | 'id'
    | 'created_at'
    | 'total_pushups'
    | 'current_streak'
    | 'longest_streak'
    | 'best_day'
    | 'days_logged'
    | 'global_rank'
    | 'recruits'
  >
  // Every column coalesced, or a profile key.
  user_stats: StrictView<
    'user_stats',
    | 'user_id'
    | 'total_pushups'
    | 'current_streak'
    | 'longest_streak'
    | 'best_day'
    | 'days_logged'
    | 'updated_at'
    | 'season_year'
  >
  // Filtered to state_code IS NOT NULL; aggregates over a non-empty group.
  state_leaderboard: StrictView<
    'state_leaderboard',
    'state_code' | 'participants' | 'total_pushups' | 'avg_pushups' | 'state_rank'
  >
  public_profiles: StrictView<'public_profiles', 'id' | 'created_at'>
  public_user_daily_pushups: StrictView<
    'public_user_daily_pushups',
    'user_id' | 'log_date' | 'daily_pushups' | 'season_year'
  >
  final_push_board: StrictView<'final_push_board', 'id' | 'final_day_pushups' | 'final_push_rank'>
  pledge_leaderboard: StrictView<
    'pledge_leaderboard',
    | 'user_id'
    | 'display_name'
    | 'charity'
    | 'pledge_type'
    | 'rate_cents'
    | 'total_pushups'
    | 'pledged_amount'
  >
}

// CHECK constraints narrow these text columns. The database now accepts
// only the first value of each; the app still understands the retired ones.
type PledgeColumns = {
  charity: 'wounded_warrior' | 'save_the_children'
  pledge_type: 'per_completed' | 'per_short'
}
type Pledges = Simplify<{
  [Op in keyof GeneratedTables['pledges']]: Op extends 'Row' | 'Insert' | 'Update'
    ? Simplify<
        Omit<GeneratedTables['pledges'][Op], keyof PledgeColumns> &
          (Op extends 'Row' ? PledgeColumns : Partial<PledgeColumns>)
      >
    : GeneratedTables['pledges'][Op]
}>

type TableOverrides = {
  // enforce_contest_season() stamps the season on insert.
  contests: TriggerFilled<'contests', 'season_year'>
  pledges: Pledges
}

// Functions that return json: the shape their SQL builds.
export interface CommunityMilestone {
  threshold: number
  hit_by: string | null
  hit_at: string | null
  hit_by_name: string | null
  hit_by_state: string | null
}

export interface CommunityProgress {
  total_pushups: number
  milestones: CommunityMilestone[]
}

type GeneratedFunctions = Generated['public']['Functions']
type FunctionOverrides = {
  get_community_progress: Simplify<
    Omit<GeneratedFunctions['get_community_progress'], 'Returns'> & { Returns: CommunityProgress }
  >
}

export type Database = Simplify<
  Omit<Generated, 'public'> & {
    public: Simplify<
      Omit<Generated['public'], 'Views' | 'Tables' | 'Functions'> & {
        Tables: Simplify<Omit<GeneratedTables, keyof TableOverrides> & TableOverrides>
        Views: Simplify<Omit<GeneratedViews, keyof StrictViews> & StrictViews>
        Functions: Simplify<Omit<GeneratedFunctions, keyof FunctionOverrides> & FunctionOverrides>
      }
    >
  }
>

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Views<V extends keyof Database['public']['Views']> =
  Database['public']['Views'][V]['Row']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
