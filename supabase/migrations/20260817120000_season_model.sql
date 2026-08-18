-- Seasons become the source of truth.
--
-- Everything about "which July are we in" lived in two places that a second
-- client cannot read: TypeScript constants in src/lib/dates.ts (CHALLENGE_YEAR
-- 2026, CHALLENGE_TOTAL 1776, FINAL_PUSH_DATE, the bell) and hardcoded
-- timestamps sprinkled through the SQL (the freeze trigger, the July 2026
-- CHECK, four Final Push views, the 500/day cap). A native iOS client talking
-- to Supabase directly would have to reimplement every one of them in Swift,
-- and the two copies would drift the first time a date moved.
--
-- This migration moves all of it into challenge_seasons and derives the rest.
-- Opening 2027 becomes a data change, not a deploy.
--
--  1. Season config columns: goal, caps, timezone, logging window, Final Push
--     window and bell. 2026 is backfilled with exactly the constants that were
--     hardcoded, so no number about the finished season changes.
--  2. Season resolution functions (logging vs display).
--  3. pushup_logs.season_year, assigned by the database, plus a client_log_id
--     for idempotent retries from an offline queue.
--  4. The 2026 freeze trigger and the July-2026 CHECK become a season window
--     check. 2026 stays closed because its season row says closed.
--  5. The daily cap reads the season's cap instead of a literal.
--  6. user_stats becomes per-season (season_user_stats), with a user_stats
--     view over the display season so existing reads keep working.
--  7. Every public board is season-scoped, with an all-seasons variant.
--  8. RPCs: current_season(), log_pushups(), clear_pushups_for_day().
--  9. RLS/grant hardening for a client that ships the anon key in a binary.
--
-- Nothing here reopens 2026: its season row is 'closed' and its logging window
-- ended at the same instant the old freeze trigger used.

-- ============================================================
-- 1. Season configuration
-- ============================================================

alter table public.challenge_seasons
  add column if not exists goal integer not null default 1776,
  add column if not exists daily_cap integer not null default 500,
  add column if not exists per_log_cap integer not null default 1000,
  add column if not exists time_zone text not null default 'America/New_York',
  add column if not exists logging_opens_at timestamptz,
  add column if not exists logging_closes_at timestamptz,
  add column if not exists final_push_on date,
  add column if not exists final_push_opens_at timestamptz,
  add column if not exists final_push_deadline timestamptz;

comment on column public.challenge_seasons.logging_opens_at is
  'First instant a rep may be written for this season. One day of slack before the month starts, matching the old pushup_logs_july_2026 CHECK.';
comment on column public.challenge_seasons.logging_closes_at is
  'The books freeze at this instant: midnight ending the grace day in the westernmost US timezone (Hawaii, UTC-10).';
comment on column public.challenge_seasons.final_push_deadline is
  'The closing bell. Midnight ending the last day in Hawaii; the Final Push champion is decided here and the Hall of Honor opens.';

-- 2026: the numbers that were hardcoded, transcribed exactly.
--   logging window  : old pushup_logs_july_2026 CHECK lower bound, and the
--                     freeze instant from 20260727120000_close_the_books.sql
--   Final Push      : 20260730180000_final_push_closing_bell.sql
--   daily cap 500   : 20260801194149_enforce_safer_daily_cap.sql
--   per-log cap 1000: pushup_logs_count_max
update public.challenge_seasons set
  goal = 1776,
  daily_cap = 500,
  per_log_cap = 1000,
  time_zone = 'America/New_York',
  logging_opens_at = timestamptz '2026-06-30 00:00:00+00',
  logging_closes_at = timestamptz '2026-08-02 10:00:00+00',
  final_push_on = date '2026-07-31',
  final_push_opens_at = timestamptz '2026-07-31 04:00:00+00',
  final_push_deadline = timestamptz '2026-08-01 10:00:00+00'
where year = 2026;

-- 2027: the same shape, one year on. July is always EDT (UTC-4) and Hawaii is
-- always UTC-10, so the offsets are the same as 2026.
-- Status stays 'interest': no rep can be logged until an operator moves it to
-- 'registration' or 'live'. That flip is the deliberate act that opens 2027.
update public.challenge_seasons set
  goal = 1776,
  daily_cap = 500,
  per_log_cap = 1000,
  time_zone = 'America/New_York',
  logging_opens_at = timestamptz '2027-06-30 00:00:00+00',
  logging_closes_at = timestamptz '2027-08-02 10:00:00+00',
  final_push_on = date '2027-07-31',
  final_push_opens_at = timestamptz '2027-07-31 04:00:00+00',
  final_push_deadline = timestamptz '2027-08-01 10:00:00+00'
where year = 2027;

alter table public.challenge_seasons
  alter column logging_opens_at set not null,
  alter column logging_closes_at set not null,
  alter column final_push_on set not null,
  alter column final_push_opens_at set not null,
  alter column final_push_deadline set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.challenge_seasons'::regclass
      and conname = 'challenge_seasons_windows_ordered'
  ) then
    alter table public.challenge_seasons
      add constraint challenge_seasons_windows_ordered check (
        logging_closes_at > logging_opens_at
        and final_push_deadline > final_push_opens_at
        and final_push_on between starts_on and ends_on
        and goal > 0
        and daily_cap > 0
        and per_log_cap > 0
      );
  end if;
end;
$$;

-- Seasons must not overlap: season_for_log_date() has to resolve one answer.
create or replace function public.assert_seasons_disjoint()
returns trigger as $$
begin
  if exists (
    select 1
    from public.challenge_seasons a
    join public.challenge_seasons b on b.year <> a.year
    where a.logging_opens_at < b.logging_closes_at
      and b.logging_opens_at < a.logging_closes_at
  ) then
    raise exception 'Season logging windows overlap; each rep must belong to exactly one season.';
  end if;
  return null;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists assert_seasons_disjoint on public.challenge_seasons;
create constraint trigger assert_seasons_disjoint
  after insert or update on public.challenge_seasons
  deferrable initially deferred
  for each row execute function public.assert_seasons_disjoint();

-- ============================================================
-- 2. Which season is it?
-- ============================================================

-- Two different questions, two different answers, and conflating them is how
-- the offseason breaks. Today (August 2026) reps belong to 2027 once it opens,
-- but the site must still show the finished 2026 boards.

-- The season a rep written right now would belong to. Null when no season is
-- open and none is scheduled.
create or replace function public.season_for_logging()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select year from public.challenge_seasons
      where now() >= logging_opens_at and now() < logging_closes_at
      order by year limit 1),
    (select year from public.challenge_seasons
      where now() < logging_opens_at
      order by year limit 1),
    (select max(year) from public.challenge_seasons)
  );
$$;

-- The season the public boards should show: the most recent one that has
-- started. Through the offseason that stays 2026, so the Hall of Honor and the
-- records keep standing until July 1, 2027 actually arrives.
create or replace function public.season_for_display()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select max(year) from public.challenge_seasons
      where starts_on <= (now() at time zone time_zone)::date),
    (select min(year) from public.challenge_seasons)
  );
$$;

-- Which season a rep dated at this instant belongs to.
create or replace function public.season_for_log_date(p_logged_at timestamptz)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select year from public.challenge_seasons
  where p_logged_at >= logging_opens_at
    and p_logged_at < logging_closes_at
  order by year
  limit 1;
$$;

revoke all on function public.season_for_logging() from public;
revoke all on function public.season_for_display() from public;
revoke all on function public.season_for_log_date(timestamptz) from public;
grant execute on function public.season_for_logging() to anon, authenticated, service_role;
grant execute on function public.season_for_display() to anon, authenticated, service_role;
grant execute on function public.season_for_log_date(timestamptz) to anon, authenticated, service_role;

-- ============================================================
-- 3. Reps belong to a season
-- ============================================================

alter table public.pushup_logs
  add column if not exists season_year integer references public.challenge_seasons(year);

-- The 2026 freeze trigger rejects every write to this table, including this
-- backfill, and the daily-cap trigger would re-test rows written when the cap
-- was 5,000. Both are replaced below; neither should run against a column fill
-- that changes no rep.
alter table public.pushup_logs disable trigger user;

update public.pushup_logs
set season_year = coalesce(public.season_for_log_date(logged_at), 2026)
where season_year is null;

alter table public.pushup_logs enable trigger user;

alter table public.pushup_logs alter column season_year set not null;

create index if not exists idx_pushup_logs_season_user
  on public.pushup_logs (season_year, user_id);

-- The old window CHECK is replaced by the season window trigger below, which
-- reads the same bounds out of challenge_seasons.
alter table public.pushup_logs drop constraint if exists pushup_logs_july_2026;

-- Idempotency for an offline queue. supabase-swift has no offline support, so
-- the native client hand-rolls a local queue and replays it; a replayed entry
-- carries the id it was created with and lands exactly once.
alter table public.pushup_logs
  add column if not exists client_log_id uuid;

create unique index if not exists pushup_logs_client_log_id_key
  on public.pushup_logs (user_id, client_log_id)
  where client_log_id is not null;

comment on column public.pushup_logs.client_log_id is
  'Client-generated id for a queued rep. Unique per user, so replaying an offline queue cannot double-count.';

-- ============================================================
-- 4. The season window replaces the 2026 freeze
-- ============================================================

create or replace function public.enforce_season_write_window()
returns trigger as $$
declare
  v_year integer;
  v_season public.challenge_seasons%rowtype;
begin
  if tg_op = 'DELETE' then
    v_year := old.season_year;
  else
    v_year := public.season_for_log_date(new.logged_at);
    if v_year is null then
      raise exception 'That date is outside every Liberty Lift season.';
    end if;
    new.season_year := v_year;
  end if;

  select * into v_season from public.challenge_seasons where year = v_year;

  if v_season.status not in ('registration', 'live') then
    raise exception 'The books are closed — the % Liberty Lift is final. See you next year, patriot.', v_year;
  end if;

  if now() < v_season.logging_opens_at or now() >= v_season.logging_closes_at then
    raise exception 'The % Liberty Lift is not open for logging right now.', v_year;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists freeze_pushup_logs on public.pushup_logs;
drop function if exists public.reject_writes_after_freeze();

drop trigger if exists enforce_season_write_window on public.pushup_logs;
create trigger enforce_season_write_window
  before insert or update or delete on public.pushup_logs
  for each row execute function public.enforce_season_write_window();

-- ============================================================
-- 5. The daily cap is a season setting
-- ============================================================

create or replace function public.enforce_daily_pushup_cap()
returns trigger as $$
declare
  daily_total integer;
  log_day date := date(new.logged_at);
  v_daily_cap integer;
  v_per_log_cap integer;
begin
  select s.daily_cap, s.per_log_cap
  into v_daily_cap, v_per_log_cap
  from public.challenge_seasons s
  where s.year = public.season_for_log_date(new.logged_at);

  -- No season owns this date; the window trigger rejects it a moment later.
  if v_daily_cap is null then
    return new;
  end if;

  if new.count > v_per_log_cap then
    raise exception 'Single-entry limit: max % push-ups in one entry.', v_per_log_cap;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(new.user_id::text || ':' || log_day::text, 0)
  );

  select coalesce(sum(count), 0) into daily_total
  from public.pushup_logs
  where user_id = new.user_id
    and date(logged_at) = log_day
    and id is distinct from new.id;

  if daily_total + new.count > v_daily_cap then
    raise exception 'Daily limit reached: max % push-ups per day.', v_daily_cap;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================
-- 6. Stats are per-season
-- ============================================================
--
-- user_stats held one lifetime row per person: total_pushups was every rep
-- ever logged. That is the right number for exactly one season and wrong for
-- every season after it — on July 1, 2027 a 2026 finisher would start the new
-- challenge already past 1,776.
--
-- The table becomes season_user_stats, keyed (user_id, season_year), and
-- user_stats comes back as a view over the display season so the twelve places
-- in the app that read it keep working and start meaning "this season".
-- The view is a LEFT JOIN from profiles, so every profile always has a row
-- (zeroed) — the dashboard's insert-a-missing-row path is no longer needed.

alter table if exists public.user_stats rename to season_user_stats;

alter table public.season_user_stats
  add column if not exists season_year integer;

update public.season_user_stats set season_year = 2026 where season_year is null;

alter table public.season_user_stats alter column season_year set not null;

do $$
declare
  v_pkey text;
begin
  select conname into v_pkey
  from pg_constraint
  where conrelid = 'public.season_user_stats'::regclass and contype = 'p';

  if v_pkey is not null and v_pkey <> 'season_user_stats_pkey' then
    execute format('alter table public.season_user_stats drop constraint %I', v_pkey);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.season_user_stats'::regclass and contype = 'p'
  ) then
    alter table public.season_user_stats
      add constraint season_user_stats_pkey primary key (user_id, season_year);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.season_user_stats'::regclass
      and conname = 'season_user_stats_season_year_fkey'
  ) then
    alter table public.season_user_stats
      add constraint season_user_stats_season_year_fkey
      foreign key (season_year) references public.challenge_seasons(year);
  end if;
end;
$$;

comment on table public.season_user_stats is
  'Materialized per-person, per-season totals. Derived from pushup_logs by trigger; clients read, never write.';

-- The badge trigger hung off the old table and fired on every stats update.
-- Achievements are reconciled explicitly by refresh_season_stats() now, so a
-- new season cannot revoke a badge won in an old one.
drop trigger if exists award_achievements on public.season_user_stats;

-- ---------- season-scoped recomputation ----------

-- Streak runs within one season. A July challenge cannot have a streak that
-- spans years, and mixing seasons would join last July's last day to this
-- July's first.
create or replace function public.compute_streaks(
  p_user_id uuid,
  p_season_year integer,
  out current_streak integer,
  out longest_streak integer
) as $$
  with days as (
    select distinct date(logged_at) as day
    from public.pushup_logs
    where user_id = p_user_id
      and season_year = p_season_year
  ),
  runs as (
    select count(*) as len, max(day) as last_day
    from (
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

-- Kept for callers that predate seasons; answers for the display season.
create or replace function public.compute_streaks(
  p_user_id uuid,
  out current_streak integer,
  out longest_streak integer
) as $$
  select cs.current_streak, cs.longest_streak
  from public.compute_streaks(p_user_id, public.season_for_display()) cs;
$$ language sql stable security definer set search_path = public;

create or replace function public.achievement_earned_at(
  p_user_id uuid,
  p_requirement_type text,
  p_threshold integer,
  p_season_year integer
) returns timestamptz as $$
  select case p_requirement_type
    when 'total' then (
      select logged_at
      from (
        select logged_at, created_at,
               sum(count) over (order by logged_at, created_at, id) as running_total
        from public.pushup_logs
        where user_id = p_user_id and season_year = p_season_year
      ) logs
      where running_total >= p_threshold
      order by logged_at, created_at
      limit 1
    )
    when 'daily' then (
      select min(logged_at)
      from public.pushup_logs
      where user_id = p_user_id
        and season_year = p_season_year
        and date(logged_at) = (
          select date(logged_at)
          from public.pushup_logs
          where user_id = p_user_id and season_year = p_season_year
          group by date(logged_at)
          having sum(count) >= p_threshold
          order by date(logged_at)
          limit 1
        )
    )
    when 'streak' then (
      with days as (
        select date(logged_at) as day, min(logged_at) as day_start
        from public.pushup_logs
        where user_id = p_user_id and season_year = p_season_year
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

-- Badges are durable and lifetime, earned by your best season.
--
-- The old trigger reconciled against one stats row. Per season that would be
-- destructive: on July 1, 2027 every 2026 badge would be revoked because the
-- new season's totals start at zero. Reconciling against the best season a
-- person has ever had keeps 2026's badges standing and still lets 2027 earn
-- new ones. Deleting the logs that won a badge still revokes it, which is the
-- behaviour 20260717130000_revoke_unearned_badges.sql shipped.
create or replace function public.reconcile_achievements(p_user_id uuid)
returns void as $$
declare
  v_total integer;
  v_longest integer;
  v_best_day integer;
begin
  select coalesce(max(total_pushups), 0),
         coalesce(max(longest_streak), 0),
         coalesce(max(best_day), 0)
  into v_total, v_longest, v_best_day
  from public.season_user_stats
  where user_id = p_user_id;

  insert into public.user_achievements (user_id, achievement_id, earned_at)
  select p_user_id, a.id,
         coalesce(
           (select min(e.earned)
            from public.season_user_stats s
            cross join lateral public.achievement_earned_at(
              p_user_id, a.requirement_type, a.threshold, s.season_year
            ) as e(earned)
            where s.user_id = p_user_id),
           now())
  from public.achievements a
  where a.threshold is not null
    and (
      (a.requirement_type = 'total'  and v_total    >= a.threshold) or
      (a.requirement_type = 'streak' and v_longest  >= a.threshold) or
      (a.requirement_type = 'daily'  and v_best_day >= a.threshold)
    )
  on conflict (user_id, achievement_id) do nothing;

  delete from public.user_achievements ua
  using public.achievements a
  where ua.user_id = p_user_id
    and ua.achievement_id = a.id
    and a.threshold is not null
    and not (
      (a.requirement_type = 'total'  and v_total    >= a.threshold) or
      (a.requirement_type = 'streak' and v_longest  >= a.threshold) or
      (a.requirement_type = 'daily'  and v_best_day >= a.threshold)
    );
end;
$$ language plpgsql security definer set search_path = public;

-- One writer for season_user_stats. Insert and delete paths both land here,
-- so the two can never compute totals differently again.
create or replace function public.refresh_season_stats(p_user_id uuid, p_season_year integer)
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
    where user_id = p_user_id and season_year = p_season_year
    group by date(logged_at)
  ) daily;

  select date(max(logged_at)) into v_last_date
  from public.pushup_logs
  where user_id = p_user_id and season_year = p_season_year;

  select cs.current_streak, cs.longest_streak
  into v_current_streak, v_longest_streak
  from public.compute_streaks(p_user_id, p_season_year) cs;

  insert into public.season_user_stats (
    user_id, season_year, total_pushups, current_streak, longest_streak,
    best_day, days_logged, last_log_date, updated_at
  )
  values (
    p_user_id, p_season_year, v_total, v_current_streak, v_longest_streak,
    v_best_day, v_days_logged, v_last_date, now()
  )
  on conflict (user_id, season_year) do update set
    total_pushups = excluded.total_pushups,
    current_streak = excluded.current_streak,
    longest_streak = excluded.longest_streak,
    best_day = excluded.best_day,
    days_logged = excluded.days_logged,
    last_log_date = excluded.last_log_date,
    updated_at = excluded.updated_at;

  perform public.reconcile_achievements(p_user_id);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.update_user_stats()
returns trigger as $$
begin
  perform public.refresh_season_stats(new.user_id, new.season_year);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.on_pushup_delete()
returns trigger as $$
begin
  perform public.refresh_season_stats(old.user_id, old.season_year);
  return old;
end;
$$ language plpgsql security definer set search_path = public;

-- Kept for callers that predate seasons: recompute every season the user has.
create or replace function public.recalculate_user_stats(p_user_id uuid)
returns void as $$
declare
  v_year integer;
begin
  for v_year in
    select year from public.challenge_seasons
    union
    select season_year from public.season_user_stats where user_id = p_user_id
  loop
    if exists (
      select 1 from public.pushup_logs where user_id = p_user_id and season_year = v_year
    ) or exists (
      select 1 from public.season_user_stats where user_id = p_user_id and season_year = v_year
    ) then
      perform public.refresh_season_stats(p_user_id, v_year);
    end if;
  end loop;
end;
$$ language plpgsql security definer set search_path = public;

-- Signup seeds a stats row for the season a new patriot is enlisting in, so
-- the dashboard never has to create one. Existing behaviour, season-aware.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, state_code)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    case
      when upper(nullif(new.raw_user_meta_data ->> 'state_code', '')) in (
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
        'DC'
      )
      then upper(new.raw_user_meta_data ->> 'state_code')::char(2)
      else null
    end
  );

  insert into public.season_user_stats (user_id, season_year)
  values (new.id, coalesce(public.season_for_logging(), public.season_for_display()))
  on conflict (user_id, season_year) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public, auth;

-- ============================================================
-- 7. Season-scoped boards
-- ============================================================
--
-- Each board comes in two shapes: a season_* view carrying season_year for
-- clients that want to pick a year (the native app's records screen, a future
-- crew-vs-crew board), and the original name filtered to the display season so
-- every existing caller keeps working and silently becomes season-correct.

-- user_stats: the display season, one row per profile, zeroed before the first
-- rep. Definer, like every other public board: profiles is own-row only under
-- RLS, and this exposes no email.
create or replace view public.user_stats
with (security_invoker = false)
as
select
  p.id as user_id,
  coalesce(s.total_pushups, 0) as total_pushups,
  coalesce(s.current_streak, 0) as current_streak,
  coalesce(s.longest_streak, 0) as longest_streak,
  coalesce(s.best_day, 0) as best_day,
  coalesce(s.days_logged, 0) as days_logged,
  s.last_log_date,
  coalesce(s.updated_at, p.created_at) as updated_at,
  public.season_for_display() as season_year
from public.profiles p
left join public.season_user_stats s
  on s.user_id = p.id
 and s.season_year = public.season_for_display();

grant select on public.user_stats to anon, authenticated;

create or replace view public.season_leaderboard
with (security_invoker = false)
as
select
  s.season_year,
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
  rank() over (partition by s.season_year order by s.total_pushups desc) as global_rank,
  (select count(*) from public.profiles r where r.referred_by = p.id) as recruits,
  p.created_at
from public.profiles p
join public.season_user_stats s on p.id = s.user_id
where s.total_pushups > 0;

grant select on public.season_leaderboard to anon, authenticated;

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
join public.season_user_stats s
  on p.id = s.user_id
 and s.season_year = public.season_for_display()
where s.total_pushups > 0
order by s.total_pushups desc;

create or replace view public.season_state_leaderboard
with (security_invoker = false)
as
select
  s.season_year,
  p.state_code,
  count(*) as participants,
  sum(s.total_pushups) as total_pushups,
  avg(s.total_pushups)::integer as avg_pushups,
  rank() over (partition by s.season_year order by sum(s.total_pushups) desc) as state_rank
from public.profiles p
join public.season_user_stats s on p.id = s.user_id
where p.state_code is not null and s.total_pushups > 0
group by s.season_year, p.state_code;

grant select on public.season_state_leaderboard to anon, authenticated;

create or replace view public.state_leaderboard
with (security_invoker = false)
as
select
  state_code,
  count(*) as participants,
  sum(total_pushups) as total_pushups,
  avg(total_pushups)::integer as avg_pushups,
  rank() over (order by sum(total_pushups) desc) as state_rank
from public.profiles p
join public.season_user_stats s
  on p.id = s.user_id
 and s.season_year = public.season_for_display()
where p.state_code is not null and s.total_pushups > 0
group by state_code
order by total_pushups desc;

-- Daily aggregate, now carrying the season so a client can ask for one July.
create or replace view public.public_user_daily_pushups
with (security_invoker = false)
as
select
  user_id,
  (logged_at at time zone 'America/New_York')::date as log_date,
  sum(count)::integer as daily_pushups,
  season_year
from public.pushup_logs
group by user_id, (logged_at at time zone 'America/New_York')::date, season_year;

revoke all on table public.public_user_daily_pushups from public;
grant select on table public.public_user_daily_pushups to anon, authenticated;

-- The pledge board pays out against this season's goal, not a literal 1776.
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
  coalesce(stats.total_pushups, 0) as total_pushups,
  case
    when pledges.pledge_type = 'per_completed'
      then (coalesce(stats.total_pushups, 0) * pledges.rate_cents / 100.0)
    else (greatest(0, season.goal - coalesce(stats.total_pushups, 0)) * pledges.rate_cents / 100.0)
  end as pledged_amount
from public.pledges
join public.profiles on profiles.id = pledges.user_id
cross join lateral (
  select * from public.challenge_seasons where year = public.season_for_display()
) season
left join public.season_user_stats stats
  on stats.user_id = pledges.user_id
 and stats.season_year = season.year;

-- ---------- the Final Push, keyed to the season ----------
--
-- The four war-room views had the July 2026 window and the closing bell
-- written into them as constants. They now read the display season's
-- final_push_opens_at / final_push_deadline. The bounds are still plain
-- timestamps compared against a bare column, so the index still applies.

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
join public.challenge_seasons s on s.year = l.season_year
where l.season_year = public.season_for_display()
  and l.logged_at >= s.final_push_opens_at
  and l.logged_at < s.final_push_opens_at + interval '24 hours'
  and l.created_at < s.final_push_deadline
group by p.id, p.display_name, p.state_code
order by final_day_pushups desc;

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
join public.challenge_seasons s on s.year = l.season_year
where l.season_year = public.season_for_display()
  and l.logged_at >= s.final_push_opens_at
  and l.logged_at < s.final_push_opens_at + interval '24 hours'
  and l.created_at < s.final_push_deadline;

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
join public.challenge_seasons s on s.year = l.season_year
where p.state_code is not null
  and l.season_year = public.season_for_display()
  and l.logged_at >= s.final_push_opens_at
  and l.logged_at < s.final_push_opens_at + interval '24 hours'
  and l.created_at < s.final_push_deadline
group by p.state_code
order by total_pushups desc;

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
join public.challenge_seasons s on s.year = l.season_year
where l.season_year = public.season_for_display()
  and l.logged_at >= s.final_push_opens_at
  and l.logged_at < s.final_push_opens_at + interval '24 hours'
  and l.created_at < s.final_push_deadline
order by l.created_at desc;

-- The nationwide counter is per season too, or 2027 would open with 2026's
-- reps already on the board and every milestone already rung.
alter table public.community_milestones
  add column if not exists season_year integer references public.challenge_seasons(year);

update public.community_milestones set season_year = 2026 where season_year is null;
alter table public.community_milestones alter column season_year set not null;

create or replace function public.claim_community_milestones()
returns trigger as $$
declare
  v_total bigint;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = new.user_id and p.state_code is not null
  ) then
    return new;
  end if;

  select coalesce(sum(l.count), 0) into v_total
  from public.pushup_logs l
  join public.profiles p on p.id = l.user_id
  where p.state_code is not null
    and l.season_year = new.season_year;

  with claimed as (
    update public.community_milestones
    set hit_by = new.user_id,
        hit_at = now(),
        total_at_hit = v_total
    where hit_by is null
      and hit_at is null
      and season_year = new.season_year
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

create or replace function public.get_community_progress()
returns json as $$
  select json_build_object(
    'season_year', public.season_for_display(),
    'total_pushups', coalesce((
      select sum(s.total_pushups)
      from public.season_user_stats s
      join public.profiles p on p.id = s.user_id
      where p.state_code is not null
        and s.season_year = public.season_for_display()
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
      where m.season_year = public.season_for_display()
    ), '[]'::json)
  );
$$ language sql stable security definer set search_path = public;

revoke all on function public.get_community_progress() from public;
grant execute on function public.get_community_progress() to anon, authenticated;

-- ============================================================
-- 8. RPCs both clients call
-- ============================================================
--
-- The web app and the native client must not each carry their own copy of the
-- rules. These three RPCs are the write path and the config read; a Swift
-- client needs no pace maths, no cap, no season dates of its own.

create or replace function public.current_season()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'logging_year', public.season_for_logging(),
    'display_year', public.season_for_display(),
    'now', now(),
    'logging', (
      select to_jsonb(s) from public.challenge_seasons s
      where s.year = public.season_for_logging()
    ),
    'display', (
      select to_jsonb(s) from public.challenge_seasons s
      where s.year = public.season_for_display()
    ),
    'logging_open', exists (
      select 1 from public.challenge_seasons s
      where s.year = public.season_for_logging()
        and s.status in ('registration', 'live')
        and now() >= s.logging_opens_at
        and now() < s.logging_closes_at
    )
  );
$$;

revoke all on function public.current_season() from public;
grant execute on function public.current_season() to anon, authenticated, service_role;

-- The one write path for reps.
--
-- p_client_log_id makes a replay safe: an offline queue that cannot tell
-- whether its request landed can send the same id again and get the same log
-- back instead of a second one.
create or replace function public.log_pushups(
  p_count integer,
  p_logged_on date default null,
  p_notes text default null,
  p_client_log_id uuid default null
) returns json as $$
declare
  v_user uuid := (select auth.uid());
  v_season public.challenge_seasons%rowtype;
  v_day date;
  v_logged_at timestamptz;
  v_id uuid;
  v_created boolean := false;
  v_day_total integer;
  v_season_total integer;
begin
  if v_user is null then
    raise exception 'Sign in to log push-ups.' using errcode = '28000';
  end if;

  if p_count is null or p_count <= 0 then
    raise exception 'Log at least one rep.';
  end if;

  select * into v_season
  from public.challenge_seasons
  where year = public.season_for_logging();

  if v_season.year is null then
    raise exception 'No Liberty Lift season is scheduled.';
  end if;

  if v_season.status not in ('registration', 'live')
     or now() < v_season.logging_opens_at
     or now() >= v_season.logging_closes_at then
    raise exception 'The % Liberty Lift is not open for logging right now.', v_season.year;
  end if;

  v_day := coalesce(p_logged_on, (now() at time zone v_season.time_zone)::date);

  if v_day < v_season.starts_on or v_day > v_season.ends_on then
    raise exception '% is outside the % challenge (% to %).',
      v_day, v_season.year, v_season.starts_on, v_season.ends_on;
  end if;

  if p_client_log_id is not null then
    select id into v_id
    from public.pushup_logs
    where user_id = v_user and client_log_id = p_client_log_id;
  end if;

  if v_id is null then
    -- Noon in the season's timezone, the same convention the web dashboard
    -- has always used: far enough from either midnight that no US timezone
    -- can push the rep onto the wrong calendar day.
    v_logged_at := (v_day + time '12:00') at time zone v_season.time_zone;

    insert into public.pushup_logs (user_id, count, logged_at, notes, client_log_id)
    values (v_user, p_count, v_logged_at, nullif(btrim(coalesce(p_notes, '')), ''), p_client_log_id)
    returning id into v_id;

    v_created := true;
  end if;

  select coalesce(sum(count), 0) into v_day_total
  from public.pushup_logs
  where user_id = v_user and date(logged_at) = v_day;

  select coalesce(total_pushups, 0) into v_season_total
  from public.season_user_stats
  where user_id = v_user and season_year = v_season.year;

  return json_build_object(
    'log_id', v_id,
    'created', v_created,
    'season_year', v_season.year,
    'logged_on', v_day,
    'day_total', v_day_total,
    'season_total', coalesce(v_season_total, 0),
    'goal', v_season.goal,
    'daily_cap', v_season.daily_cap
  );
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.log_pushups(integer, date, text, uuid) from public;
grant execute on function public.log_pushups(integer, date, text, uuid) to authenticated;

-- Clearing a day is the delete the dashboard offers. Same rules, server side.
create or replace function public.clear_pushups_for_day(p_day date)
returns json as $$
declare
  v_user uuid := (select auth.uid());
  v_deleted integer;
begin
  if v_user is null then
    raise exception 'Sign in to edit your log.' using errcode = '28000';
  end if;

  delete from public.pushup_logs
  where user_id = v_user and date(logged_at) = p_day;

  get diagnostics v_deleted = row_count;

  return json_build_object('cleared', p_day, 'deleted', v_deleted);
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.clear_pushups_for_day(date) from public;
grant execute on function public.clear_pushups_for_day(date) to authenticated;

-- ============================================================
-- 9. RLS with the anon key in a shipped binary
-- ============================================================
--
-- The web app is the only client today, so a few objects are safe mainly
-- because nothing asks them the wrong question. An iOS binary carries the anon
-- key in the bundle where anyone can extract it, so every table has to hold on
-- its own policies. No service-role key goes anywhere near a client.

-- Reps: owner-only in both directions, and anon holds no write grant at all.
revoke insert, update, delete on table public.pushup_logs from anon;
grant select, insert, update, delete on table public.pushup_logs to authenticated;

drop policy if exists "Users can insert own logs" on public.pushup_logs;
create policy "Users can insert own logs"
on public.pushup_logs for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own logs" on public.pushup_logs;
create policy "Users can update own logs"
on public.pushup_logs for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own logs" on public.pushup_logs;
create policy "Users can delete own logs"
on public.pushup_logs for delete to authenticated
using ((select auth.uid()) = user_id);

-- Profiles: the update policy had no WITH CHECK, so the row a user wrote back
-- was never re-tested. Same rule, both directions.
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);

-- Season stats are derived. Read-only for everyone but the triggers.
revoke insert, update, delete on table public.season_user_stats from anon, authenticated;
grant select on table public.season_user_stats to anon, authenticated;

-- Season config is public to read and closed to write: a client must not be
-- able to reopen a finished July by editing its own row.
revoke insert, update, delete on table public.challenge_seasons from anon, authenticated;

-- Crews belong to a season, and their end date is the season's end date.
-- It used to be a literal '2026-07-31' sent by the browser.
alter table public.contests
  add column if not exists season_year integer references public.challenge_seasons(year);

update public.contests set season_year = 2026 where season_year is null;

create or replace function public.enforce_contest_season()
returns trigger as $$
declare
  v_season public.challenge_seasons%rowtype;
begin
  if new.season_year is null then
    new.season_year := public.season_for_logging();
  end if;

  select * into v_season from public.challenge_seasons where year = new.season_year;

  if v_season.year is null then
    raise exception 'A crew must belong to a challenge season.';
  end if;

  -- A crew always runs to the end of its challenge; the client no longer
  -- decides this.
  new.end_date := v_season.ends_on;

  if new.start_date is null or new.start_date > v_season.ends_on then
    new.start_date := v_season.starts_on;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists enforce_contest_season on public.contests;
create trigger enforce_contest_season
  before insert or update on public.contests
  for each row execute function public.enforce_contest_season();

alter table public.contests alter column season_year set not null;

-- The old badge trigger function is unreferenced now that
-- refresh_season_stats() reconciles explicitly.
drop function if exists public.award_achievements();

-- ============================================================
-- 10. Backfill
-- ============================================================

-- Recompute 2026 from the logs under the new season-scoped functions. The
-- numbers must come out identical — every 2026 log is season 2026 — so this is
-- a proof, not a correction.
do $$
declare
  v_user uuid;
begin
  for v_user in select distinct user_id from public.pushup_logs where season_year = 2026 loop
    perform public.refresh_season_stats(v_user, 2026);
  end loop;
end;
$$;
