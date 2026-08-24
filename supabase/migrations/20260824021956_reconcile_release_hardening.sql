-- Reconcile the portions of 20260801194401_release_security_hardening that
-- were applied incompletely before the migration history was normalized.
--
-- The season migration renamed the writable stats table and intentionally
-- restored user_stats as a compatibility view, so harden both the real table
-- and the view. Chat remains enabled by 20260805184659; this migration only
-- restores the independent public-contest release gate.

begin;

-- Derived stats and badges are maintained by database triggers/RPCs. A client
-- may read them, but must never be able to forge either one directly.
revoke insert, update, delete on table public.season_user_stats from anon, authenticated;
grant select on table public.season_user_stats to anon, authenticated;

revoke insert, update, delete on table public.user_stats from anon, authenticated;
grant select on table public.user_stats to anon, authenticated;

revoke insert, update, delete on table public.user_achievements from anon, authenticated;
grant select on table public.user_achievements to anon, authenticated;

-- Keep the safe daily aggregate readable while raw log writes remain RPC-only.
revoke all on table public.public_user_daily_pushups from public;
grant select on table public.public_user_daily_pushups to anon, authenticated;

-- Public contests remain fail-closed until moderation and release readiness
-- are explicitly approved. The flag lives outside the exposed public schema.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.release_features (
  feature_key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

revoke all on table private.release_features from public, anon, authenticated;

insert into private.release_features (feature_key, enabled)
values ('public_contests', false)
on conflict (feature_key) do nothing;

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
drop policy if exists "Contests viewable by enabled public feed, creator, or members" on public.contests;
create policy "Contests viewable by enabled public feed, creator, or members"
on public.contests for select
to anon, authenticated
using (
  (is_public = true and (select public.can_use_public_contests()))
  or creator_id = (select auth.uid())
  or exists (
    select 1
    from public.contest_participants
    where contest_participants.contest_id = contests.id
      and contest_participants.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can create contests" on public.contests;
drop policy if exists "Users can create gated contests" on public.contests;
create policy "Users can create gated contests"
on public.contests for insert
to authenticated
with check (
  (select auth.uid()) = creator_id
  and (is_public = false or (select public.can_use_public_contests()))
);

commit;
