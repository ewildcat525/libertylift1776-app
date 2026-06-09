with ranked_profiles as (
  select
    id,
    display_name,
    row_number() over (
      partition by lower(display_name)
      order by created_at asc, id asc
    ) as duplicate_rank
  from public.profiles
  where display_name is not null
    and btrim(display_name) <> ''
)
update public.profiles profiles
set display_name = left(btrim(ranked_profiles.display_name), 31) || '-' || left(profiles.id::text, 8)
from ranked_profiles
where profiles.id = ranked_profiles.id
  and ranked_profiles.duplicate_rank > 1;

create unique index if not exists profiles_display_name_unique
on public.profiles (lower(display_name))
where display_name is not null
  and btrim(display_name) <> '';
