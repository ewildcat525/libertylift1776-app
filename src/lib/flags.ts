// Feature gates for staged rollouts.

// Chat is now live for everyone. Kept as a gate (rather than deleting the
// call sites) so it can be re-limited quickly if needed: return an allowlist
// check here and update public.can_use_chat() in the database to match.
export function canUseChat(_email?: string | null) {
  return true
}
