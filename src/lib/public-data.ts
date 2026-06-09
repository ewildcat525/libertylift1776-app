// Read-only fetchers for publicly visible data (leaderboard + state views).
// Plain fetch against the Supabase REST API so they work in both the Node and
// edge runtimes (server components and opengraph-image routes).

export interface PublicProfileStats {
  id: string
  display_name: string | null
  state_code: string | null
  total_pushups: number
  current_streak: number
  best_day: number
  days_logged: number
  global_rank: number
}

export interface PublicStateStats {
  state_code: string
  participants: number
  total_pushups: number
  avg_pushups: number
  state_rank: number
}

function restRequest(path: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null

  return fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    next: { revalidate: 60 },
  })
}

// Escape ilike wildcards so handles containing _ or - match literally.
function escapeIlike(value: string) {
  return value.replace(/([%_\\])/g, '\\$1')
}

export async function fetchProfileStatsByHandle(handle: string): Promise<PublicProfileStats | null> {
  try {
    const response = await restRequest(
      `leaderboard?display_name=ilike.${encodeURIComponent(escapeIlike(handle))}&limit=1`
    )
    if (!response?.ok) return null
    const rows = (await response.json()) as PublicProfileStats[]
    return rows[0] ?? null
  } catch {
    return null
  }
}

export async function fetchStateStats(stateCode: string): Promise<PublicStateStats | null> {
  try {
    const response = await restRequest(
      `state_leaderboard?state_code=eq.${encodeURIComponent(stateCode)}&limit=1`
    )
    if (!response?.ok) return null
    const rows = (await response.json()) as PublicStateStats[]
    return rows[0] ?? null
  } catch {
    return null
  }
}

export async function fetchParticipantCount(): Promise<number | null> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return null

    const response = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'count=exact',
        Range: '0-0',
      },
      next: { revalidate: 300 },
    })
    if (!response.ok) return null
    const contentRange = response.headers.get('content-range')
    const total = contentRange?.split('/')[1]
    return total && total !== '*' ? parseInt(total, 10) : null
  } catch {
    return null
  }
}
