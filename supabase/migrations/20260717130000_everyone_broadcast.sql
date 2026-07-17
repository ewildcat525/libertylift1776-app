-- @everyone broadcast: a single authorized broadcaster can summon the whole
-- roster of patriots with one message.
--
-- Typing "@everyone" in chat fans a notification out to every other
-- participant, whose bell then links them straight to the chat. This power is
-- deliberately narrow: only the account(s) whitelisted in
-- public.can_broadcast_everyone() can trigger the fan-out. For anyone else,
-- "@everyone" is inert text (it only notifies a real user if one literally
-- named themselves "everyone").
--
-- Keep the whitelist below in sync with EVERYONE_BROADCASTER_EMAILS in
-- src/lib/flags.ts.

create or replace function public.can_broadcast_everyone(uid uuid)
returns boolean as $$
  select exists (
    select 1
    from public.profiles
    where id = uid
      and lower(email) in ('kevinabbas@gmail.com')
  );
$$ language sql stable security definer set search_path = public;

-- Extend the mention trigger with the @everyone broadcast branch. The
-- individual @handle fan-out is unchanged from the previous migration.
create or replace function public.create_mention_notifications()
returns trigger as $$
begin
  -- Individual @handle mentions (delimited or bare token).
  insert into public.notifications (user_id, actor_id, type, message_id, body)
  select distinct p.id, new.user_id, 'mention', new.id, new.body
  from (
    -- Delimited handles: @[Gern Blanston]
    select (regexp_matches(new.body, '@\[([^\]]+)\]', 'g'))[1] as handle
    union all
    -- Bare single-token handles: @MDLifterCannon7
    select (regexp_matches(new.body, '@([A-Za-z0-9_]+)', 'g'))[1] as handle
  ) mentions
  join public.profiles p
    on lower(p.display_name) = lower(btrim(mentions.handle))
  where p.id <> new.user_id;

  -- @everyone broadcast — only an authorized broadcaster can trigger it.
  -- Matches "@everyone" as a whole word (so "@everyoneelse" won't), case
  -- insensitively.
  if new.body ~* '@everyone\M'
     and public.can_broadcast_everyone(new.user_id) then
    insert into public.notifications (user_id, actor_id, type, message_id, body)
    select p.id, new.user_id, 'everyone', new.id, new.body
    from public.profiles p
    where p.id <> new.user_id;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
