-- Revoke threshold badges when deleted logs drop stats below the threshold.
--
-- award_achievements() was grant-only: logging reps inserted badges, but
-- deleting those reps left the badges behind. Someone could log their way to
-- Founding Father (1776 total), delete every log, and keep the badge with a
-- zeroed-out total. The delete path (recalculate_user_stats -> UPDATE on
-- user_stats) already fires this AFTER-UPDATE trigger with the corrected
-- stats, so the trigger just needs to reconcile both directions: grant what
-- the current stats earn, and revoke threshold badges they no longer support.
--
-- Only threshold badges (total/streak/daily) are reconciled. The 'special'
-- badge Declaration Signer has a null threshold and is never revoked — it is
-- earned by signup date, which deleting logs can't undo.

create or replace function public.award_achievements()
returns trigger as $$
begin
  -- Grant every threshold badge the current stats have earned.
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

  -- Revoke threshold badges the current stats no longer support (e.g. after
  -- logs were deleted). Special badges (null threshold) are left untouched.
  delete from public.user_achievements ua
  using public.achievements a
  where ua.user_id = new.user_id
    and ua.achievement_id = a.id
    and a.threshold is not null
    and not (
      (a.requirement_type = 'total'  and new.total_pushups  >= a.threshold) or
      (a.requirement_type = 'streak' and new.longest_streak >= a.threshold) or
      (a.requirement_type = 'daily'  and new.best_day       >= a.threshold)
    );

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Backfill: revoke threshold badges no user's current stats still support.
-- This cleans up badges awarded before the trigger revoked, including test
-- badges kept after their logs were deleted.
delete from public.user_achievements ua
using public.achievements a, public.user_stats s
where ua.achievement_id = a.id
  and s.user_id = ua.user_id
  and a.threshold is not null
  and not (
    (a.requirement_type = 'total'  and s.total_pushups  >= a.threshold) or
    (a.requirement_type = 'streak' and s.longest_streak >= a.threshold) or
    (a.requirement_type = 'daily'  and s.best_day       >= a.threshold)
  );
