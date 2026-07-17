-- Live current streak on the public boards.
--
-- user_stats.current_streak is a stored column, only rewritten by the
-- update_user_stats() trigger on a log insert and recalculate_user_stats()
-- on a delete. When a user stops logging, nothing rewrites it, so the value
-- freezes at their last streak: the leaderboard keeps showing "16 day streak"
-- long after they quit. compute_streaks() already treats a streak as alive
-- only while its last logged day is yesterday or today (US Eastern) — but that
-- check runs at write time, not read time, so the frozen value never expires.
--
-- Expire it in the view instead: a stored streak counts only while the user's
-- last_log_date is still yesterday or today (Eastern). Once yesterday is
-- missed the streak is broken and reads 0. This is the same rule the app
-- applies in TypeScript (liveStreak() in lib/dates.ts) for the surfaces that
-- read user_stats directly (dashboard, contests, reminder emails).
--
-- longest_streak is a historical high-water mark and never goes stale, so it
-- is left untouched.

create or replace view public.leaderboard
with (security_invoker = false)
as
select
  p.id,
  p.display_name,
  p.state_code,
  p.avatar_url,
  s.total_pushups,
  case
    when s.last_log_date >= (now() at time zone 'America/New_York')::date - 1
      then s.current_streak
    else 0
  end as current_streak,
  s.longest_streak,
  s.best_day,
  s.days_logged,
  rank() over (order by s.total_pushups desc) as global_rank,
  (select count(*) from public.profiles r where r.referred_by = p.id) as recruits,
  p.created_at
from public.profiles p
join public.user_stats s on p.id = s.user_id
where s.total_pushups > 0
order by s.total_pushups desc;
