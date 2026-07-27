-- Raise the daily push-up cap from 3,000 to 5,000 ahead of the Final Push
-- (July 31), so a monster final day doesn't hit the ceiling. Same trigger as
-- 20260610150000 (insert AND update, excluding the row being modified);
-- only the limit and message change. The per-log cap stays at 1,000.

create or replace function public.enforce_daily_pushup_cap()
returns trigger as $$
declare
  daily_total integer;
begin
  select coalesce(sum(count), 0) into daily_total
  from public.pushup_logs
  where user_id = new.user_id
    and date(logged_at) = date(new.logged_at)
    and id is distinct from new.id;

  if daily_total + new.count > 5000 then
    raise exception 'Daily limit reached: max 5000 push-ups per day.';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
