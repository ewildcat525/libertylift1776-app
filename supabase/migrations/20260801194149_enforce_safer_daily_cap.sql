-- Keep the competition from rewarding unsafe single-day volume. The
-- transaction-scoped advisory lock also closes the race where simultaneous
-- inserts could each read the same old daily total and collectively pass it.

create or replace function public.enforce_daily_pushup_cap()
returns trigger as $$
declare
  daily_total integer;
  log_day date := date(new.logged_at);
begin
  perform pg_advisory_xact_lock(
    hashtextextended(new.user_id::text || ':' || log_day::text, 0)
  );

  select coalesce(sum(count), 0) into daily_total
  from public.pushup_logs
  where user_id = new.user_id
    and date(logged_at) = log_day
    and id is distinct from new.id;

  if daily_total + new.count > 500 then
    raise exception 'Daily limit reached: max 500 push-ups per day.';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
