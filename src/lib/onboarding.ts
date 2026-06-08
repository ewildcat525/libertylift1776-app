export const PENDING_SIGNUP_KEY = 'libertylift.pendingSignup'

export interface PendingSignup {
  displayName: string
  stateCode: string
}

const HANDLE_PREFIXES = [
  'LibertyLifter',
  'RepRally',
  'July1776',
  'StateStrong',
  'FoundingRep',
]

export function generateDisplayName(stateCode?: string) {
  const prefix = stateCode ? `${stateCode}Lifter` : HANDLE_PREFIXES[Math.floor(Math.random() * HANDLE_PREFIXES.length)]
  const suffix = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}${suffix}`
}

export function savePendingSignup(pendingSignup: PendingSignup) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(pendingSignup))
}

export function readPendingSignup() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(PENDING_SIGNUP_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<PendingSignup>
    if (!parsed.displayName || !parsed.stateCode) return null

    return {
      displayName: parsed.displayName,
      stateCode: parsed.stateCode,
    }
  } catch {
    return null
  }
}

export function clearPendingSignup() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(PENDING_SIGNUP_KEY)
}
