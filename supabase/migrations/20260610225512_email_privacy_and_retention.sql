-- Week 2/3: email privacy fix, retention email support, recruiter leaderboard
--
-- 1. PRIVACY: profiles.email was readable by anyone holding the anon key
--    (select policy was `using (true)`). Restrict profiles to own-row reads
--    and expose only safe columns through views and RPCs.
-- 2. Email reminder support: opt-out + send-tracking columns.
-- 3. Recruiter counts on the leaderboard view.

-- ============================================================
-- 1. Profiles privacy
-- ============================================================

-- The leaderboard views must keep working for anonymous visitors after the
-- table is locked down, so they become security definer. They expose only
-- non-sensitive columns (no email), which is why definer is safe here.
alter view public.leaderboard set (security_invoker = false);
alter view public.state_leaderboard set (security_invoker = false);
alter view public.pledge_leaderboard set (security_invoker = false);

-- Safe public projection of profiles for cross-user reads (contest member
-- lists, etc.). No email column.
create or replace view public.public_profiles
with (security_invoker = false)
as
select id, display_name, state_code, avatar_url, created_at
from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- Replace the open select policy with own-row access.
drop policy if exists "Profiles are viewable by everyone" on public.profiles;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'Users can view own profile'
  ) then
    create policy "Users can view own profile" on public.profiles
      for select using (auth.uid() = id);
  end if;
end;
$$;

-- RPCs covering the lookups the app previously did directly on profiles.

-- Handle availability (signup runs as anon; dashboard edit excludes self).
create or replace function public.is_handle_available(p_handle text)
returns boolean as $$
  select not exists (
    select 1 from public.profiles
    where lower(display_name) = lower(trim(p_handle))
      and (auth.uid() is null or id <> auth.uid())
  );
$$ language sql stable security definer set search_path = public;

-- Resolve a handle to a user id (referral attribution).
create or replace function public.resolve_handle(p_handle text)
returns uuid as $$
  select id from public.profiles
  where lower(display_name) = lower(trim(p_handle))
  limit 1;
$$ language sql stable security definer set search_path = public;

-- Total signups (landing-page social proof).
create or replace function public.participant_count()
returns integer as $$
  select count(*)::integer from public.profiles;
$$ language sql stable security definer set search_path = public;

-- How many patriots the current user has recruited.
create or replace function public.get_recruit_count()
returns integer as $$
  select count(*)::integer from public.profiles
  where referred_by = auth.uid();
$$ language sql stable security definer set search_path = public;

grant execute on function public.is_handle_available(text) to anon, authenticated;
grant execute on function public.resolve_handle(text) to anon, authenticated;
grant execute on function public.participant_count() to anon, authenticated;
grant execute on function public.get_recruit_count() to authenticated;

-- ============================================================
-- 2. Email reminder support
-- ============================================================

alter table public.profiles
  add column if not exists email_opt_out boolean not null default false;

alter table public.profiles
  add column if not exists last_reminder_at timestamptz;

alter table public.email_subscribers
  add column if not exists notified_at timestamptz;

-- ============================================================
-- 3. Leaderboard view: recruits + created_at (founding badge)
-- ============================================================

create or replace view public.leaderboard
with (security_invoker = false)
as
select
  p.id,
  p.display_name,
  p.state_code,
  p.avatar_url,
  s.total_pushups,
  s.current_streak,
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
