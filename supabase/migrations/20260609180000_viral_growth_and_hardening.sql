-- Viral growth + leaderboard hardening
--
-- 1. Server-side limits on pushup logs (count cap, July 2026 window, daily cap)
-- 2. Referral tracking (profiles.referred_by) for "patriots recruited" credit
-- 3. Display-name blocklist so public boards stay screenshot-safe

-- 1a. Per-log cap and challenge date window.
-- NOT VALID so pre-existing test rows don't block the migration; new rows are enforced.
alter table public.pushup_logs
  add constraint pushup_logs_count_max check (count <= 1000) not valid;

-- One-day buffer on each side of July 2026 to absorb client time zones.
alter table public.pushup_logs
  add constraint pushup_logs_july_2026 check (
    logged_at >= '2026-06-30T00:00:00Z' and logged_at < '2026-08-02T00:00:00Z'
  ) not valid;

-- 1b. Daily total cap per user (3,000/day) enforced in a trigger.
create or replace function public.enforce_daily_pushup_cap()
returns trigger as $$
declare
  daily_total integer;
begin
  select coalesce(sum(count), 0) into daily_total
  from public.pushup_logs
  where user_id = new.user_id
    and date(logged_at) = date(new.logged_at);

  if daily_total + new.count > 3000 then
    raise exception 'Daily limit reached: max 3000 push-ups per day.';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists enforce_daily_pushup_cap on public.pushup_logs;
create trigger enforce_daily_pushup_cap
  before insert on public.pushup_logs
  for each row execute function public.enforce_daily_pushup_cap();

-- 2. Referral tracking. Stores who recruited this user; recruit counts are
-- derived with count queries against this column.
alter table public.profiles
  add column if not exists referred_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_profiles_referred_by on public.profiles(referred_by);

-- A user cannot refer themselves.
alter table public.profiles
  add constraint profiles_no_self_referral check (referred_by is null or referred_by <> id);

-- 3. Display-name blocklist. Public handles appear on shareable boards and
-- OG images, so reject the obvious abuse terms at the database edge.
create or replace function public.is_handle_allowed(handle text)
returns boolean as $$
declare
  normalized text := lower(coalesce(handle, ''));
  banned text[] := array[
    'fuck', 'shit', 'cunt', 'bitch', 'asshole', 'dick', 'pussy',
    'nigg', 'fagg', 'rape', 'nazi', 'hitler', 'kkk'
  ];
  term text;
begin
  foreach term in array banned loop
    if position(term in normalized) > 0 then
      return false;
    end if;
  end loop;
  return true;
end;
$$ language plpgsql immutable;

create or replace function public.enforce_handle_blocklist()
returns trigger as $$
begin
  if new.display_name is not null and not public.is_handle_allowed(new.display_name) then
    raise exception 'That handle is not allowed.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists enforce_handle_blocklist on public.profiles;
create trigger enforce_handle_blocklist
  before insert or update of display_name on public.profiles
  for each row execute function public.enforce_handle_blocklist();
