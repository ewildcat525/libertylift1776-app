-- Let invite recipients (including signed-out visitors) see the contest name
-- before joining. Holding the invite code is the secret, so this exposes
-- nothing the code holder would not see after joining anyway.
create or replace function public.get_contest_invite_preview(p_invite_code text)
returns table (name text, participant_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    contests.name,
    (
      select count(*)
      from public.contest_participants
      where contest_participants.contest_id = contests.id
    ) as participant_count
  from public.contests
  where upper(contests.invite_code) = upper(trim(p_invite_code))
  limit 1;
$$;

revoke all on function public.get_contest_invite_preview(text) from public;
grant execute on function public.get_contest_invite_preview(text) to anon, authenticated;
