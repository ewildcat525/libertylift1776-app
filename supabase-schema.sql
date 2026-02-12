-- Liberty Lift 1776 Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users profile (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  state_code char(2), -- US state for state competitions
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Daily push-up logs
create table public.pushup_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  count integer not null check (count > 0),
  logged_at timestamp with time zone default timezone('utc'::text, now()) not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- User stats (materialized for performance)
create table public.user_stats (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  total_pushups integer default 0 not null,
  current_streak integer default 0 not null,
  longest_streak integer default 0 not null,
  best_day integer default 0 not null,
  days_logged integer default 0 not null,
  last_log_date date,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Private contests/challenges
create table public.contests (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  invite_code text unique not null,
  is_public boolean default false,
  start_date date not null,
  end_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Contest participants
create table public.contest_participants (
  id uuid default uuid_generate_v4() primary key,
  contest_id uuid references public.contests(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(contest_id, user_id)
);

-- Achievements/badges
create table public.achievements (
  id text primary key, -- e.g., 'minuteman', 'patriot', 'founding_father'
  name text not null,
  description text not null,
  icon text not null,
  threshold integer, -- pushup count needed
  requirement_type text not null -- 'total', 'streak', 'daily', 'special'
);

-- User achievements
create table public.user_achievements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  achievement_id text references public.achievements(id) not null,
  earned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, achievement_id)
);

-- Insert default achievements
insert into public.achievements (id, name, description, icon, threshold, requirement_type) values
  ('first_rep', 'First Rep', 'Logged your first push-up', '💪', 1, 'total'),
  ('minuteman', 'Minuteman', 'Completed 100 push-ups', '🎖️', 100, 'total'),
  ('continental', 'Continental Soldier', 'Completed 500 push-ups', '⚔️', 500, 'total'),
  ('patriot', 'Patriot', 'Reached the halfway mark - 888 push-ups', '🦅', 888, 'total'),
  ('revolutionary', 'Revolutionary', 'Completed 1500 push-ups', '🔥', 1500, 'total'),
  ('founding_father', 'Founding Father', 'Completed the full 1776 push-ups!', '🏛️', 1776, 'total'),
  ('declaration_signer', 'Declaration Signer', 'Signed up before July', '📜', null, 'special'),
  ('paul_revere', 'Paul Revere', 'Logged push-ups every day for 7 days', '🐎', 7, 'streak'),
  ('independence_week', 'Independence Week', 'Logged push-ups every day for 14 days', '🗽', 14, 'streak'),
  ('iron_will', 'Iron Will', 'Logged push-ups every day for 31 days', '⭐', 31, 'streak'),
  ('centurion', 'Centurion', 'Did 100+ push-ups in a single day', '💯', 100, 'daily'),
  ('overachiever', 'Overachiever', 'Exceeded 1776 total push-ups', '🚀', 1777, 'total');

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.pushup_logs enable row level security;
alter table public.user_stats enable row level security;
alter table public.contests enable row level security;
alter table public.contest_participants enable row level security;
alter table public.user_achievements enable row level security;

-- Policies: Users can read all profiles (for leaderboards)
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Policies: Pushup logs
create policy "Users can view all logs" on public.pushup_logs for select using (true);
create policy "Users can insert own logs" on public.pushup_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own logs" on public.pushup_logs for update using (auth.uid() = user_id);
create policy "Users can delete own logs" on public.pushup_logs for delete using (auth.uid() = user_id);

-- Policies: User stats
create policy "Stats are viewable by everyone" on public.user_stats for select using (true);
create policy "Users can update own stats" on public.user_stats for update using (auth.uid() = user_id);
create policy "Users can insert own stats" on public.user_stats for insert with check (auth.uid() = user_id);

-- Policies: Contests
create policy "Public contests viewable by all" on public.contests for select using (is_public = true or creator_id = auth.uid());
create policy "Users can create contests" on public.contests for insert with check (auth.uid() = creator_id);
create policy "Creators can update own contests" on public.contests for update using (auth.uid() = creator_id);

-- Policies: Contest participants
create policy "Participants viewable by contest members" on public.contest_participants for select using (true);
create policy "Users can join contests" on public.contest_participants for insert with check (auth.uid() = user_id);
create policy "Users can leave contests" on public.contest_participants for delete using (auth.uid() = user_id);

-- Policies: Achievements
create policy "Achievements viewable by everyone" on public.user_achievements for select using (true);
create policy "System can grant achievements" on public.user_achievements for insert with check (auth.uid() = user_id);

-- Function to update user stats after logging pushups
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
  -- Calculate totals
  select 
    coalesce(sum(count), 0),
    coalesce(max(daily_total), 0),
    count(distinct log_date)
  into v_total, v_best_day, v_days_logged
  from (
    select date(logged_at) as log_date, sum(count) as daily_total
    from public.pushup_logs
    where user_id = new.user_id
    group by date(logged_at)
  ) daily;

  -- Get last log date
  select date(max(logged_at)) into v_last_date
  from public.pushup_logs
  where user_id = new.user_id;

  -- Calculate current streak (simplified)
  select coalesce(current_streak, 0), coalesce(longest_streak, 0)
  into v_current_streak, v_longest_streak
  from public.user_stats
  where user_id = new.user_id;

  -- If logging today and yesterday was logged, increment streak
  if v_last_date = current_date then
    v_current_streak := v_current_streak + 1;
  elsif v_last_date = current_date - 1 then
    v_current_streak := v_current_streak;
  else
    v_current_streak := 1;
  end if;

  if v_current_streak > v_longest_streak then
    v_longest_streak := v_current_streak;
  end if;

  -- Upsert stats
  insert into public.user_stats (user_id, total_pushups, current_streak, longest_streak, best_day, days_logged, last_log_date, updated_at)
  values (new.user_id, v_total, v_current_streak, v_longest_streak, v_best_day, v_days_logged, v_last_date, now())
  on conflict (user_id) do update set
    total_pushups = v_total,
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    best_day = v_best_day,
    days_logged = v_days_logged,
    last_log_date = v_last_date,
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to update stats on new log
create trigger on_pushup_log_insert
  after insert on public.pushup_logs
  for each row execute function public.update_user_stats();

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  
  insert into public.user_stats (user_id)
  values (new.id);
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Indexes for performance
create index idx_pushup_logs_user_id on public.pushup_logs(user_id);
create index idx_pushup_logs_logged_at on public.pushup_logs(logged_at);
create index idx_user_stats_total on public.user_stats(total_pushups desc);
create index idx_contest_participants_contest on public.contest_participants(contest_id);
create index idx_contests_invite_code on public.contests(invite_code);

-- View for leaderboard
create or replace view public.leaderboard as
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
  rank() over (order by s.total_pushups desc) as global_rank
from public.profiles p
join public.user_stats s on p.id = s.user_id
where s.total_pushups > 0
order by s.total_pushups desc;

-- View for state leaderboard
create or replace view public.state_leaderboard as
select 
  state_code,
  count(*) as participants,
  sum(total_pushups) as total_pushups,
  avg(total_pushups)::integer as avg_pushups,
  rank() over (order by sum(total_pushups) desc) as state_rank
from public.profiles p
join public.user_stats s on p.id = s.user_id
where p.state_code is not null and s.total_pushups > 0
group by state_code
order by total_pushups desc;
