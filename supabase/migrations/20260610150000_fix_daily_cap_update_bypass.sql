-- Fix: the daily push-up cap trigger only ran on insert, so a user could
-- insert logs under the 3,000/day cap and then update them past it (RLS
-- allows updating own logs). Re-create the trigger for insert AND update,
-- excluding the row being modified from the existing-total sum.
--
-- The per-log (count <= 1000) and July-window CHECK constraints from
-- 20260609180000 already apply to updates; only the trigger had the gap.

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

  if daily_total + new.count > 3000 then
    raise exception 'Daily limit reached: max 3000 push-ups per day.';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists enforce_daily_pushup_cap on public.pushup_logs;
create trigger enforce_daily_pushup_cap
  before insert or update on public.pushup_logs
  for each row execute function public.enforce_daily_pushup_cap();
