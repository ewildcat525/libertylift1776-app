-- Support @mentions of handles that contain spaces (or punctuation).
--
-- The chat composer now inserts such handles in a delimited form, e.g.
-- "@[Gern Blanston]", while single-token handles stay bare ("@MDLifterCannon7").
-- The notification trigger must parse both forms. Previously it only matched
-- @([A-Za-z0-9_]+), so a mention like "@Gern Blanston" resolved to the
-- non-existent handle "Gern" and never notified the real user.

create or replace function public.create_mention_notifications()
returns trigger as $$
begin
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

  return new;
end;
$$ language plpgsql security definer set search_path = public;
