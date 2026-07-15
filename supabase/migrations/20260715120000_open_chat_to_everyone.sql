-- Launch chat for everyone.
--
-- The chat/notification RLS policies gate on public.can_use_chat(), which was
-- limited to a tester allowlist during live testing. Open it to all signed-in
-- users. The policies are still `to authenticated`, so anonymous visitors
-- remain excluded.

create or replace function public.can_use_chat()
returns boolean as $$
  select true;
$$ language sql stable;
