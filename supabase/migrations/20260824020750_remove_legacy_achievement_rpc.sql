-- Follow-up for databases that applied 20260817120000 before the legacy
-- overload was removed from that migration. The old function reads a user's
-- lifetime log history under SECURITY DEFINER and must not remain callable
-- through PostgREST.

begin;

drop function if exists public.achievement_earned_at(uuid, text, integer);

commit;
