-- Nationwide trash-talk chat
--
-- 1. chat_messages table: one global message feed for all participants
-- 2. RLS: any signed-in participant can read and post; senders can delete
--    their own messages
-- 3. Guardrails: 280-char limit, slur blocklist, per-user rate limit
-- 4. Realtime publication so the chat updates live

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

-- Live updates on the leaderboard page.
alter publication supabase_realtime add table public.chat_messages;
