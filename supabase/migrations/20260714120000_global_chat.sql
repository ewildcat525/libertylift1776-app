-- Nationwide trash-talk chat with @mentions and notifications
--
-- 1. chat_messages table: one global message feed for all participants
-- 2. RLS: any signed-in participant can read and post; senders can delete
--    their own messages
-- 3. Guardrails: 280-char limit, slur blocklist, per-user rate limit
-- 4. notifications table: @handle mentions in chat fan out to the mentioned
--    users via trigger; recipients read and mark-read their own rows
-- 5. Realtime publication so chat and notifications update live

create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  body text not null check (char_length(body) <= 280 and btrim(body) <> ''),
  created_at timestamptz default now() not null
);

create index idx_chat_messages_created
  on public.chat_messages(created_at desc);

alter table public.chat_messages enable row level security;

-- Trash talk between rivals is the point, so plain profanity passes, but the
-- hate/abuse terms from the handle blocklist stay banned in chat too.
create or replace function public.is_message_allowed(message text)
returns boolean as $$
declare
  normalized text := lower(coalesce(message, ''));
  banned text[] := array['nigg', 'fagg', 'rape', 'nazi', 'hitler', 'kkk'];
  term text;
begin
  foreach term in array banned loop
    if position(term in normalized) > 0 then
      return false;
    end if;
  end loop;
  return true;
end;
$$ language plpgsql immutable;

create or replace function public.enforce_chat_message_rules()
returns trigger as $$
declare
  recent_count integer;
begin
  if not public.is_message_allowed(new.body) then
    raise exception 'That message is not allowed.';
  end if;

  select count(*) into recent_count
  from public.chat_messages
  where user_id = new.user_id
    and created_at > now() - interval '60 seconds';

  if recent_count >= 10 then
    raise exception 'Easy there, patriot. Max 10 messages per minute.';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger enforce_chat_message_rules
  before insert on public.chat_messages
  for each row execute function public.enforce_chat_message_rules();

-- Read: any signed-in participant.
create policy "Signed-in users can read chat" on public.chat_messages
  for select to authenticated using (true);

-- Write: only your own messages.
create policy "Users can post own messages" on public.chat_messages
  for insert to authenticated with check (auth.uid() = user_id);

-- Delete: your own messages.
create policy "Users can delete own messages" on public.chat_messages
  for delete to authenticated using (auth.uid() = user_id);

-- ============================================================
-- Mention notifications
-- ============================================================

create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete cascade not null,
  type text not null default 'mention',
  message_id uuid references public.chat_messages(id) on delete cascade,
  body text,
  read_at timestamptz,
  created_at timestamptz default now() not null
);

create index idx_notifications_user_unread
  on public.notifications(user_id, created_at desc)
  where read_at is null;

create index idx_notifications_user_created
  on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

-- Recipients see and manage only their own notifications. Rows are created
-- exclusively by the security-definer trigger below, so no insert policy.
create policy "Users can read own notifications" on public.notifications
  for select to authenticated using (auth.uid() = user_id);

create policy "Users can mark own notifications read" on public.notifications
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own notifications" on public.notifications
  for delete to authenticated using (auth.uid() = user_id);

-- Fan @handle mentions out to the mentioned users. Handles are generated as
-- single tokens (e.g. TXLifter4821), so mentions parse as @ + word chars.
create or replace function public.create_mention_notifications()
returns trigger as $$
begin
  insert into public.notifications (user_id, actor_id, type, message_id, body)
  select distinct p.id, new.user_id, 'mention', new.id, new.body
  from (
    select (regexp_matches(new.body, '@([A-Za-z0-9_]+)', 'g'))[1] as handle
  ) mentions
  join public.profiles p on lower(p.display_name) = lower(mentions.handle)
  where p.id <> new.user_id;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger create_mention_notifications
  after insert on public.chat_messages
  for each row execute function public.create_mention_notifications();

-- Live updates for the chat page and the notification bell. RLS applies to
-- realtime, so users only receive notification rows addressed to them.
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.notifications;
