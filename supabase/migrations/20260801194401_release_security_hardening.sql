-- App Store release hardening.
--
-- 1. Materialized stats and earned badges are derived by database triggers;
--    clients may read them but may no longer forge them directly.
-- 2. Raw push-up logs are private to their owner. Public profile and contest
--    charts use a narrow daily aggregate instead of log IDs, notes, and exact
--    timestamps.
-- 3. Community chat is fail-closed until an operator explicitly enables its
--    database flag. The frontend has a separate fail-closed environment gate.

-- ============================================================
-- 1. Derived data is database-managed
-- ============================================================

drop policy if exists "Users can update own stats" on public.user_stats;
drop policy if exists "Users can insert own stats" on public.user_stats;

revoke insert, update, delete on table public.user_stats from anon, authenticated;
grant select on table public.user_stats to anon, authenticated;

drop policy if exists "System can grant achievements" on public.user_achievements;

revoke insert, update, delete on table public.user_achievements from anon, authenticated;
grant select on table public.user_achievements to anon, authenticated;

-- ============================================================
-- 2. Publish daily totals, not raw activity records
-- ============================================================

drop policy if exists "Users can view all logs" on public.pushup_logs;
drop policy if exists "Users can view own logs" on public.pushup_logs;

create policy "Users can view own logs"
on public.pushup_logs
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke select on table public.pushup_logs from anon;
grant select on table public.pushup_logs to authenticated;

-- This is intentionally a definer view: its purpose is to expose one safe,
-- public aggregate while the underlying rows remain owner-only. It contains
-- no log IDs, notes, exact timestamps, email addresses, or other profile data.
create or replace view public.public_user_daily_pushups
with (security_invoker = false)
as
select
  user_id,
  (logged_at at time zone 'America/New_York')::date as log_date,
  sum(count)::integer as daily_pushups
from public.pushup_logs
group by user_id, (logged_at at time zone 'America/New_York')::date;

revoke all on table public.public_user_daily_pushups from public;
grant select on table public.public_user_daily_pushups to anon, authenticated;

-- Realtime authorizes changes against pushup_logs RLS, so subscribers now see
-- only their own rows. Public scoreboards continue to poll the aggregate views.

-- ============================================================
-- 3. Community UGC is explicitly opt-in
-- ============================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.release_features (
  feature_key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

revoke all on table private.release_features from public, anon, authenticated;

insert into private.release_features (feature_key, enabled)
values ('community_chat', false), ('public_contests', false)
on conflict (feature_key) do nothing;

create or replace function public.can_use_chat()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select enabled
     from private.release_features
     where feature_key = 'community_chat'),
    false
  );
$$;

revoke all on function public.can_use_chat() from public, anon;
grant execute on function public.can_use_chat() to authenticated, service_role;

create or replace function public.can_use_public_contests()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select enabled
     from private.release_features
     where feature_key = 'public_contests'),
    false
  );
$$;

revoke all on function public.can_use_public_contests() from public;
grant execute on function public.can_use_public_contests() to anon, authenticated, service_role;

drop policy if exists "Contests viewable by public, creator, or members" on public.contests;
create policy "Contests viewable by enabled public feed, creator, or members"
on public.contests for select
to anon, authenticated
using (
  (is_public = true and (select public.can_use_public_contests()))
  or creator_id = (select auth.uid())
  or exists (
    select 1 from public.contest_participants
    where contest_participants.contest_id = contests.id
      and contest_participants.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can create contests" on public.contests;
create policy "Users can create gated contests"
on public.contests for insert
to authenticated
with check (
  (select auth.uid()) = creator_id
  and (is_public = false or (select public.can_use_public_contests()))
);

-- Enable only after moderation and App Store readiness have been reviewed:
-- update private.release_features
-- set enabled = true, updated_at = now()
-- where feature_key = 'community_chat';
--
-- update private.release_features set enabled = true, updated_at = now()
-- where feature_key = 'public_contests';
