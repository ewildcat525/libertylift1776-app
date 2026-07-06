-- Nationwide count: only patriots who joined a state.
--
-- The original community counter summed every rep ever logged, so it ran
-- ~1,400 reps ahead of the State Battle page (which only counts profiles
-- with a state_code) and rang the 50,000 bell early. Redefine the
-- nationwide total as exactly what the State Battle page sums —
-- user_stats for profiles with a state — so the two numbers can never
-- disagree again.
--
-- 1. Drop the trigger-maintained community_stats counter; the total is now
--    derived on read from user_stats, the same source as state_leaderboard.
-- 2. The milestone-claim trigger recomputes the state-only total from logs
--    on each insert. No singleton lock needed: the row lock taken by the
--    claim UPDATE on the milestone row itself guarantees a single claimer.
-- 3. Void any claim made under the old inflated count and re-arm the
--    milestone; the next state patriot's rep past the line claims it.

-- ============================================================
-- 1. Retire the old counter
-- ============================================================

drop trigger if exists track_community_total on public.pushup_logs;
drop function if exists public.track_community_total();
drop table if exists public.community_stats;

-- ============================================================
-- 2. Claim trigger under the corrected definition
-- ============================================================

create or replace function public.claim_community_milestones()
returns trigger as $$
declare
  v_total bigint;
begin
  -- Reps only count while their owner has joined a state, matching the
  -- State Battle page. A stateless patriot's log can't move the count,
  -- so it can't ring the bell either.
  if not exists (
    select 1 from public.profiles p
    where p.id = new.user_id and p.state_code is not null
  ) then
    return new;
  end if;

  -- State-only nationwide total including this row (we run AFTER insert),
  -- computed straight from logs so it doesn't depend on trigger ordering
  -- with update_user_stats.
  select coalesce(sum(l.count), 0) into v_total
  from public.pushup_logs l
  join public.profiles p on p.id = l.user_id
  where p.state_code is not null;

  -- Concurrent crossers serialize on the milestone row lock; the loser
  -- re-checks "hit_by is null" after the winner commits and backs off.
  with claimed as (
    update public.community_milestones
    set hit_by = new.user_id,
        hit_at = now(),
        total_at_hit = v_total
    where hit_by is null
      and hit_at is null
      and threshold <= v_total
    returning achievement_id
  )
  insert into public.user_achievements (user_id, achievement_id)
  select new.user_id, achievement_id
  from claimed
  where achievement_id is not null
  on conflict (user_id, achievement_id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists claim_community_milestones on public.pushup_logs;
create trigger claim_community_milestones
  after insert on public.pushup_logs
  for each row execute function public.claim_community_milestones();

-- ============================================================
-- 3. Public read: same source the State Battle page sums
-- ============================================================

create or replace function public.get_community_progress()
returns json as $$
  select json_build_object(
    'total_pushups', coalesce((
      select sum(s.total_pushups)
      from public.user_stats s
      join public.profiles p on p.id = s.user_id
      where p.state_code is not null
    ), 0),
    'milestones', coalesce((
      select json_agg(json_build_object(
        'threshold', m.threshold,
        'hit_by', m.hit_by,
        'hit_at', m.hit_at,
        'hit_by_name', p.display_name,
        'hit_by_state', p.state_code
      ) order by m.threshold)
      from public.community_milestones m
      left join public.profiles p on p.id = m.hit_by
    ), '[]'::json)
  );
$$ language sql stable security definer set search_path = public;

revoke all on function public.get_community_progress() from public;
grant execute on function public.get_community_progress() to anon, authenticated;

-- ============================================================
-- 4. Void claims made under the old count and re-arm the bell
-- ============================================================

-- Any existing claim was judged against the inflated all-logs total, so it
-- doesn't stand. Take back the badge and clear the claim; the next rep by a
-- state patriot that carries the corrected count past the line re-claims it
-- on the spot. (Fresh databases have no claims, so this is a no-op there.)

delete from public.user_achievements ua
using public.community_milestones m
where m.achievement_id = ua.achievement_id
  and m.hit_by = ua.user_id;

update public.community_milestones
set hit_by = null, hit_at = null, total_at_hit = null
where hit_by is not null or hit_at is not null;
