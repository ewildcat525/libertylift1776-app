-- Simplify pledges to a single cause and a single, easy-to-project structure:
-- Wounded Warrior Project, donating per push-up completed. This keeps the
-- projected-total math trivial (reps x rate) across the site.
--
-- Pre-launch, so any existing rows are test data; migrate them to the new
-- values before tightening the CHECK constraints (a narrower CHECK would
-- otherwise fail to apply against violating rows).

update public.pledges set charity = 'wounded_warrior' where charity <> 'wounded_warrior';
update public.pledges set pledge_type = 'per_completed' where pledge_type <> 'per_completed';

-- Replace the inline CHECK constraints (auto-named <table>_<column>_check)
-- with single-value constraints.
alter table public.pledges drop constraint if exists pledges_charity_check;
alter table public.pledges
  add constraint pledges_charity_check check (charity = 'wounded_warrior');

alter table public.pledges drop constraint if exists pledges_pledge_type_check;
alter table public.pledges
  add constraint pledges_pledge_type_check check (pledge_type = 'per_completed');

-- Default new rows to the only supported values.
alter table public.pledges alter column charity set default 'wounded_warrior';
alter table public.pledges alter column pledge_type set default 'per_completed';
