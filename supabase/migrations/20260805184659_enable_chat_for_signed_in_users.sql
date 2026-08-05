-- Restore community chat for signed-in participants. The chat tables remain
-- protected by RLS policies scoped to the authenticated role.

create or replace function public.can_use_chat()
returns boolean
language sql
stable
set search_path = ''
as $$
  select true;
$$;

revoke all on function public.can_use_chat() from public, anon;
grant execute on function public.can_use_chat() to authenticated, service_role;
