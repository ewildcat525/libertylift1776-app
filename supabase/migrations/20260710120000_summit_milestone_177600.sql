-- The summit milestone: America's 177,600th push-up (1,776 × 100 — a
-- hundred full Liberty Lifts pressed together).
--
-- The existing claim trigger (claim_community_milestones) and read RPC
-- (get_community_progress) both operate over every community_milestones
-- row, so adding the threshold and its one-of-a-kind badge is all that's
-- needed server-side. Client-side, this milestone gets the Iwo Jima flag
-- raising animation instead of fireworks.

insert into public.achievements (id, name, description, icon, threshold, requirement_type) values
  ('flag_raiser', 'Flag Raiser', 'Pressed America''s 177,600th push-up — 1,776 × 100. One patriot in history raised the flag', '🇺🇸', null, 'special')
on conflict (id) do nothing;

insert into public.community_milestones (threshold, achievement_id) values
  (177600, 'flag_raiser')
on conflict (threshold) do nothing;
