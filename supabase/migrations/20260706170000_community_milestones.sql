-- Community milestones: celebrate America's 50,000th push-up.
--
-- 1. community_stats keeps a running nationwide total (a singleton row,
--    maintained by trigger) so we never scan all logs on the hot path.
-- 2. community_milestones records who pressed the rep that carried the
--    country past each threshold. The row-lock on the singleton serializes
--    concurrent logs, so exactly one patriot claims each milestone.
-- 3. The claimer is awarded a one-of-a-kind badge (Liberty Bell at 50,000).
--
-- Like personal badges, milestones are grant-only: deleting logs lowers the
-- running total but never un-rings the bell.

-- ============================================================
-- 1. Tables
-- ============================================================

create table if not exists public.community_stats (
  id integer primary key check (id = 1),
  total_pushups bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.community_milestones (
  threshold bigint primary key,
  achievement_id text references public.achievements(id),
  hit_by uuid references public.profiles(id) on delete set null,
  hit_at timestamptz,
  total_at_hit bigint
);

-- No direct client reads; everything flows through get_community_progress().
alter table public.community_stats enable row level security;
alter table public.community_milestones enable row level security;

-- One-of-a-kind badges for whoever presses the milestone rep.
insert into public.achievements (id, name, description, icon, threshold, requirement_type) values
  ('liberty_bell', 'Liberty Bell', 'Pressed America''s 50,000th push-up — one patriot in history', '🔔', null, 'special'),
  ('grand_union', 'Grand Union', 'Pressed America''s 100,000th push-up — one patriot in history', '🚩', null, 'special')
on conflict (id) do nothing;

insert into public.community_milestones (threshold, achievement_id) values
  (50000, 'liberty_bell'),
  (100000, 'grand_union')
on conflict (threshold) do nothing;

-- Seed the running total from every rep logged so far.
insert into public.community_stats (id, total_pushups)
select 1, coalesce(sum(count), 0) from public.pushup_logs
on conflict (id) do nothing;

-- ============================================================
-- 2. Trigger: maintain the total and claim milestones
-- ============================================================

create or replace function public.track_community_total()
returns trigger as $$
declare
  v_delta integer;
  v_user uuid;
  v_total bigint;
begin
  if tg_op = 'INSERT' then
    v_delta := new.count;
    v_user := new.user_id;
  elsif tg_op = 'DELETE' then
    v_delta := -old.count;
    v_user := old.user_id;
  else
    v_delta := new.count - old.count;
    v_user := new.user_id;
  end if;

  -- The row lock here serializes concurrent logs, so the milestone claim
  -- below can never double-fire.
  update public.community_stats
  set total_pushups = total_pushups + v_delta,
      updated_at = now()
  where id = 1
  returning total_pushups into v_total;

  -- Only a rep that moves the count forward can ring the bell.
  if v_delta > 0 and v_total is not null then
    with claimed as (
      update public.community_milestones
      set hit_by = v_user,
          hit_at = now(),
          total_at_hit = v_total
      where hit_by is null
        and hit_at is null
        and threshold <= v_total
      returning achievement_id
    )
    insert into public.user_achievements (user_id, achievement_id)
    select v_user, achievement_id
    from claimed
    where achievement_id is not null
    on conflict (user_id, achievement_id) do nothing;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists track_community_total on public.pushup_logs;
create trigger track_community_total
  after insert or update or delete on public.pushup_logs
  for each row execute function public.track_community_total();

-- ============================================================
-- 3. Backfill: if a threshold was already crossed before this
--    migration ran, credit the patriot whose rep crossed it.
-- ============================================================

with running as (
  select id, user_id, created_at,
         sum(count) over (order by created_at, id) as cum
  from public.pushup_logs
),
firsts as (
  select distinct on (m.threshold)
         m.threshold, r.user_id, r.created_at, r.cum
  from public.community_milestones m
  join running r on r.cum >= m.threshold
  where m.hit_by is null and m.hit_at is null
  order by m.threshold, r.created_at, r.id
)
update public.community_milestones m
set hit_by = f.user_id,
    hit_at = f.created_at,
    total_at_hit = f.cum
from firsts f
where m.threshold = f.threshold;

insert into public.user_achievements (user_id, achievement_id)
select hit_by, achievement_id
from public.community_milestones
where hit_by is not null and achievement_id is not null
on conflict (user_id, achievement_id) do nothing;

-- ============================================================
-- 4. Public read: nationwide total + milestone roll call
-- ============================================================

create or replace function public.get_community_progress()
returns json as $$
  select json_build_object(
    'total_pushups', coalesce((select total_pushups from public.community_stats where id = 1), 0),
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
