// The one client path for writing reps.
//
// Logging used to be an insert straight into pushup_logs from two different
// screens, each stamping its own timestamp and each trusting the client's idea
// of which July it was. It now goes through the log_pushups RPC, so the daily
// cap, the season window and the timestamp convention live in Postgres where
// the native iOS client reaches them too.
import type { SupabaseClient } from '@supabase/supabase-js'

export interface LogPushupsResult {
  log_id: string
  created: boolean
  season_year: number
  logged_on: string
  day_total: number
  season_total: number
  goal: number
  daily_cap: number
}

// Every write carries an id the client generated, so a retry after a dropped
// response returns the original log instead of logging the set twice. The
// native app's offline queue depends on this; the web app gets it for free.
function newClientLogId(): string | null {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return null
}

export async function logPushups(
  supabase: SupabaseClient<any>,
  options: { count: number; day?: string | null; notes?: string | null; clientLogId?: string | null },
) {
  return supabase.rpc('log_pushups', {
    p_count: options.count,
    p_logged_on: options.day ?? null,
    p_notes: options.notes ?? null,
    p_client_log_id: options.clientLogId ?? newClientLogId(),
  })
}

export async function clearPushupsForDay(supabase: SupabaseClient<any>, day: string) {
  return supabase.rpc('clear_pushups_for_day', { p_day: day })
}
