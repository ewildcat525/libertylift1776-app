-- The closing bell: freeze the Final Push at one national instant, and stop
-- the day's views from scanning the whole log table to find it.
--
-- 1. THE BELL. The Final Push is a live contest, so it closes live. The crown
--    is decided at midnight ending July 31 in the last US timezone to reach
--    it — Hawaii, UTC-10 and never on DST, at 2026-08-01T10:00Z. (Alaska is
--    on AKDT in July, UTC-8, so it gets there at 08:00Z; Hawaii is the later
--    of the two and therefore the one that decides it.) Same
--    midnight-in-Hawaii convention as the books freeze in
--    20260727120000_close_the_books.sql, exactly one day earlier.
--
--    Before this, the day board counted any July-31-dated log whenever it was
--    written, so a grace-day entry on August 1 could still unseat the
--    champion a full day after everyone watched them win. Now the views count
--    only what was logged BEFORE the bell (created_at < the deadline). Late
--    reps are not thrown away — they still count toward 1,776, your state and
--    the national total, through every other view. They just cannot rewrite
--    who won the last day.
--
-- 2. SCALING. Every view filtered on date(logged_at at time zone
--    'America/New_York') = '2026-07-31'. Wrapping the column in a function
--    makes the predicate unsargable: Postgres cannot use idx_pushup_logs_
--    logged_at and has to compute a timezone conversion for every row in the
--    table on every query. The war room polls every 25s per viewer and
--    refetches on each burst of inserts, so that is the hot path on the
--    busiest day of the campaign. The equivalent range — Eastern July 31 is
--    [2026-07-31T04:00Z, 2026-08-01T04:00Z) — compares the bare column
--    against constants and uses the index. The dashboard stamps logs at noon
--    local for the chosen day, so every US timezone's July 31 lands inside
--    that window (Hawaii, the far edge, at 22:00Z on the 31st).

-- Reused by all four views below. Bounds spelled out rather than computed so
-- the planner sees plain constants.
--   day starts : 2026-07-31 00:00 America/New_York
--   day ends   : 2026-08-01 00:00 America/New_York
--   bell       : 2026-08-01 00:00 Pacific/Honolulu

create or replace view public.final_push_board
with (security_invoker = false)
as
select
  p.id,
  p.display_name,
  p.state_code,
  sum(l.count)::integer as final_day_pushups,
  rank() over (order by sum(l.count) desc) as final_push_rank
from public.pushup_logs l
join public.profiles p on p.id = l.user_id
where l.logged_at >= timestamptz '2026-07-31 04:00:00+00'
  and l.logged_at < timestamptz '2026-08-01 04:00:00+00'
  and l.created_at < timestamptz '2026-08-01 10:00:00+00'
group by p.id, p.display_name, p.state_code
order by final_day_pushups desc;

grant select on public.final_push_board to anon, authenticated;

create or replace view public.final_push_pulse
with (security_invoker = false)
as
select
  coalesce(sum(l.count), 0)::integer as total_pushups,
  count(distinct l.user_id)::integer as patriots,
  count(*)::integer as sets_logged,
  coalesce(max(l.count), 0)::integer as biggest_set,
  max(l.created_at) as last_rep_at
from public.pushup_logs l
where l.logged_at >= timestamptz '2026-07-31 04:00:00+00'
  and l.logged_at < timestamptz '2026-08-01 04:00:00+00'
  and l.created_at < timestamptz '2026-08-01 10:00:00+00';

grant select on public.final_push_pulse to anon, authenticated;

create or replace view public.final_push_state_board
with (security_invoker = false)
as
select
  p.state_code,
  count(distinct l.user_id)::integer as participants,
  sum(l.count)::integer as total_pushups,
  (sum(l.count) / count(distinct l.user_id))::integer as avg_pushups,
  rank() over (order by sum(l.count) desc)::integer as state_rank
from public.pushup_logs l
join public.profiles p on p.id = l.user_id
where p.state_code is not null
  and l.logged_at >= timestamptz '2026-07-31 04:00:00+00'
  and l.logged_at < timestamptz '2026-08-01 04:00:00+00'
  and l.created_at < timestamptz '2026-08-01 10:00:00+00'
group by p.state_code
order by total_pushups desc;

grant select on public.final_push_state_board to anon, authenticated;

create or replace view public.final_push_feed
with (security_invoker = false)
as
select
  l.id,
  l.created_at,
  l.count,
  p.id as user_id,
  p.display_name,
  p.state_code
from public.pushup_logs l
join public.profiles p on p.id = l.user_id
where l.logged_at >= timestamptz '2026-07-31 04:00:00+00'
  and l.logged_at < timestamptz '2026-08-01 04:00:00+00'
  and l.created_at < timestamptz '2026-08-01 10:00:00+00'
order by l.created_at desc;

grant select on public.final_push_feed to anon, authenticated;

-- Covers the whole final day in one small index, so the war room's repeated
-- aggregates never touch the rest of July.
create index if not exists idx_pushup_logs_final_day
  on public.pushup_logs (user_id, count)
  where logged_at >= timestamptz '2026-07-31 04:00:00+00'
    and logged_at < timestamptz '2026-08-01 04:00:00+00';
