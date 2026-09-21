'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { canUseChat } from '@/lib/flags'
import { isNativeApp } from '@/lib/native-auth'
import NotificationBell from '@/components/NotificationBell'

// The native shell hides the web navigation entirely (globals.css:
// html[data-app-environment='native'] .campaign-nav { display: none }), so the
// bottom tab bar is the only chrome a screen gets. That leaves two holes.
//
// First, the tab bar only covers four root screens. A patriot who opens the
// state board, a crew, the pledge board or the Hall of Honor lands somewhere
// with no visible way back. Edge-swipe still works in WKWebView, but an app
// that only answers to an invisible gesture reads as a website in a box.
//
// Second — and worse — NativeAppNavigation returns null when signed out. Since
// the association file maps every path to the app, a shared profile or invite
// link opens the app cold, signed out, with no tab bar, no web nav and no
// history to swipe back through. That is a genuine trap, and it is exactly the
// visitor the share links exist to bring in.
//
// This is the chrome that was missing: a title and a back affordance on every
// screen the tab bar does not already own, plus the notification bell that
// otherwise only lives in the hidden web nav.

// The tab bar owns these — but only for a signed-in patriot.
const ROOT_TABS = new Set(['/dashboard', '/leaderboard', '/contests', '/profile'])

// Auth screens carry their own branded native chrome (native-auth-mark) and
// are deliberate termini, so they keep it instead of this header.
const SELF_CHROMED = ['/login', '/signup', '/auth']

// Titles for the screens reachable inside the app. Longest match wins, so
// '/states/VA' inherits the state board title without an entry of its own.
const TITLES: Array<[string, string]> = [
  ['/dashboard', 'Today'],
  ['/leaderboard', 'Standings'],
  ['/contests', 'Crews'],
  ['/contests/', 'Crew'],
  ['/profile', 'Your account'],
  ['/states', 'State battle'],
  ['/chat', 'Nationwide chat'],
  ['/pledge', 'Your pledge'],
  ['/pledge/leaderboard', 'Pledge board'],
  ['/finale', 'Hall of Honor'],
  ['/merch', 'Merch'],
  ['/spread-the-word', 'Spread the word'],
  ['/join', 'Crew invite'],
  ['/p/', 'Patriot'],
  ['/support', 'Help and support'],
  ['/privacy', 'Privacy'],
  ['/terms', 'Terms'],
  ['/2026', 'The 2026 record'],
]

function titleFor(pathname: string): string {
  let best = ''
  let title = 'Liberty Lift'
  for (const [prefix, value] of TITLES) {
    if (pathname.startsWith(prefix) && prefix.length > best.length) {
      best = prefix
      title = value
    }
  }
  return title
}

export default function NativeScreenHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [native, setNative] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  // Auth resolves a tick after mount. Until it does, assume the tab bar is
  // coming so a signed-in patriot never sees the header flash onto a root tab.
  const [authResolved, setAuthResolved] = useState(false)

  useEffect(() => {
    setNative(isNativeApp())
  }, [])

  useEffect(() => {
    if (!native) return
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setAuthResolved(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthResolved(true)
    })
    return () => subscription.unsubscribe()
  }, [native])

  // A root tab is only self-navigating while the tab bar is actually there.
  const tabBarCovers = ROOT_TABS.has(pathname) && (user !== null || !authResolved)

  const hidden = !native
    || tabBarCovers
    || pathname === '/'
    || SELF_CHROMED.some(prefix => pathname.startsWith(prefix))

  // Pages pad their top for a nav bar native mode removes. Tell the stylesheet
  // when this header is standing so that padding is load-bearing again.
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('native-header-visible', !hidden)
    return () => root.classList.remove('native-header-visible')
  }, [hidden])

  if (hidden) return null

  const goBack = () => {
    // A cold launch straight into a shared link has no history to pop, and
    // history.back() would walk the patriot out of the app. Fall back to the
    // screen the chevron implies: their campaign, or the campaign front door.
    if (window.history.length > 1) router.back()
    else router.push(user ? '/dashboard' : '/')
  }

  return (
    <header className="native-screen-header">
      <button type="button" onClick={goBack} aria-label="Go back">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1>{titleFor(pathname)}</h1>
      <div className="native-screen-header-actions">
        {user && canUseChat(user.email) && <NotificationBell userId={user.id} />}
      </div>
    </header>
  )
}
