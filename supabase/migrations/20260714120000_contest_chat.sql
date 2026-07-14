-- Contest trash-talk chat
--
-- 1. contest_messages table: member-only message feed per contest
-- 2. RLS: only contest members (or the creator) can read/post; senders and
--    the contest creator can delete
-- 3. Guardrails: 280-char limit, slur blocklist, per-user rate limit
-- 4. Realtime publication so the chat updates live

create table public.contest_messages (
  id uuid default gen_random_uuid() primary key,
  contest_id uuid references public.contests(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  body text not null check (char_length(body) <= 280 and btrim(body) <> ''),
  created_at timestamptz default now() not null
);

create index idx_contest_messages_contest_created
  on public.contest_messages(contest_id, created_at desc);

alter table public.contest_messages enable row level security;

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

create or replace function public.enforce_contest_message_rules()
returns trigger as $$
declare
  recent_count integer;
begin
  if not public.is_message_allowed(new.body) then
    raise exception 'That message is not allowed.';
  end if;

  select count(*) into recent_count
  from public.contest_messages
  where user_id = new.user_id
    and contest_id = new.contest_id
    and created_at > now() - interval '60 seconds';

  if recent_count >= 10 then
    raise exception 'Easy there, patriot. Max 10 messages per minute.';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger enforce_contest_message_rules
  before insert on public.contest_messages
  for each row execute function public.enforce_contest_message_rules();

-- Read: contest members and the contest creator.
create policy "Contest members can read messages" on public.contest_messages
  for select using (
    exists (
      select 1 from public.contest_participants cp
      where cp.contest_id = contest_messages.contest_id
        and cp.user_id = auth.uid()
    )
    or exists (
      select 1 from public.contests c
      where c.id = contest_messages.contest_id
        and c.creator_id = auth.uid()
    )
  );

-- Write: only your own messages, and only into contests you belong to.
create policy "Contest members can post messages" on public.contest_messages
  for insert with check (
    auth.uid() = user_id
    and (
      exists (
        select 1 from public.contest_participants cp
        where cp.contest_id = contest_messages.contest_id
          and cp.user_id = auth.uid()
      )
      or exists (
        select 1 from public.contests c
        where c.id = contest_messages.contest_id
          and c.creator_id = auth.uid()
      )
    )
  );

-- Delete: your own messages; the contest creator can moderate any message.
create policy "Senders and creators can delete messages" on public.contest_messages
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1 from public.contests c
      where c.id = contest_messages.contest_id
        and c.creator_id = auth.uid()
    )
  );

-- Live updates on the contest page.
alter publication supabase_realtime add table public.contest_messages;
