drop policy if exists "Public contests viewable by all" on public.contests;
drop policy if exists "Contests viewable by public, creator, or members" on public.contests;

create policy "Contests viewable by public, creator, or members"
on public.contests
for select
using (
  is_public = true
  or creator_id = auth.uid()
  or exists (
    select 1
    from public.contest_participants
    where contest_participants.contest_id = contests.id
      and contest_participants.user_id = auth.uid()
  )
);
