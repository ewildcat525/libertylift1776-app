-- The moon shot: America's 239,000th push-up — one for every mile between
-- Earth and the moon (the Apollo crews' "quarter of a million miles").
--
-- As with the 177,600 summit, the existing claim trigger
-- (claim_community_milestones) and read RPC (get_community_progress)
-- operate over every community_milestones row, so the threshold and its
-- one-of-a-kind badge are all that's needed server-side. Client-side,
-- this milestone plays the lunar flag-plant animation.

insert into public.achievements (id, name, description, icon, threshold, requirement_type) values
  ('eagle_has_landed', 'The Eagle Has Landed', 'Pressed America''s 239,000th push-up — one for every mile to the moon. One patriot in history planted the flag', '🌕', null, 'special')
on conflict (id) do nothing;

insert into public.community_milestones (threshold, achievement_id) values
  (239000, 'eagle_has_landed')
on conflict (threshold) do nothing;
