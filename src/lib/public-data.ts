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
  recruits?: number
  created_at?: string
}

// Joined before the challenge started on July 1, 2026 — the Declaration
// Signer badge. (Founding Father is the badge for completing all 1776.)
// The cutoff is midnight US Eastern, matching the app's Eastern anchor for
// challenge dates (see lib/dates.ts): a UTC-midnight cutoff would call a
// stateside signup on the evening of June 30 "July".
const JULY_1_MIDNIGHT_ET = Date.parse('2026-07-01T04:00:00Z')

export function isDeclarationSigner(createdAt: string | null | undefined) {
  if (!createdAt) return false
  const signedUpAt = Date.parse(createdAt)
  return Number.isFinite(signedUpAt) && signedUpAt < JULY_1_MIDNIGHT_ET
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

export interface PublicProfile {
  id: string
  display_name: string | null
  state_code: string | null
  created_at: string | null
}

// Fallback lookup for users with no reps yet: the leaderboard view filters
// total_pushups > 0, but their share links must still resolve (and carry
// referral credit), so read the public_profiles view directly.
export async function fetchPublicProfileByHandle(handle: string): Promise<PublicProfile | null> {
  try {
    const response = await restRequest(
      `public_profiles?display_name=ilike.${encodeURIComponent(escapeIlike(handle))}&limit=1`
    )
    if (!response?.ok) return null
    const rows = (await response.json()) as PublicProfile[]
    return rows[0] ?? null
  } catch {
    return null
  }
}

export interface EarnedBadge {
  achievement_id: string
  earned_at: string
  achievements: {
    name: string
    description: string
    icon: string
  } | null
}

// Badges this user has earned, oldest first so the row reads like a timeline.
// user_achievements and achievements are world-readable by RLS policy.
export async function fetchEarnedBadges(userId: string): Promise<EarnedBadge[]> {
  try {
    const response = await restRequest(
      `user_achievements?user_id=eq.${encodeURIComponent(userId)}` +
        `&select=achievement_id,earned_at,achievements(name,description,icon)` +
        `&order=earned_at.asc`
    )
    if (!response?.ok) return []
    return (await response.json()) as EarnedBadge[]
  } catch {
    return []
  }
}

export interface ContestInvitePreview {
  name: string
  participant_count: number
}

// Resolve an invite code to the contest name for the invite landing page and
// its link previews. Anonymous-safe: the code itself is the secret.
export async function fetchContestInvitePreview(code: string): Promise<ContestInvitePreview | null> {
  try {
    const response = await restRequest(
      `rpc/get_contest_invite_preview?p_invite_code=${encodeURIComponent(code)}`
    )
    if (!response?.ok) return null
    const rows = (await response.json()) as ContestInvitePreview[]
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

