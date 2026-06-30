-- Launch email now goes to registered participants (profiles) instead of the
-- pre-launch email_subscribers list. Add a send-tracking column so the July 1
-- blast stays idempotent across cron re-runs (mirrors email_subscribers.notified_at).

alter table public.profiles
  add column if not exists launch_emailed_at timestamptz;
