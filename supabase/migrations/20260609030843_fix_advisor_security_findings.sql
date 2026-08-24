alter table public.achievements enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'achievements'
      and policyname = 'Achievement definitions viewable by everyone'
  ) then
    create policy "Achievement definitions viewable by everyone"
      on public.achievements
      for select
      to anon, authenticated
      using (true);
  end if;
end;
$$;

alter view public.leaderboard
set (security_invoker = true);

alter view public.state_leaderboard
set (security_invoker = true);
