// Feature gates for staged rollouts.

// Community chat contains participant-created content, so release builds keep
// it hidden unless an operator opts in. The database has an independent gate
// in public.can_use_chat(); both gates must be enabled before chat is usable.
const COMMUNITY_CHAT_ENABLED = process.env.NEXT_PUBLIC_ENABLE_COMMUNITY_CHAT === 'true'
const PUBLIC_CONTESTS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_PUBLIC_CONTESTS === 'true'

export function canUseChat(_email?: string | null) {
  return COMMUNITY_CHAT_ENABLED
}

export function canUsePublicContests() {
  return PUBLIC_CONTESTS_ENABLED
}

// Accounts allowed to summon @everyone in chat — a broadcast that notifies
// every other participant. Keep this in sync with
// public.can_broadcast_everyone() in the database migration; both gates must
// agree for the power to work end to end.
const EVERYONE_BROADCASTER_EMAILS = ['kevinabbas@gmail.com']

export function canBroadcastEveryone(email?: string | null) {
  return !!email && EVERYONE_BROADCASTER_EMAILS.includes(email.trim().toLowerCase())
}
