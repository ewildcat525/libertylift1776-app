-- Pledges table for charity donations
CREATE TABLE IF NOT EXISTS pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  charity TEXT NOT NULL CHECK (charity IN ('wounded_warrior', 'save_the_children')),
  pledge_type TEXT NOT NULL CHECK (pledge_type IN ('per_completed', 'per_short')),
  rate_cents INTEGER NOT NULL CHECK (rate_cents > 0 AND rate_cents <= 10000), -- Max $100 per unit
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- One active pledge per user
);

-- Enable RLS
ALTER TABLE pledges ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own pledge"
  ON pledges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pledge"
  ON pledges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pledge"
  ON pledges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pledge"
  ON pledges FOR DELETE
  USING (auth.uid() = user_id);

-- Public read for leaderboard (only active pledges, no sensitive data)
CREATE POLICY "Anyone can view active pledges for leaderboard"
  ON pledges FOR SELECT
  USING (is_active = true);

-- Index for leaderboard queries
CREATE INDEX idx_pledges_active ON pledges(is_active) WHERE is_active = true;
CREATE INDEX idx_pledges_charity ON pledges(charity);

-- Function to calculate pledge amount
CREATE OR REPLACE FUNCTION calculate_pledge_amount(
  p_user_id UUID,
  p_total_pushups INTEGER DEFAULT NULL
) RETURNS NUMERIC AS $$
DECLARE
  v_pledge RECORD;
  v_pushups INTEGER;
  v_amount NUMERIC;
BEGIN
  -- Get user's pledge
  SELECT * INTO v_pledge FROM pledges WHERE user_id = p_user_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Get total pushups if not provided
  IF p_total_pushups IS NULL THEN
    SELECT COALESCE(total_pushups, 0) INTO v_pushups 
    FROM user_stats WHERE user_id = p_user_id;
  ELSE
    v_pushups := p_total_pushups;
  END IF;

  -- Calculate based on pledge type
  IF v_pledge.pledge_type = 'per_completed' THEN
    v_amount := v_pushups * v_pledge.rate_cents / 100.0;
  ELSE -- per_short
    v_amount := GREATEST(0, 1776 - v_pushups) * v_pledge.rate_cents / 100.0;
  END IF;

  RETURN ROUND(v_amount, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
