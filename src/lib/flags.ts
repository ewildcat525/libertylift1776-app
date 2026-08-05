// Feature gates for staged rollouts.

const PUBLIC_CONTESTS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_PUBLIC_CONTESTS === 'true'

// Chat is available to authenticated participants. Database RLS independently
// enforces the same signed-in requirement for messages, reactions, and alerts.
export function canUseChat(email?: string | null) {
  return Boolean(email)
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
