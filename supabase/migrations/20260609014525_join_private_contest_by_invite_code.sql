create or replace function public.join_contest_by_invite_code(p_invite_code text)
returns public.contests
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_contest public.contests;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
    into v_contest
  from public.contests
  where upper(invite_code) = upper(trim(p_invite_code))
  limit 1;

  if v_contest.id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.contest_participants (contest_id, user_id)
  values (v_contest.id, auth.uid())
  on conflict (contest_id, user_id) do nothing;

  return v_contest;
end;
$$;

revoke all on function public.join_contest_by_invite_code(text) from public;
grant execute on function public.join_contest_by_invite_code(text) to authenticated;

create or replace view public.pledge_leaderboard
with (security_invoker = true)
as
select
  pledges.user_id,
  coalesce(profiles.display_name, 'Anonymous Patriot') as display_name,
  profiles.state_code,
  pledges.charity,
  pledges.pledge_type,
  pledges.rate_cents,
  coalesce(user_stats.total_pushups, 0) as total_pushups,
  case
    when pledges.pledge_type = 'per_completed'
      then (coalesce(user_stats.total_pushups, 0) * pledges.rate_cents / 100.0)
    else (greatest(0, 1776 - coalesce(user_stats.total_pushups, 0)) * pledges.rate_cents / 100.0)
  end as pledged_amount
from public.pledges
left join public.profiles on profiles.id = pledges.user_id
left join public.user_stats on user_stats.user_id = pledges.user_id
where pledges.is_active = true;

grant select on public.pledge_leaderboard to anon, authenticated;
