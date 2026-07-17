// Feature gates for staged rollouts.

// Chat is now live for everyone. Kept as a gate (rather than deleting the
// call sites) so it can be re-limited quickly if needed: return an allowlist
// check here and update public.can_use_chat() in the database to match.
export function canUseChat(_email?: string | null) {
  return true
}

// Accounts allowed to summon @everyone in chat — a broadcast that notifies
// every other participant. Keep this in sync with
// public.can_broadcast_everyone() in the database migration; both gates must
// agree for the power to work end to end.
const EVERYONE_BROADCASTER_EMAILS = ['kevinabbas@gmail.com']

export function canBroadcastEveryone(email?: string | null) {
  return !!email && EVERYONE_BROADCASTER_EMAILS.includes(email.trim().toLowerCase())
}
