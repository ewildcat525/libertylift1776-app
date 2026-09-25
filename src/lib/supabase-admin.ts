// Server-only Supabase client using the service role key. Bypasses RLS —
// never import this from client components.
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null

  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
