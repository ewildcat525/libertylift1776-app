-- Email subscribers table for pre-launch email capture
CREATE TABLE IF NOT EXISTS email_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'landing_page'
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON email_subscribers(email);

-- Enable RLS
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for non-authenticated users on landing page)
CREATE POLICY "Allow anonymous email signups" ON email_subscribers
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only allow reading own email (or authenticated users can't read at all)
CREATE POLICY "Users cannot read emails" ON email_subscribers
  FOR SELECT
  TO anon
  USING (false);
