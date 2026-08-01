-- Annual participation is separate from a person's durable account.
--
-- Profiles remain the person's identity across years. A season registration
-- is the explicit act of joining one July challenge, while season_interests
-- is the low-friction offseason list. Keeping interests in their own table is
-- important: email_subscribers.email is globally unique, so reusing it would
-- fail to record a 2027 opt-in from someone who joined the 2026 launch list.

create table public.challenge_seasons (
  year integer primary key check (year between 2026 and 2100),
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null check (status in ('interest', 'registration', 'live', 'closed')),
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (
    registration_closes_at is null
    or registration_opens_at is null
    or registration_closes_at > registration_opens_at
  )
);

comment on table public.challenge_seasons is
  'Lifecycle and registration window for each annual Liberty Lift challenge.';

insert into public.challenge_seasons (
  year,
  name,
  starts_on,
  ends_on,
  status,
  registration_opens_at,
  registration_closes_at
)
values
  (2026, 'Liberty Lift 1776 — 2026', date '2026-07-01', date '2026-07-31', 'closed',
    timestamptz '2026-01-01 00:00:00 America/New_York',
    timestamptz '2026-08-01 10:00:00+00'),
  (2027, 'Liberty Lift 1776 — 2027', date '2027-07-01', date '2027-07-31', 'interest',
    null, null);

create table public.season_registrations (
  season_year integer not null references public.challenge_seasons(year) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  registered_at timestamptz not null default now(),
  primary key (season_year, user_id)
);

comment on table public.season_registrations is
  'One durable account explicitly enlisted in one annual challenge.';

-- Everyone who created a 2026 profile was part of the original challenge.
insert into public.season_registrations (season_year, user_id, registered_at)
select 2026, p.id, p.created_at
from public.profiles p
on conflict (season_year, user_id) do nothing;

create index season_registrations_user_id_idx
  on public.season_registrations (user_id);

create table public.season_interests (
  id uuid primary key default gen_random_uuid(),
  season_year integer not null references public.challenge_seasons(year) on delete restrict,
  email text not null check (
    email = lower(btrim(email))
    and length(email) between 3 and 320
    and position('@' in email) > 1
  ),
  user_id uuid references auth.users(id) on delete set null,
  source text not null default 'finale',
  created_at timestamptz not null default now(),
  unique (season_year, email)
);

comment on table public.season_interests is
  'Private offseason email interest, segmented by challenge year.';

create index season_interests_user_id_idx
  on public.season_interests (user_id)
  where user_id is not null;

alter table public.challenge_seasons enable row level security;
alter table public.season_registrations enable row level security;
alter table public.season_interests enable row level security;

-- Public season metadata lets clients render the current lifecycle, but the
-- two tables containing a user identity remain private to that user.
create policy "Challenge seasons are public"
  on public.challenge_seasons for select
  to anon, authenticated
  using (true);

create policy "Users can read own season registrations"
  on public.season_registrations for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can join an open season"
  on public.season_registrations for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.challenge_seasons s
      where s.year = season_year
        and s.status in ('registration', 'live')
        and (s.registration_opens_at is null or now() >= s.registration_opens_at)
        and (s.registration_closes_at is null or now() < s.registration_closes_at)
    )
  );

create policy "Anyone can join an active interest list"
  on public.season_interests for insert
  to anon, authenticated
  with check (
    (user_id is null or user_id = (select auth.uid()))
    and exists (
      select 1
      from public.challenge_seasons s
      where s.year = season_year
        and s.status in ('interest', 'registration')
    )
  );

-- Explicit grants are required for projects using the newer opt-in Data API
-- exposure model. RLS still decides which rows each caller can access.
grant select on public.challenge_seasons to anon, authenticated;
grant select, insert on public.season_registrations to authenticated;
grant insert on public.season_interests to anon, authenticated;
