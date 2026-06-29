-- Deleted users should not appear on the pledge leaderboard.
--
-- The pledge_leaderboard view LEFT JOINed profiles, so a pledge whose owning
-- profile had been removed still surfaced on the board (falling back to the
-- "Anonymous Patriot" display name via coalesce). Switch to an inner join so a
-- pledge only appears while its profile still exists. Users who simply never
-- set a display name keep their profile row and continue to show as
-- "Anonymous Patriot"; only pledges with no profile at all are dropped.
--
-- user_stats stays a LEFT JOIN: a live profile may have a pledge before logging
-- any push-ups, and should still show with 0 reps / $0 projected.

create or replace view public.pledge_leaderboard
with (security_invoker = false)
as
select
  pledges.user_id,
  coalesce(profiles.display_name, 'Anonymous Patriot') as display_name,
  profiles.state_code,
  pledges.charity,
  pledges.pledge_type,
  pledges.rate_cents,
  coalesce(user_stats.total_pushups, 0) as total_pushups,
  case
    when pledges.pledge_type = 'per_completed'
      then (coalesce(user_stats.total_pushups, 0) * pledges.rate_cents / 100.0)
    else (greatest(0, 1776 - coalesce(user_stats.total_pushups, 0)) * pledges.rate_cents / 100.0)
  end as pledged_amount
from public.pledges
join public.profiles on profiles.id = pledges.user_id
left join public.user_stats on user_stats.user_id = pledges.user_id
where pledges.is_active = true;

grant select on public.pledge_leaderboard to anon, authenticated;
