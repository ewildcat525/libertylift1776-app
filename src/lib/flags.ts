// Feature gates for staged rollouts.

// Trash Talk chat is in live testing. Only these accounts see the chat page,
// nav link, leaderboard CTA, and notification bell. The database enforces the
// same list via public.can_use_chat() in the global_chat migration — update
// both together, and clear this list (plus flip can_use_chat to true) to
// launch for everyone.
export const CHAT_TESTER_EMAILS = ['kevinabbas@gmail.com']

export function canUseChat(email?: string | null) {
  return Boolean(email && CHAT_TESTER_EMAILS.includes(email.toLowerCase()))
}
