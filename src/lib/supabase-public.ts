// Server-side, signed-out Supabase client for public data in server
// components. It reads exactly what an anonymous visitor could, and Next's
// fetch cache holds each response for `revalidate` seconds, so a busy public
// page costs the database one read per window instead of one per visitor.
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export function createPublicClient(revalidate = 60) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  return createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, next: { revalidate } }),
    },
  })
}
