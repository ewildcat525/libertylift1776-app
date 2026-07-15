-- Thumbs-up reactions on chat messages
--
-- 1. chat_message_reactions: one thumbs-up per user per message
-- 2. RLS: readable by anyone who can use chat; users manage only their own
-- 3. replica identity full so realtime DELETE payloads include message_id
--    (needed to decrement counts live)
-- 4. Realtime publication

create table public.chat_message_reactions (
  id uuid default gen_random_uuid() primary key,
  message_id uuid references public.chat_messages(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(message_id, user_id)
);

create index idx_chat_message_reactions_message
  on public.chat_message_reactions(message_id);

alter table public.chat_message_reactions enable row level security;

-- Default replica identity only exposes the primary key on delete; realtime
-- needs message_id to update the right message's count when a reaction is
-- removed.
alter table public.chat_message_reactions replica identity full;

-- Read: anyone allowed in chat (same gate as messages).
create policy "Chat users can read reactions" on public.chat_message_reactions
  for select to authenticated using (public.can_use_chat());

-- Write: only your own reaction, and only while chat is open to you.
create policy "Users can add own reactions" on public.chat_message_reactions
  for insert to authenticated
  with check (auth.uid() = user_id and public.can_use_chat());

-- Delete: only your own reaction (un-thumbs-up).
create policy "Users can remove own reactions" on public.chat_message_reactions
  for delete to authenticated using (auth.uid() = user_id);

-- Live count updates on the chat page.
alter publication supabase_realtime add table public.chat_message_reactions;
