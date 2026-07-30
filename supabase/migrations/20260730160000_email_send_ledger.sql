-- Email delivery ledger.
--
-- The profiles.*_emailed_at columns record that Resend's batch endpoint
-- returned 2xx for the chunk a recipient was in — which is acceptance, not
-- delivery. When the account hit its daily quota on July 30 the batch calls
-- still succeeded and every recipient got stamped, while Resend later marked
-- a large share of those messages Failed. That left no way to tell who
-- actually received the blast, and it silently disabled the retry: the cron
-- filters on `*_emailed_at is null`, so the failed recipients were excluded
-- from the next run.
--
-- This table stores the per-message id Resend returns so delivery can be
-- reconciled after the fact. Reconciliation flips failures to 'failed' and
-- clears the matching profiles column, which puts those recipients back into
-- the cron's normal retry path.

create table if not exists public.email_sends (
  id uuid primary key default gen_random_uuid(),
  -- 'launch' | 'reminder' | 'final_push' | 'finale' | 'test'
  email_type text not null,
  -- profile id for real sends, a sentinel for the delivery-test endpoint.
  recipient_key text not null,
  recipient_email text not null,
  -- Per-message id from the Resend batch response. Null when the API call
  -- itself failed, so nothing was queued.
  resend_id uuid,
  -- 'queued' until reconciled, then 'delivered' | 'failed'.
  status text not null default 'queued',
  -- Raw Resend last_event, kept verbatim for debugging.
  last_event text,
  error text,
  created_at timestamptz not null default now(),
  reconciled_at timestamptz
);

-- Reconciliation walks the unresolved queue oldest-first.
create index if not exists email_sends_pending_idx
  on public.email_sends (created_at)
  where status = 'queued';

create index if not exists email_sends_resend_id_idx on public.email_sends (resend_id);
create index if not exists email_sends_type_created_idx on public.email_sends (email_type, created_at desc);
create index if not exists email_sends_recipient_idx on public.email_sends (recipient_email, created_at desc);

-- Backfill matches Resend's listed messages to ledger rows by id; a unique
-- index keeps repeated backfill runs from inserting duplicates.
create unique index if not exists email_sends_resend_id_key
  on public.email_sends (resend_id)
  where resend_id is not null;

-- Recipient addresses are PII and nothing client-side needs this table.
-- RLS on with no policies = service role only, matching email_subscribers.
alter table public.email_sends enable row level security;
