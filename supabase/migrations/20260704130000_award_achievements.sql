-- Award achievements automatically.
--
-- The achievements and user_achievements tables have existed since launch,
-- with badges seeded (Founding Father at 1776, Overachiever at 1777, etc.),
-- but nothing ever inserted into user_achievements. Grant them from a trigger
-- on user_stats, which update_user_stats() already maintains on every log, so
-- badges are awarded no matter how the reps come in.
--
-- Badges are grant-only: deleting logs recalculates stats but never revokes
-- an earned badge, matching the usual "achievement" contract.

create or replace function public.award_achievements()
returns trigger as $$
begin
  insert into public.user_achievements (user_id, achievement_id)
  select new.user_id, a.id
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

drop trigger if exists award_achievements on public.user_stats;
create trigger award_achievements
  after insert or update on public.user_stats
  for each row execute function public.award_achievements();

-- Backfill: grant threshold badges already earned before this trigger existed.
insert into public.user_achievements (user_id, achievement_id)
select s.user_id, a.id
from public.user_stats s
join public.achievements a
  on a.threshold is not null
 and (
   (a.requirement_type = 'total'  and s.total_pushups  >= a.threshold) or
   (a.requirement_type = 'streak' and s.longest_streak >= a.threshold) or
   (a.requirement_type = 'daily'  and s.best_day       >= a.threshold)
 )
on conflict (user_id, achievement_id) do nothing;

-- Declaration Signer is the one 'special' badge: signed up before July.
-- Signup date never changes, so a one-time backfill covers everyone eligible.
insert into public.user_achievements (user_id, achievement_id)
select p.id, 'declaration_signer'
from public.profiles p
where p.created_at < timestamptz '2026-07-01 00:00:00+00'
on conflict (user_id, achievement_id) do nothing;
