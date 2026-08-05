-- One-time 2026 finisher-shirt final call.
-- The manual campaign route uses this marker to make retries idempotent and
-- to ensure an accepted recipient is not emailed twice.

alter table public.profiles
  add column if not exists merch_final_call_emailed_at timestamptz;
