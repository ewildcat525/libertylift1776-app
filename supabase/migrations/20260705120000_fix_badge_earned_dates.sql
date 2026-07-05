-- Fix badge earned dates and streak date logic.
--
-- 1) The 20260704130000 migration backfilled user_achievements with the
--    column default earned_at = now(), so every badge earned before July 4
--    reads "Earned Jul 4" — the migration timestamp, not the day of the rep
--    that won it. The award trigger had the same flaw going forward: a badge
--    unlocked by a backdated log was stamped with the insert time. earned_at
--    is now derived from pushup_logs — the log that actually crossed the
--    threshold. Logs carry logged_at at local noon of their calendar day
--    (see dashboard logPushups), so the stamp renders as the right day in
--    every US timezone.
--
-- 2) update_user_stats() incremented current_streak on every same-day log
--    (three logs today = "streak 3") and missed backdated logs that filled a
--    gap. Streaks are now recomputed from the distinct calendar days actually
--    logged. The "streak still alive" check anchors to US Eastern, matching
--    the app's easternNow() convention, instead of the UTC server clock.
--
-- 3) Declaration Signer used a UTC midnight cutoff, so a stateside signup on
--    the evening of June 30 was already "July" in UTC and missed the badge.
--    The cutoff is now midnight Eastern, and earned_at is the signup moment
--    rather than the backfill date.

-- True streaks from log history: lengths of consecutive-day runs over the
-- distinct days logged. current_streak is the run still alive today
-- (Eastern) — yesterday keeps it alive since today may not be logged yet.
create or replace function public.compute_streaks(
  p_user_id uuid,
  out current_streak integer,
  out longest_streak integer
) as $$
  with days as (
    select distinct date(logged_at) as day
    from public.pushup_logs
    where user_id = p_user_id
  ),
  runs as (
    select count(*) as len, max(day) as last_day
    from (
      -- Consecutive days share a (day - row_number) anchor.
      select day, day - (row_number() over (order by day))::int as run_anchor
      from days
    ) grouped
    group by run_anchor
  )
  select
    coalesce(max(len) filter (
      where last_day >= (now() at time zone 'America/New_York')::date - 1
    ), 0)::int,
    coalesce(max(len), 0)::int
  from runs;
$$ language sql stable security definer set search_path = public;

-- When a user actually earned a badge, from the logs themselves.
-- Returns null when the logs no longer support the badge (grant-only:
-- callers keep the existing timestamp in that case).
create or replace function public.achievement_earned_at(
  p_user_id uuid,
  p_requirement_type text,
  p_threshold integer
) returns timestamptz as $$
  select case p_requirement_type
    -- The log that pushed the running total over the threshold.
    when 'total' then (
      select logged_at
      from (
        select logged_at, created_at,
               sum(count) over (order by logged_at, created_at, id) as running_total
        from public.pushup_logs
        where user_id = p_user_id
      ) logs
      where running_total >= p_threshold
      order by logged_at, created_at
      limit 1
    )
    -- The first day whose total reached the threshold.
    when 'daily' then (
      select min(logged_at)
      from public.pushup_logs
      where user_id = p_user_id
        and date(logged_at) = (
          select date(logged_at)
          from public.pushup_logs
          where user_id = p_user_id
          group by date(logged_at)
          having sum(count) >= p_threshold
          order by date(logged_at)
          limit 1
        )
    )
    -- The day a consecutive-day run first reached the threshold length.
    when 'streak' then (
      with days as (
        select date(logged_at) as day, min(logged_at) as day_start
        from public.pushup_logs
        where user_id = p_user_id
        group by date(logged_at)
      ),
      positioned as (
        select day, day_start,
               row_number() over (partition by run_anchor order by day) as day_number
        from (
          select day, day_start, day - (row_number() over (order by day))::int as run_anchor
          from days
        ) grouped
      )
      select day_start
      from positioned
      where day_number = p_threshold
      order by day
      limit 1
    )
  end;
$$ language sql stable security definer set search_path = public;

-- Stamp new badges with the day they were earned, not the insert time.
create or replace function public.award_achievements()
returns trigger as $$
begin
  insert into public.user_achievements (user_id, achievement_id, earned_at)
  select new.user_id, a.id,
         coalesce(public.achievement_earned_at(new.user_id, a.requirement_type, a.threshold), now())
  from public.achievements a
  where a.threshold is not null
    and (
      (a.requirement_type = 'total'  and new.total_pushups  >= a.threshold) or
      (a.requirement_type = 'streak' and new.longest_streak >= a.threshold) or
      (a.requirement_type = 'daily'  and new.best_day       >= a.threshold)
    )
  on conflict (user_id, achievement_id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Recompute streaks from log history on every log insert.
create or replace function public.update_user_stats()
returns trigger as $$
declare
  v_total integer;
  v_best_day integer;
  v_days_logged integer;
  v_last_date date;
  v_current_streak integer;
  v_longest_streak integer;
begin
  select coalesce(sum(daily_total), 0), coalesce(max(daily_total), 0), count(*)
  into v_total, v_best_day, v_days_logged
  from (
    select sum(count) as daily_total
    from public.pushup_logs
    where user_id = new.user_id
    group by date(logged_at)
  ) daily;

  select date(max(logged_at)) into v_last_date
  from public.pushup_logs
  where user_id = new.user_id;

  select cs.current_streak, cs.longest_streak
  into v_current_streak, v_longest_streak
  from public.compute_streaks(new.user_id) cs;

  insert into public.user_stats (user_id, total_pushups, current_streak, longest_streak, best_day, days_logged, last_log_date, updated_at)
  values (new.user_id, v_total, v_current_streak, v_longest_streak, v_best_day, v_days_logged, v_last_date, now())
  on conflict (user_id) do update set
    total_pushups = excluded.total_pushups,
    current_streak = excluded.current_streak,
    longest_streak = excluded.longest_streak,
    best_day = excluded.best_day,
    days_logged = excluded.days_logged,
    last_log_date = excluded.last_log_date,
    updated_at = excluded.updated_at;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- The delete path now recomputes streaks too; it used to leave them stale.
create or replace function public.recalculate_user_stats(p_user_id uuid)
returns void as $$
declare
  v_total integer;
  v_best_day integer;
  v_days_logged integer;
  v_last_date date;
  v_current_streak integer;
  v_longest_streak integer;
begin
  select coalesce(sum(daily_total), 0), coalesce(max(daily_total), 0), count(*)
  into v_total, v_best_day, v_days_logged
  from (
    select sum(count) as daily_total
    from public.pushup_logs
    where user_id = p_user_id
    group by date(logged_at)
  ) daily;

  select date(max(logged_at)) into v_last_date
  from public.pushup_logs
  where user_id = p_user_id;

  select cs.current_streak, cs.longest_streak
  into v_current_streak, v_longest_streak
  from public.compute_streaks(p_user_id) cs;

  update public.user_stats set
    total_pushups = v_total,
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    best_day = v_best_day,
    days_logged = v_days_logged,
    last_log_date = v_last_date,
    updated_at = now()
  where user_id = p_user_id;
end;
$$ language plpgsql security definer set search_path = public;

-- Backfill: recompute every user's streaks. This also corrects rows inflated
-- by the same-day double count before any earned_at math depends on them.
update public.user_stats s
set current_streak = t.cur,
    longest_streak = t.lng,
    updated_at = now()
from (
  select u.user_id, cs.current_streak as cur, cs.longest_streak as lng
  from public.user_stats u
  cross join lateral public.compute_streaks(u.user_id) cs
) t
where t.user_id = s.user_id
  and (s.current_streak is distinct from t.cur or s.longest_streak is distinct from t.lng);

-- Backfill: restamp threshold badges with the true earned time. Badges whose
-- logs were since deleted keep their old stamp (grant-only contract).
update public.user_achievements ua
set earned_at = corrected.true_earned_at
from (
  select ua2.id, public.achievement_earned_at(ua2.user_id, a.requirement_type, a.threshold) as true_earned_at
  from public.user_achievements ua2
  join public.achievements a on a.id = ua2.achievement_id
  where a.threshold is not null
) corrected
where corrected.id = ua.id
  and corrected.true_earned_at is not null
  and corrected.true_earned_at <> ua.earned_at;

-- Backfill: Declaration Signer for signups the UTC cutoff missed
-- (June 30 evening Eastern), stamped with the signup moment.
insert into public.user_achievements (user_id, achievement_id, earned_at)
select p.id, 'declaration_signer', p.created_at
from public.profiles p
where p.created_at < timestamptz '2026-07-01 00:00:00 America/New_York'
on conflict (user_id, achievement_id) do nothing;

update public.user_achievements ua
set earned_at = p.created_at
from public.profiles p
where p.id = ua.user_id
  and ua.achievement_id = 'declaration_signer'
  and ua.earned_at <> p.created_at;
