-- Post-contest: close the books and open the finale.
--
-- The contest runs July 1-31, 2026 with a one-day grace period (August 1)
-- for July reps that didn't get logged in time. After that, standings are
-- final and must be immutable.
--
-- The existing pushup_logs_july_2026 CHECK bounds the *dated day* of a log
-- (logged_at), not when the row was written — so nothing stops a July-dated
-- log from being inserted, edited, or deleted months later, silently
-- rewriting the final leaderboard. This migration adds the real deadline:
-- a trigger that rejects every write to pushup_logs once the grace period
-- is over. With writes frozen, the live leaderboard/state views ARE the
-- certified final results — no snapshot table needed.
--
-- 1. Freeze trigger on pushup_logs after the grace deadline.
-- 2. Let signed-in users join the 2027 interest list (the insert policy on
--    email_subscribers was anon-only).
-- 3. profiles.finale_emailed_at for the one-time finale email's idempotency,
--    mirroring launch_emailed_at.

-- ============================================================
-- 1. Freeze the books
-- ============================================================

-- Midnight at the end of August 1 in the westernmost US timezone (Hawaii,
-- UTC-10), so every patriot gets their full local grace day. The client
-- stops offering the logging UI on August 2 local time; this is the
-- server-side guarantee behind it.
create or replace function public.reject_writes_after_freeze()
returns trigger as $$
begin
  if now() >= timestamptz '2026-08-02 10:00:00+00' then
    raise exception 'The books are closed — the 2026 Liberty Lift is final. See you next year, patriot.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists freeze_pushup_logs on public.pushup_logs;
create trigger freeze_pushup_logs
  before insert or update or delete on public.pushup_logs
  for each row execute function public.reject_writes_after_freeze();

-- ============================================================
-- 2. 2027 interest list: signed-in users could not insert
-- ============================================================

drop policy if exists "Allow authenticated email signups" on public.email_subscribers;
create policy "Allow authenticated email signups" on public.email_subscribers
  for insert to authenticated with check (true);

-- ============================================================
-- 3. Finale email idempotency marker
-- ============================================================

alter table public.profiles
  add column if not exists finale_emailed_at timestamptz;
