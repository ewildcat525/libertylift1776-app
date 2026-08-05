-- A reusable ledger for one-off campaign sends.
--
-- This intentionally has a newer migration version than every migration
-- currently recorded in production. The table may already exist there from
-- a direct schema apply, so every statement is safe to reconcile and record.

create table if not exists public.email_campaign_sends (
  campaign text not null check (length(campaign) between 1 and 64),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (campaign, user_id)
);

comment on table public.email_campaign_sends is
  'One row per recipient per one-off email campaign. Written by the protected campaign routes only.';

create index if not exists email_campaign_sends_user_id_idx
  on public.email_campaign_sends (user_id);

-- Service-role only: campaign routes use the admin client, and nothing in the
-- app needs to read who has been mailed. No policies means no client access.
alter table public.email_campaign_sends enable row level security;

revoke all on table public.email_campaign_sends from anon, authenticated;
