-- The Final Push: a one-day blitz on July 31. Most reps logged on the last
-- day of the contest crowns the Final Push Champion, honored forever in the
-- Hall of Honor.
--
-- 1. A public board ranking every patriot's July 31 total. Buckets by the
--    challenge timezone (US Eastern), matching the reminder cron. Note the
--    dashboard stamps logs at noon *local* time for the chosen day, so any
--    US-timezone log dated July 31 lands on the Eastern calendar day too.
-- 2. profiles.final_push_emailed_at for the announcement blast's
--    idempotency, mirroring launch_emailed_at / finale_emailed_at.

create or replace view public.final_push_board
with (security_invoker = true)
as
select
  p.id,
  p.display_name,
  p.state_code,
  sum(l.count)::integer as final_day_pushups,
  rank() over (order by sum(l.count) desc) as final_push_rank
from public.pushup_logs l
join public.profiles p on p.id = l.user_id
where date(l.logged_at at time zone 'America/New_York') = date '2026-07-31'
group by p.id, p.display_name, p.state_code
order by final_day_pushups desc;

grant select on public.final_push_board to anon, authenticated;

alter table public.profiles
  add column if not exists final_push_emailed_at timestamptz;
