-- Farther Than Artemis II: America's 252,757th push-up — one mile farther
-- than the Artemis II crew flew from Earth (252,756 mi, April 2026), carrying
-- the country past the farthest any human has ever traveled and into distance
-- no one has reached.
--
-- As with the 177,600 summit and the 239,000 moon shot, the existing claim
-- trigger (track_community_total) and read RPC (get_community_progress)
-- operate over every community_milestones row, so the threshold and its
-- one-of-a-kind badge are all that's needed server-side. Client-side, this
-- milestone gets an Orion "Earthset" scene with record-breaking copy.

insert into public.achievements (id, name, description, icon, threshold, requirement_type) values
  ('farther_than_artemis', 'Farther Than Artemis II', 'Pressed America''s 252,757th push-up — one mile farther than Artemis II flew, past the farthest any human has ever traveled. One patriot in history pushed us into the unknown', '🌘', null, 'special')
on conflict (id) do nothing;

insert into public.community_milestones (threshold, achievement_id) values
  (252757, 'farther_than_artemis')
on conflict (threshold) do nothing;
