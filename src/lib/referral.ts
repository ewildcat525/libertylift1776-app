const REFERRAL_KEY = 'libertylift.referredBy'

const HANDLE_PATTERN = /^[A-Za-z0-9 _-]{3,40}$/

// Reads ?ref=<handle> from the current URL and persists it so it survives
// the magic-link / OAuth round trip. First referrer wins.
export function captureReferralFromUrl() {
  if (typeof window === 'undefined') return

  const ref = new URLSearchParams(window.location.search).get('ref')?.trim()
  if (!ref || !HANDLE_PATTERN.test(ref)) return

  if (!window.localStorage.getItem(REFERRAL_KEY)) {
    window.localStorage.setItem(REFERRAL_KEY, ref)
  }
}

export function readReferral(): string | null {
  if (typeof window === 'undefined') return null
  const ref = window.localStorage.getItem(REFERRAL_KEY)
  return ref && HANDLE_PATTERN.test(ref) ? ref : null
}

export function clearReferral() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(REFERRAL_KEY)
}
