-- The Final Push War Room: make the last day of the challenge live.
--
-- 20260727150000_final_push.sql shipped the day board, but it left three
-- gaps that only bite on the day itself (July 31):
--
-- 0. BUG: final_push_board was created with security_invoker = true, so it
--    runs under the *reader's* RLS. profiles was locked down to own-row
--    reads in 20260610090000 ("Users can view own profile"), which is why
--    every other public board — leaderboard, state_leaderboard,
--    pledge_leaderboard — is explicitly security_invoker = false. As
--    written, the Final Push board returns zero rows to logged-out
--    visitors and exactly one row (your own, ranked #1) to everyone else:
--    the leaderboard tab reads empty, the banner shows a board of one, and
--    the Hall of Honor would crown the viewer as Final Push Champion. The
--    view exposes only display_name, state_code and totals — no email — so
--    definer is safe here, same as the boards it sits beside.
-- 1. Nothing to power a live experience: the day's national totals, the
--    state-vs-state battle, and the tape of reps landing all needed their
--    own round trips against a table anon cannot read.
-- 2. pushup_logs was not in the realtime publication, so a board could only
--    move when the viewer themselves logged. The war room subscribes to
--    inserts so the nation's reps land on everyone's screen as they happen.
--
-- All four views are security_invoker = false for the reason in (0), and
-- all expose the same public columns the leaderboard already does.

-- ============================================================
-- 0. Fix the day board's visibility
-- ============================================================

alter view public.final_push_board set (security_invoker = false);

-- ============================================================
-- 1. The national pulse: one row, the whole country's July 31
-- ============================================================

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
where date(l.logged_at at time zone 'America/New_York') = date '2026-07-31';

grant select on public.final_push_pulse to anon, authenticated;

-- ============================================================
-- 2. State vs state, for the final day only
-- ============================================================

-- Same shape as state_leaderboard, scoped to the 31st. avg_pushups is the
-- pound-for-pound number: a small state that empties the tank can beat a
-- big one on average even while losing the raw total.
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
  and date(l.logged_at at time zone 'America/New_York') = date '2026-07-31'
group by p.state_code
order by total_pushups desc;

grant select on public.final_push_state_board to anon, authenticated;

-- ============================================================
-- 3. The tape: individual sets landing across the country
-- ============================================================

-- Ordered by created_at (when the row was written), NOT logged_at — the
-- dashboard stamps every log at noon local for the chosen day, so
-- logged_at carries no time-of-day signal and would order the feed
-- arbitrarily. Callers apply their own limit.
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
where date(l.logged_at at time zone 'America/New_York') = date '2026-07-31'
order by l.created_at desc;

grant select on public.final_push_feed to anon, authenticated;

-- Keeps the feed and the day board off a full scan of every July log.
create index if not exists idx_pushup_logs_created_at
  on public.pushup_logs(created_at desc);

-- ============================================================
-- 4. Realtime: every rep lands on every screen
-- ============================================================

-- pushup_logs already carries a permissive select policy ("Users can view
-- all logs", using (true)), so realtime can authorize both anon and
-- authenticated subscribers against it. The payload is the log row only —
-- user_id, count, timestamps — which the war room resolves to a handle
-- through final_push_feed.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pushup_logs'
  ) then
    alter publication supabase_realtime add table public.pushup_logs;
  end if;
end;
$$;
